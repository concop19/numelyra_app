import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AstrologyInsightSheet } from '../features/astrology/AstrologyInsightSheet';
import { getAstrologyProfileKey } from '../features/astrology/dailyAstroFortune';
import { useDailyAstroFortune } from '../features/astrology/useDailyAstroFortune';
import { ConstellationCanvas } from '../features/constellation/ConstellationCanvas';
import {
  createAmbientStars,
  fitConstellationGeometry,
} from '../features/constellation/constellationGeometry';
import {
  getAstrologySymbol,
  getDailyAstrologySymbolId,
} from '../features/constellation/constellationPresets';
import { buildConstellationGeometry } from '../features/constellation/constellationSkia';
import { type UserProfile } from '../store/userProfile';

const ASTROLOGY_STAR_SEED = 0x4e554d45;
const ASTROLOGY_VIDEO_SOURCE = require('../../assets/giao_dien/giaodien1/constellation/Aurora_flowing_over_calm_lake_20261005153804-clean.mp4');

interface Props {
  profile?: UserProfile | null;
  onBack?: () => void;
}

export default function AstrologyScreen({ profile, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { currentDate, fortune, metadata, loading, error, retry, share } =
    useDailyAstroFortune(profile);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [videoReady, setVideoReady] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [bottomContentTop, setBottomContentTop] = useState(0);
  const lastVerseTapRef = useRef(0);
  const compact = canvasSize.height > 0 && canvasSize.height < 720;

  const videoPlayer = useVideoPlayer(ASTROLOGY_VIDEO_SOURCE, (player) => {
    player.loop = true;
    player.muted = true;
    player.audioMixingMode = 'mixWithOthers';
    player.staysActiveInBackground = false;
  });
  const { status: videoStatus } = useEvent(videoPlayer, 'statusChange', {
    status: videoPlayer.status,
  });

  const profileKey = useMemo(() => getAstrologyProfileKey(profile), [
    profile?.birthDate,
    profile?.fullName,
  ]);
  const symbolId = useMemo(
    () => getDailyAstrologySymbolId(currentDate, profileKey),
    [currentDate, profileKey]
  );
  const symbol = useMemo(() => getAstrologySymbol(symbolId), [symbolId]);

  const geometryResult = useMemo(() => {
    try {
      return {
        geometry: buildConstellationGeometry(symbol.svgXml, symbol.sampling),
        error: null,
      };
    } catch (caught) {
      return {
        geometry: null,
        error: caught instanceof Error ? caught.message : 'Không thể dựng biểu tượng hôm nay.',
      };
    }
  }, [symbol]);

  const fittedGeometry = useMemo(() => {
    const { width, height } = canvasSize;
    if (!geometryResult.geometry || width <= 0 || height <= 0) return null;
    return fitConstellationGeometry(geometryResult.geometry, {
      x: width * 0.16,
      y: height * (compact ? 0.23 : 0.24),
      width: width * 0.68,
      height: height * (compact ? 0.27 : 0.32),
    });
  }, [canvasSize, compact, geometryResult.geometry]);

  const ambientStars = useMemo(
    () => createAmbientStars(ASTROLOGY_STAR_SEED, 64),
    []
  );

  const interactionBounds = useMemo(() => {
    const { width, height } = canvasSize;
    const fallbackTop = height * 0.18;
    const fallbackBottom = height * (compact ? 0.66 : 0.64);
    const top = Math.min(fallbackTop, Math.max(0, height - 48));
    const measuredBottom = bottomContentTop > top ? bottomContentTop - 8 : fallbackBottom;
    const bottom = Math.max(top + 48, Math.min(height, measuredBottom));

    return {
      x: 0,
      y: top,
      width,
      height: bottom - top,
    };
  }, [bottomContentTop, canvasSize, compact]);

  const constellationResetKey = useMemo(
    () => [
      symbolId,
      profileKey,
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      isFocused ? 'focused' : 'blurred',
    ].join(':'),
    [currentDate, isFocused, profileKey, symbolId]
  );

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        if (mounted) setReduceMotion(false);
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isFocused && appState === 'active' && reduceMotion === false) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [appState, isFocused, reduceMotion, videoPlayer]);

  useEffect(() => {
    if (reduceMotion !== false || videoStatus === 'error') {
      setVideoReady(false);
    }
  }, [reduceMotion, videoStatus]);

  useEffect(() => {
    if (!fortune) setSheetVisible(false);
  }, [fortune]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    const height = Math.round(event.nativeEvent.layout.height);
    setCanvasSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  };

  const handleBottomContentLayout = (event: LayoutChangeEvent) => {
    const top = Math.round(event.nativeEvent.layout.y);
    setBottomContentTop((current) => current === top ? current : top);
  };

  const openInsight = () => {
    if (!fortune) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSheetVisible(true);
  };

  const handleVersePress = () => {
    const now = Date.now();
    if (now - lastVerseTapRef.current <= 360) {
      lastVerseTapRef.current = 0;
      openInsight();
      return;
    }
    lastVerseTapRef.current = now;
  };

  const showVideo = reduceMotion === false && videoStatus !== 'error';
  const showFallback = !showVideo || !videoReady;
  const motionEnabled = isFocused && appState === 'active' && reduceMotion === false;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={handleLayout}>
      <StatusBar style="light" />
      {showVideo && (
        <VideoView
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          playsInline
          pointerEvents="none"
          fullscreenOptions={{ enable: false }}
          onFirstFrameRender={() => setVideoReady(true)}
        />
      )}
      {showFallback && (
        <Image
          source={symbol.backgroundSource}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      <View style={styles.nightVeil} pointerEvents="none" />

      {fittedGeometry && (
        <ConstellationCanvas
          width={canvasSize.width}
          height={canvasSize.height}
          geometry={fittedGeometry}
          ambientStars={ambientStars}
          interactionBounds={interactionBounds}
          resetKey={constellationResetKey}
          motionEnabled={motionEnabled}
        />
      )}

      <LinearGradient
        colors={['rgba(2,8,29,0)', 'rgba(2,8,29,0.08)', 'rgba(2,8,29,0.48)']}
        locations={[0, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        activeOpacity={0.76}
        onPress={onBack}
        style={[styles.topBackButton, { top: insets.top + 8 }]}
      >
        <Ionicons name="arrow-back" size={24} color="#FFD67C" />
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Chia sẻ quẻ"
        activeOpacity={0.76}
        disabled={!fortune || loading}
        onPress={() => void share()}
        style={[
          styles.topShareButton,
          { top: insets.top + 8 },
          (!fortune || loading) && styles.topShareButtonDisabled,
        ]}
      >
        <Ionicons name="share-social-outline" size={22} color="#E7FBFF" />
      </TouchableOpacity>

      {!!geometryResult.error && (
        <View style={[styles.geometryError, { top: insets.top + 68 }]}>
          <Ionicons name="warning-outline" size={18} color="#7CEBFF" />
          <Text style={styles.geometryErrorText}>Biểu tượng hôm nay đang tạm ẩn.</Text>
        </View>
      )}

      <View
        style={[
          styles.bottomContent,
          compact && styles.bottomContentCompact,
          { paddingBottom: Math.max(14, insets.bottom + 8) },
        ]}
        onLayout={handleBottomContentLayout}
      >
        {loading && (
          <View style={styles.statusBlock}>
            <ActivityIndicator color="#71E7FF" size="small" />
            <Text style={styles.statusText}>Đang đọc bầu trời của bạn...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={() => void retry()}
              style={styles.retryButton}
            >
              <Ionicons name="reload-outline" size={16} color="#E7FBFF" />
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && fortune && (
          <>
            <Text style={[styles.fortuneTitle, compact && styles.fortuneTitleCompact]}>
              {fortune.title || 'Quẻ hôm nay'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Câu đối chiêm tinh"
              accessibilityHint="Nhấn đúp để mở giải mã"
              activeOpacity={0.9}
              onPress={handleVersePress}
              onAccessibilityTap={openInsight}
              style={styles.verseTapTarget}
            >
              <Text
                style={[styles.verse, compact && styles.verseCompact]}
                numberOfLines={compact ? 3 : 4}
                adjustsFontSizeToFit
                minimumFontScale={0.84}
              >
                {fortune.verse}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <AstrologyInsightSheet
        visible={sheetVisible}
        fortune={fortune}
        metadata={metadata}
        onClose={() => setSheetVisible(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#02091D',
    overflow: 'hidden',
  },
  nightVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 13, 50, 0.1)',
  },
  topBackButton: {
    position: 'absolute',
    left: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  topShareButton: {
    position: 'absolute',
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,235,255,0.48)',
    backgroundColor: 'rgba(3,24,70,0.62)',
    shadowColor: '#21BFFF',
    shadowOpacity: 0.34,
    shadowRadius: 9,
    elevation: 5,
    zIndex: 30,
  },
  topShareButtonDisabled: {
    opacity: 0.38,
  },
  geometryError: {
    position: 'absolute',
    left: 28,
    right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 22,
  },
  geometryErrorText: {
    color: '#DDF8FF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomContent: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  bottomContentCompact: {
    left: 18,
    right: 18,
  },
  statusBlock: {
    minHeight: 108,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    color: '#E2F7FF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorCard: {
    width: '100%',
    minHeight: 104,
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(3,19,57,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(124,235,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    color: '#F4F9FF',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#5BBEFF',
    backgroundColor: 'rgba(15,96,151,0.35)',
  },
  retryText: {
    color: '#F5FCFF',
    fontWeight: '700',
    fontSize: 13,
  },
  fortuneTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 8,
  },
  fortuneTitleCompact: {
    fontSize: 17,
    lineHeight: 22,
    marginTop: 6,
  },
  verse: {
    color: '#FFFFFF',
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 7,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 8,
  },
  verseTapTarget: {
    width: '100%',
    alignItems: 'center',
  },
  verseCompact: {
    fontSize: 17,
    lineHeight: 23,
    marginTop: 4,
  },
});
