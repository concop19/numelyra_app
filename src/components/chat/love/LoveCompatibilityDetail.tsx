import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image as NativeImage,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HighlightedAnswerText from '../HighlightedAnswerText';
import LoveSpiritSprite from './LoveSpiritSprite';
import type { LoveReadingViewModel } from './loveReadingModel';

const BACKGROUND = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/background/Moonlit Sakura Terrace Overlooking Tokyo.png');
const FLOOR = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/item/floor_1.png');
const PAPER = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/item/papper_1.png');
const BOOK = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/item/book_1.png');
const CHEST = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/item/box_1.png');
const LANTERN = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/item/light_1.png');
const QUILL = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/item/pen_1.png');
const PETAL_GLOW = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/ChatGPT Image Oct 13, 2026, 10_05_41 PM-3.png');
const STAR_GLOW = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/ChatGPT Image Oct 13, 2026, 10_05_42 PM-4.png');
const CARD_BACK = require('../../../../assets/giao_dien/giaodien1/chat_detail/item/bai_midle.png');

const REFERENCE_WIDTH = 941;
const REFERENCE_HEIGHT = 1672;

type Props = {
  model: LoveReadingViewModel;
  onClose: () => void;
};

type StageSize = { width: number; height: number };

const position = (
  horizontalScale: number,
  verticalScale: number,
  artworkScale: number,
  left: number,
  top: number,
  width: number,
  height: number,
) => ({
  position: 'absolute' as const,
  left: left * horizontalScale,
  top: top * verticalScale,
  width: width * artworkScale,
  height: height * artworkScale,
});

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(-2)
  .map((part) => part[0]?.toUpperCase())
  .join('');

export default function LoveCompatibilityDetail({ model, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [revealed, setRevealed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const cardScaleX = useRef(new Animated.Value(1)).current;
  const readingOpacity = useRef(new Animated.Value(0)).current;
  const glowMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      glowMotion.stopAnimation();
      glowMotion.setValue(0.55);
      return undefined;
    }

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glowMotion, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(glowMotion, {
        toValue: 0,
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [glowMotion, reduceMotion]);

  const revealReading = () => {
    if (revealed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

    if (reduceMotion) {
      setRevealed(true);
      readingOpacity.setValue(1);
      return;
    }

    Animated.timing(cardScaleX, {
      toValue: 0.04,
      duration: 150,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setRevealed(true);
      Animated.parallel([
        Animated.spring(cardScaleX, {
          toValue: 1,
          speed: 18,
          bounciness: 7,
          useNativeDriver: true,
        }),
        Animated.timing(readingOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const width = stageSize.width || REFERENCE_WIDTH;
  const height = stageSize.height || REFERENCE_HEIGHT;
  const horizontalScale = width / REFERENCE_WIDTH;
  const verticalScale = height / REFERENCE_HEIGHT;
  const artworkScale = Math.min(horizontalScale, verticalScale);
  const place = (left: number, top: number, itemWidth: number, itemHeight: number) => (
    position(horizontalScale, verticalScale, artworkScale, left, top, itemWidth, itemHeight)
  );
  const scoreText = model.compatibilityScore === undefined
    ? 'DUYÊN'
    : `${model.compatibilityScore}%`;
  const readingText = useMemo(() => {
    if (model.answer) return model.answer;
    return [model.summary, model.advice].filter(Boolean).join('\n\n');
  }, [model.advice, model.answer, model.summary]);

  return (
    <View
      style={styles.scene}
      onLayout={({ nativeEvent: { layout } }) => {
        setStageSize((current) => current.width === layout.width && current.height === layout.height
          ? current
          : { width: layout.width, height: layout.height });
      }}
    >
      <Image source={BACKGROUND} style={StyleSheet.absoluteFill} contentFit="cover" priority="high" />
      <View style={styles.vignette} pointerEvents="none" />

      <View
        style={[
          styles.canvas,
          StyleSheet.absoluteFill,
        ]}
      >
        <Image source={CHEST} contentFit="contain" style={place(-14, 116, 294, 334)} />
        <Image source={BOOK} contentFit="contain" style={place(-62, 355, 226, 242)} />
        <Image source={LANTERN} contentFit="contain" style={place(674, 112, 294, 330)} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ambientLayer,
            place(0, 218, 941, 630),
            {
              opacity: glowMotion.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.58] }),
              transform: [{ translateY: glowMotion.interpolate({ inputRange: [0, 1], outputRange: [4 * artworkScale, -7 * artworkScale] }) }],
            },
          ]}
        >
          <Image source={PETAL_GLOW} contentFit="fill" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ambientLayer,
            place(80, 286, 781, 560),
            { opacity: glowMotion.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.34] }) },
          ]}
        >
          <Image source={STAR_GLOW} contentFit="fill" style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View pointerEvents="none" style={[styles.heading, place(190, 82, 561, 94)]}>
          <Text style={[styles.title, { fontSize: Math.max(23, 38 * artworkScale), lineHeight: Math.max(29, 45 * artworkScale) }]}>Nghi thức tình yêu</Text>
          <Text style={[styles.subtitle, { fontSize: Math.max(12, 17 * artworkScale) }]}>Chạm vào bộ bài để mở thông điệp</Text>
        </View>

        <Image source={FLOOR} contentFit="contain" style={place(31, 365, 879, 849)} />

        <View style={place(153, 493, 122, 122)}>
          <LoveSpiritSprite size={122 * artworkScale} phase={0} reduceMotion={reduceMotion} />
        </View>
        <View style={place(666, 493, 122, 122)}>
          <LoveSpiritSprite size={122 * artworkScale} phase={3} mirrored reduceMotion={reduceMotion} />
        </View>
        <View style={place(169, 900, 112, 112)}>
          <LoveSpiritSprite size={112 * artworkScale} phase={2} mirrored reduceMotion={reduceMotion} />
        </View>
        <View style={place(660, 900, 112, 112)}>
          <LoveSpiritSprite size={112 * artworkScale} phase={5} reduceMotion={reduceMotion} />
        </View>

        <Pressable
          onPress={revealReading}
          accessibilityRole="button"
          accessibilityLabel={revealed
            ? `Thông điệp duyên mệnh của ${model.profileA.fullName} và ${model.profileB.fullName}, tương hợp ${scoreText}`
            : 'Mở thông điệp duyên mệnh'}
          style={place(356, 592, 229, 354)}
        >
          <Animated.View style={[styles.ritualCardShadow, { transform: [{ scaleX: cardScaleX }] }]}>
            {revealed ? (
              <LinearGradient
                colors={['#2C103F', '#8E285D', '#24103E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardFront}
              >
                <View style={styles.cardInnerBorder}>
                  <Text style={styles.cardKicker}>DUYÊN MỆNH</Text>
                  <Text style={styles.cardMoon}>☾ ♡ ☽</Text>
                  <View style={styles.initialsRow}>
                    <View style={styles.initialBadge}><Text style={styles.initialText}>{getInitials(model.profileA.fullName)}</Text></View>
                    <Text style={styles.cardHeart}>♥</Text>
                    <View style={styles.initialBadge}><Text style={styles.initialText}>{getInitials(model.profileB.fullName)}</Text></View>
                  </View>
                  <Text style={styles.cardScore}>{scoreText}</Text>
                  <Text numberOfLines={2} style={styles.cardNames}>{model.profileA.fullName} · {model.profileB.fullName}</Text>
                  <View style={styles.cardLabel}>
                    <Text style={styles.cardLabelText}>Thông điệp Duyên Mệnh</Text>
                  </View>
                </View>
              </LinearGradient>
            ) : (
              <NativeImage source={CARD_BACK} resizeMode="stretch" fadeDuration={0} style={styles.cardBack} />
            )}
          </Animated.View>
        </Pressable>

        <Image source={PAPER} contentFit="contain" style={place(14, 1105, 912, 654)} />
        <Image source={QUILL} contentFit="contain" style={place(24, 1128, 196, 173)} />

        {revealed ? (
          <Animated.View style={[styles.paperReading, place(196, 1235, 549, 350), { opacity: readingOpacity }]}>
            <ScrollView
              style={styles.paperScroll}
              contentContainerStyle={styles.paperContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.paperKicker}>THÔNG ĐIỆP DÀNH CHO HAI BẠN</Text>
              <Text style={styles.paperNames}>{model.profileA.fullName}  ♡  {model.profileB.fullName}</Text>
              {model.question ? <Text style={styles.paperQuestion}>“{model.question}”</Text> : null}
              <View style={styles.paperRule} />
              <HighlightedAnswerText
                text={readingText || 'Hai bạn hãy chậm lại và lắng nghe điều trái tim đang muốn nói.'}
                style={styles.paperAnswer}
                emphasisStyle={styles.paperEmphasis}
              />
              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  onClose();
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Đã hiểu, quay lại cuộc trò chuyện"
                style={styles.doneButton}
              >
                <Text style={styles.doneText}>Đã hiểu · quay lại</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        ) : (
          <View pointerEvents="none" style={[styles.paperPrompt, place(205, 1255, 531, 270)]}>
            <Text style={styles.paperPromptMoon}>☾</Text>
            <Text style={styles.paperPromptTitle}>Thông điệp đang được niêm phong</Text>
            <Text style={styles.paperPromptText}>Chạm vào lá bài giữa vòng nghi thức để mở lời luận giải dành riêng cho hai bạn.</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={() => {
          void Haptics.selectionAsync();
          onClose();
        }}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel="Quay lại trò chuyện"
        style={[styles.backButton, { top: insets.top + 10 }]}
      >
        <Ionicons name="arrow-back" color="#FFF5DF" size={23} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: 'hidden', backgroundColor: '#1B0A38' },
  canvas: { position: 'absolute', overflow: 'visible' },
  vignette: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(28, 4, 45, 0.08)',
  },
  ambientLayer: { zIndex: 1 },
  heading: { alignItems: 'center', justifyContent: 'center', zIndex: 4 },
  title: {
    color: '#FFF2F4',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#C62A75',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#FFE7E1',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(55, 8, 70, 0.95)',
    textShadowRadius: 6,
  },
  ritualCardShadow: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    shadowColor: '#FF8AC4',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 18,
    overflow: 'hidden',
  },
  cardBack: { width: '100%', height: '100%' },
  cardFront: {
    flex: 1,
    borderRadius: 18,
    padding: 8,
    borderWidth: 2,
    borderColor: '#F8C164',
  },
  cardInnerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 157, 0.78)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 11,
    overflow: 'hidden',
  },
  cardKicker: { color: '#FFD99A', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  cardMoon: { color: '#FFE1B2', fontSize: 28, textShadowColor: '#FF7DB9', textShadowRadius: 9 },
  initialsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  initialBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 221, 174, 0.15)',
    borderWidth: 1,
    borderColor: '#F6C478',
  },
  initialText: { color: '#FFF2DB', fontSize: 11, fontWeight: '900' },
  cardHeart: { color: '#FF9ACB', fontSize: 19, textShadowColor: '#FFE7B1', textShadowRadius: 8 },
  cardScore: { color: '#FFF0C7', fontSize: 29, fontWeight: '900', textShadowColor: '#FF5FA8', textShadowRadius: 9 },
  cardNames: { color: '#FFF5E7', fontSize: 9.5, lineHeight: 13, fontWeight: '800', textAlign: 'center' },
  cardLabel: {
    alignSelf: 'stretch',
    marginHorizontal: -8,
    backgroundColor: '#63183F',
    borderTopWidth: 1,
    borderTopColor: '#F5BF6C',
    paddingVertical: 7,
  },
  cardLabelText: { color: '#FFF0C7', fontSize: 9.5, fontWeight: '900', textAlign: 'center' },
  paperReading: { zIndex: 6 },
  paperScroll: { flex: 1 },
  paperContent: { paddingHorizontal: 6, paddingTop: 3, paddingBottom: 24 },
  paperKicker: { color: '#A04455', fontSize: 9, fontWeight: '900', letterSpacing: 1.15, textAlign: 'center' },
  paperNames: {
    color: '#6C253A',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  paperQuestion: { color: '#7B4950', fontSize: 11.5, lineHeight: 16, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  paperRule: { height: 1, backgroundColor: 'rgba(143, 56, 70, 0.28)', marginVertical: 8 },
  paperAnswer: { color: '#5A3440', fontSize: 12.5, lineHeight: 18.5, fontWeight: '500', textAlign: 'center' },
  paperEmphasis: { color: '#872D4D', fontWeight: '900' },
  doneButton: {
    alignSelf: 'center',
    minWidth: 184,
    borderRadius: 22,
    backgroundColor: '#8B294F',
    borderWidth: 1,
    borderColor: '#D99074',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 16,
    shadowColor: '#7B183D',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  doneText: { color: '#FFF3DE', fontSize: 12.5, fontWeight: '900', textAlign: 'center' },
  paperPrompt: { zIndex: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  paperPromptMoon: { color: '#B15C54', fontSize: 28 },
  paperPromptTitle: { color: '#742F44', fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  paperPromptText: { color: '#80535A', fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center', marginTop: 5 },
  backButton: {
    position: 'absolute',
    left: 14,
    zIndex: 30,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 9, 59, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 151, 0.78)',
  },
});
