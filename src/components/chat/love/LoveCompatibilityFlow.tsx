import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import HighlightedAnswerText from '../HighlightedAnswerText';
import ThreeDButton from '../../ThreeDButton';
import type { MessageItem } from '../../../screens/ChatScreen';
import { TAROT_AMBIENT_AUDIO } from '../../../services/tarotAssets';
import { getLoveReadingViewModel } from './loveReadingModel';

const LOADING_BACKGROUND = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/background/loading.png');
const SUCCESS_BACKGROUND = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/background/success.png');
const LOADING_ANIMATION = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/animation/loading.webp');
const SUCCESS_ANIMATION = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/animation/success.webp');
const FAIL_ANIMATION = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/animation/fail.webp');
const ANIMATION_HORIZONTAL_OFFSET = 12;
const LOADING_STEPS = [
  'Đang đọc thông tin bạn nam',
  'Đang đọc thông tin bạn nữ',
  'Đang đối chiếu Tử Vi và Bát Tự',
  'Đang tính chỉ số Lục Hợp',
];
const LOADING_STEP_DURATION = 2600;
const SCORE_SPIN_DURATION = 650;
const BURST_DURATION = 250;
const RESULT_REVEAL_DURATION = 100;

const BURST_PARTICLES = [
  { x: 0, y: -116, color: '#FFF4B8', size: 19 },
  { x: 78, y: -82, color: '#FFD0EA', size: 15 },
  { x: 116, y: 0, color: '#FFF0A6', size: 17 },
  { x: 80, y: 82, color: '#F7B7E1', size: 14 },
  { x: 0, y: 116, color: '#FFF8D6', size: 18 },
  { x: -80, y: 82, color: '#FFC4E7', size: 15 },
  { x: -116, y: 0, color: '#FFE89D', size: 17 },
  { x: -78, y: -82, color: '#F8C8F1', size: 14 },
] as const;

type FlowPhase = 'loading' | 'revealing' | 'result';

type Props = {
  visible: boolean;
  message?: MessageItem;
  question: string;
  onClose: () => void;
  onOpenDetail: (message: MessageItem, question: string) => void;
};

export default function LoveCompatibilityFlow({
  visible,
  message,
  question,
  onClose,
  onOpenDetail,
}: Props) {
  const ambientPlayer = useAudioPlayer(TAROT_AMBIENT_AUDIO, { keepAudioSessionActive: true });

  useEffect(() => {
    if (visible) {
      try {
        void setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        }).catch(() => undefined);
        ambientPlayer.loop = true;
        ambientPlayer.volume = 0.09;
        void ambientPlayer.seekTo(0).catch(() => undefined);
        ambientPlayer.play();
      } catch {}
    } else {
      try {
        ambientPlayer.pause();
      } catch {}
    }

    return () => {
      try {
        ambientPlayer.pause();
      } catch {}
    };
  }, [visible, ambientPlayer]);

  const model = useMemo(
    () => message ? getLoveReadingViewModel(message.card, message.text, question) : null,
    [message, question],
  );
  const score = model?.compatibilityScore;
  const isAwaitingMessage = !message;
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [phase, setPhase] = useState<FlowPhase>('loading');
  const [revealScoreText, setRevealScoreText] = useState('00%');
  const [hasLockedScore, setHasLockedScore] = useState(false);
  const reduceMotionRef = useRef(false);
  const revealedMessageIdRef = useRef<string | null>(null);

  const outerRotation = useRef(new Animated.Value(0)).current;
  const innerRotation = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const centerPulse = useRef(new Animated.Value(1)).current;
  const scoreOpacity = useRef(new Animated.Value(1)).current;
  const burstProgress = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reduceMotionRef.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible || !isAwaitingMessage) {
      setLoadingElapsed(0);
      return undefined;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => setLoadingElapsed(Date.now() - startedAt), 120);
    return () => clearInterval(timer);
  }, [visible, isAwaitingMessage]);

  useEffect(() => {
    let cancelled = false;
    let scoreTicker: ReturnType<typeof setInterval> | undefined;
    const runningAnimations: Animated.CompositeAnimation[] = [];

    const stopAnimations = () => {
      runningAnimations.forEach((animation) => animation.stop());
      if (scoreTicker) clearInterval(scoreTicker);
    };

    const resetAnimationValues = () => {
      outerRotation.setValue(0);
      innerRotation.setValue(0);
      ringScale.setValue(1);
      centerPulse.setValue(1);
      scoreOpacity.setValue(1);
      burstProgress.setValue(0);
      burstOpacity.setValue(0);
      flashOpacity.setValue(0);
      resultOpacity.setValue(0);
      resultScale.setValue(0.97);
    };

    if (!visible || !message) {
      revealedMessageIdRef.current = null;
      resetAnimationValues();
      setRevealScoreText('00%');
      setHasLockedScore(false);
      setPhase('loading');
      return stopAnimations;
    }

    if (revealedMessageIdRef.current === message.id) return stopAnimations;
    revealedMessageIdRef.current = message.id;
    resetAnimationValues();
    setPhase('revealing');
    setHasLockedScore(false);

    const finalScoreText = score !== undefined ? `${score}%` : 'DUYÊN';

    const showResult = (duration: number) => {
      if (cancelled) return;
      setPhase('result');
      const resultAnimation = Animated.parallel([
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(resultScale, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      runningAnimations.push(resultAnimation);
      resultAnimation.start();
    };

    if (reduceMotionRef.current) {
      setRevealScoreText(finalScoreText);
      setHasLockedScore(true);
      scoreOpacity.setValue(0);
      const reducedMotionReveal = Animated.sequence([
        Animated.timing(scoreOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(150),
      ]);
      runningAnimations.push(reducedMotionReveal);
      reducedMotionReveal.start(({ finished }) => {
        if (!finished || cancelled) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        showResult(250);
      });
      return () => {
        cancelled = true;
        stopAnimations();
      };
    }

    let rollingScore = 7;
    setRevealScoreText(`${rollingScore}%`);
    scoreTicker = setInterval(() => {
      rollingScore = (rollingScore + 17 + ((rollingScore % 3) * 5)) % 101;
      setRevealScoreText(`${rollingScore}%`);
    }, 55);

    const spinAnimation = Animated.parallel([
      Animated.timing(outerRotation, {
        toValue: 1,
        duration: SCORE_SPIN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(innerRotation, {
        toValue: 1,
        duration: SCORE_SPIN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(centerPulse, {
          toValue: 1.08,
          duration: 210,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(centerPulse, {
          toValue: 0.97,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(centerPulse, {
          toValue: 1.04,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    runningAnimations.push(spinAnimation);
    spinAnimation.start(({ finished }) => {
      if (!finished || cancelled) return;
      if (scoreTicker) clearInterval(scoreTicker);
      scoreTicker = undefined;
      setRevealScoreText(finalScoreText);
      setHasLockedScore(true);
      burstOpacity.setValue(1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

      const boomAnimation = Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 0.82,
            duration: 70,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1.14,
            duration: BURST_DURATION - 70,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(burstProgress, {
          toValue: 1,
          duration: BURST_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(70),
          Animated.timing(burstOpacity, {
            toValue: 0,
            duration: BURST_DURATION - 70,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(flashOpacity, {
            toValue: 0.82,
            duration: 70,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(120),
          Animated.timing(flashOpacity, {
            toValue: 0.65,
            duration: 60,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ]);
      runningAnimations.push(boomAnimation);
      boomAnimation.start(({ finished: boomFinished }) => {
        if (!boomFinished || cancelled) return;
        showResult(RESULT_REVEAL_DURATION);
      });
    });

    return () => {
      cancelled = true;
      stopAnimations();
    };
  }, [
    burstOpacity,
    burstProgress,
    centerPulse,
    flashOpacity,
    innerRotation,
    message,
    outerRotation,
    resultOpacity,
    resultScale,
    ringScale,
    score,
    scoreOpacity,
    visible,
  ]);

  if (!visible) return null;

  const resultAnimation = score !== undefined && score < 50 ? FAIL_ANIMATION : SUCCESS_ANIMATION;
  const outerSpin = outerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });
  const innerSpin = innerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-540deg'],
  });

  return (
    <View style={styles.overlay}>
      <Image
        source={phase === 'result' ? SUCCESS_BACKGROUND : LOADING_BACKGROUND}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        accessibilityIgnoresInvertColors
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quay lại trò chuyện"
            onPress={onClose}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={21} color="#FFF5E7" />
          </TouchableOpacity>
          <Text style={styles.brand}>Numelyra</Text>
          <View style={styles.headerSpacer} />
        </View>

        {phase === 'loading' ? (
          <View style={styles.loadingContent}>
            <View style={styles.loadingStatus}>
              <Text style={styles.loadingPercent}>Đang lắng nghe duyên số</Text>
              <Text style={styles.loadingTitle}>AI đang phân tích{`\n`}mối tương hợp của hai bạn...</Text>
              <View style={styles.progressCard}>
                {LOADING_STEPS.map((step, index) => {
                  const stepProgress = Math.max(0, Math.min(1,
                    (loadingElapsed - index * LOADING_STEP_DURATION) / LOADING_STEP_DURATION,
                  ));
                  const complete = stepProgress >= 1;
                  const active = !complete && stepProgress > 0;
                  return (
                    <View key={step} style={styles.progressStep}>
                      <View style={styles.progressLabelRow}>
                        <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>
                          {step}
                        </Text>
                        <Ionicons
                          name={complete ? 'checkmark-circle' : active ? 'sparkles' : 'ellipse-outline'}
                          size={14}
                          color={complete ? '#F8C9E2' : active ? '#FFD990' : 'rgba(255,245,231,0.55)'}
                        />
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.round(stepProgress * 100)}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            <Image
              source={LOADING_ANIMATION}
              style={styles.loadingAnimation}
              contentFit="contain"
              autoplay
              accessibilityLabel="Hoạt ảnh AI đang phân tích tương hợp"
            />
            <View style={styles.loadingCaption}>
              <Text style={styles.loadingCaptionText}>
                Đang đối chiếu Tử Vi, Bát Tự và những yếu tố tạo nên sự hòa hợp.
              </Text>
            </View>
          </View>
        ) : phase === 'revealing' ? (
          <View
            accessible
            accessibilityLabel={hasLockedScore
              ? `Điểm tương hợp ${revealScoreText}`
              : 'Đang tính điểm tương hợp'}
            accessibilityLiveRegion="polite"
            style={styles.revealContent}
          >
            <View style={styles.revealHeading}>
              <Text style={styles.revealEyebrow}>KẾT NỐI DUYÊN SỐ</Text>
              <Text style={styles.revealTitle}>
                {hasLockedScore ? 'Điểm tương hợp đã được hé lộ' : 'Đang hội tụ năng lượng của hai bạn'}
              </Text>
            </View>

            <View style={styles.energyStage}>
              <Animated.View style={[styles.energySystem, { transform: [{ scale: ringScale }] }]}>
                <Animated.View
                  style={[styles.energyOuterRing, { transform: [{ rotate: outerSpin }] }]}
                >
                  <View style={[styles.orbitDot, styles.orbitDotTop]} />
                  <View style={[styles.orbitDot, styles.orbitDotBottom]} />
                </Animated.View>
                <Animated.View
                  style={[styles.energyInnerRing, { transform: [{ rotate: innerSpin }] }]}
                >
                  <View style={[styles.orbitSpark, styles.orbitSparkLeft]}>
                    <Ionicons name="sparkles" size={15} color="#FFE7A8" />
                  </View>
                  <View style={[styles.orbitSpark, styles.orbitSparkRight]}>
                    <Ionicons name="heart" size={13} color="#FFB5DD" />
                  </View>
                </Animated.View>

                <Animated.View
                  style={[styles.energyCore, { transform: [{ scale: centerPulse }] }]}
                >
                  <View style={styles.energyCoreGlow} />
                  <Animated.View style={{ opacity: scoreOpacity }}>
                    <Text
                      style={[
                        styles.revealScore,
                        revealScoreText === 'DUYÊN' && styles.revealScoreWord,
                      ]}
                    >
                      {revealScoreText}
                    </Text>
                    <Text style={styles.revealScoreLabel}>
                      {hasLockedScore ? 'ĐỘ TƯƠNG HỢP' : 'ĐANG TÍNH'}
                    </Text>
                  </Animated.View>
                </Animated.View>

                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.burstRing,
                    {
                      opacity: burstOpacity,
                      transform: [{
                        scale: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.45, 2.1],
                        }),
                      }],
                    },
                  ]}
                />
                {BURST_PARTICLES.map((particle, index) => (
                  <Animated.View
                    key={`${particle.x}-${particle.y}`}
                    pointerEvents="none"
                    style={[
                      styles.burstParticle,
                      {
                        opacity: burstOpacity,
                        transform: [
                          {
                            translateX: burstProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, particle.x],
                            }),
                          },
                          {
                            translateY: burstProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, particle.y],
                            }),
                          },
                          {
                            scale: burstProgress.interpolate({
                              inputRange: [0, 0.35, 1],
                              outputRange: [0.35, 1.25, 0.45],
                            }),
                          },
                          { rotate: `${index * 45}deg` },
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="sparkles" size={particle.size} color={particle.color} />
                  </Animated.View>
                ))}
              </Animated.View>
            </View>

            <View style={styles.revealCaption}>
              <Ionicons name="heart-circle" size={18} color="#FFD1E8" />
              <Text style={styles.revealCaptionText}>
                {hasLockedScore
                  ? 'Năng lượng tương hợp đã sẵn sàng để luận giải.'
                  : 'AI đang chốt chỉ số cuối cùng từ Tử Vi và Bát Tự.'}
              </Text>
            </View>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.resultShell,
              { opacity: resultOpacity, transform: [{ scale: resultScale }] },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.resultContent}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={resultAnimation}
                style={styles.resultAnimation}
                contentFit="contain"
                autoplay
                accessibilityLabel={score !== undefined && score < 50
                  ? 'Hoạt ảnh mức tương hợp thấp'
                  : 'Hoạt ảnh mức tương hợp'}
              />
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{score !== undefined ? `${score}%` : 'DUYÊN'}</Text>
                <Text style={styles.scoreCaption}>
                  {score !== undefined && score < 50 ? 'Cần thấu hiểu nhau hơn' : 'Cùng vun đắp sự thấu hiểu'}
                </Text>
              </View>

              <View style={styles.answerCard}>
                <Text style={styles.answerHeading}>LUẬN GIẢI AI</Text>
                <HighlightedAnswerText
                  text={model?.answer || 'Hai bạn hãy chậm lại và lắng nghe điều trái tim đang muốn nói.'}
                  style={styles.answerText}
                  emphasisStyle={styles.answerEmphasis}
                />
              </View>
            </ScrollView>

            <ThreeDButton
              accessibilityLabel="Xem nguyên nhân tương hợp chi tiết"
              disabled={!message}
              label="Xem nguyên nhân chi tiết"
              onPress={() => message && onOpenDetail(message, question)}
              shape="pill"
              style={styles.detailButton3d}
              trailingIcon={<Ionicons name="arrow-forward" size={19} color="#3F205C" />}
              variant="brand"
            />
          </Animated.View>
        )}
      </SafeAreaView>
      <Animated.View
        pointerEvents="none"
        style={[styles.revealFlash, { opacity: flashOpacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#171333',
  },
  safeArea: { flex: 1, backgroundColor: 'rgba(17, 13, 43, 0.12)' },
  header: {
    height: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  brand: { color: '#FFF5E7', fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
  headerSpacer: { width: 38 },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  loadingStatus: {
    width: '88%',
    alignSelf: 'flex-end',
    marginTop: 42,
  },
  loadingPercent: {
    color: '#FFF9F0',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'right',
    textShadowColor: 'rgba(44, 61, 142, 0.8)',
    textShadowRadius: 12,
  },
  loadingTitle: {
    color: '#FFF7EC',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
  },
  progressCard: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 27, 64, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressStep: { marginVertical: 4 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressLabel: { color: 'rgba(255,245,231,0.72)', fontSize: 11, lineHeight: 16, fontWeight: '600', flex: 1 },
  progressLabelActive: { color: '#FFF5E7', fontWeight: '800' },
  progressTrack: { height: 4, overflow: 'hidden', marginTop: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#F6B6D5' },
  loadingAnimation: {
    width: '100%',
    flex: 1,
    maxHeight: 320,
    minHeight: 120,
    transform: [{ translateX: ANIMATION_HORIZONTAL_OFFSET }],
  },
  loadingCaption: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(30, 35, 67, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  loadingCaptionText: { color: '#FFF5E7', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  revealContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  revealHeading: { alignItems: 'center', paddingHorizontal: 12 },
  revealEyebrow: {
    color: '#FFD8EC',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 2.1,
    textShadowColor: 'rgba(255, 136, 204, 0.8)',
    textShadowRadius: 10,
  },
  revealTitle: {
    color: '#FFF9EF',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(79, 91, 184, 0.9)',
    textShadowRadius: 14,
  },
  energyStage: {
    flex: 1,
    minHeight: 286,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energySystem: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyOuterRing: {
    position: 'absolute',
    top: 17,
    left: 17,
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 210, 235, 0.86)',
    backgroundColor: 'rgba(221, 91, 163, 0.04)',
  },
  energyInnerRing: {
    position: 'absolute',
    top: 43,
    left: 43,
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 3,
    borderStyle: 'dotted',
    borderColor: 'rgba(255, 226, 156, 0.9)',
    backgroundColor: 'rgba(255, 220, 149, 0.035)',
  },
  orbitDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFEBA6',
    borderWidth: 2,
    borderColor: '#FFFBE8',
    shadowColor: '#FFE18B',
    shadowOpacity: 1,
    shadowRadius: 9,
    elevation: 8,
  },
  orbitDotTop: { top: -7, left: 110 },
  orbitDotBottom: { bottom: -7, left: 110 },
  orbitSpark: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(86, 52, 135, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
  },
  orbitSparkLeft: { left: -15, top: 76 },
  orbitSparkRight: { right: -15, top: 76 },
  energyCore: {
    position: 'absolute',
    top: 66,
    left: 66,
    width: 138,
    height: 138,
    borderRadius: 69,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(83, 51, 139, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255, 237, 190, 0.88)',
    shadowColor: '#F98ECB',
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 16,
  },
  energyCoreGlow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 59,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(241, 121, 192, 0.2)',
  },
  revealScore: {
    color: '#FFFDF4',
    fontSize: 42,
    lineHeight: 49,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(255, 205, 116, 0.95)',
    textShadowRadius: 14,
  },
  revealScoreWord: { fontSize: 28, lineHeight: 35, letterSpacing: 1.6 },
  revealScoreLabel: {
    color: '#FFE4F1',
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  burstRing: {
    position: 'absolute',
    top: 60,
    left: 60,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#FFF1AF',
    shadowColor: '#FFF3BD',
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  burstParticle: {
    position: 'absolute',
    top: 127,
    left: 127,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealCaption: {
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 29, 72, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.23)',
  },
  revealCaptionText: {
    flex: 1,
    color: '#FFF1E5',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  revealFlash: {
    ...StyleSheet.absoluteFill,
    zIndex: 300,
    elevation: 300,
    backgroundColor: '#FFF0CE',
  },
  resultShell: { flex: 1 },
  resultContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  resultTitle: {
    color: '#FFF9F1',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.7,
    textShadowColor: 'rgba(72, 96, 164, 0.8)',
    textShadowRadius: 10,
  },
  resultAnimation: {
    width: '100%',
    height: 190,
    marginTop: 4,
    transform: [{ translateX: ANIMATION_HORIZONTAL_OFFSET }],
  },
  scoreBadge: {
    width: 166,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -3,
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(126, 72, 151, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scoreText: { color: '#FFFDF8', fontSize: 34, lineHeight: 39, fontWeight: '900' },
  scoreCaption: { color: '#FFF0D8', fontSize: 12, fontWeight: '700', marginTop: 1 },
  answerCard: {
    width: '100%',
    borderRadius: 21,
    paddingHorizontal: 17,
    paddingVertical: 15,
    backgroundColor: '#FFF0D3',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
  },
  answerHeading: {
    color: '#B94C82',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  answerText: { color: '#423445', fontSize: 14, lineHeight: 20 },
  answerEmphasis: { color: '#992D68', fontWeight: '900' },
  detailButton3d: { alignSelf: 'stretch', marginHorizontal: 20, marginBottom: 10 },
});
