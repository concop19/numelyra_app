import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocalization } from '../i18n/LocalizationContext';
import ThreeDButton from './ThreeDButton';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const GOLD = '#F7C86A';
const FIREWORK_COLORS = ['#FFD879', '#FF8FC6', '#A98BFF', '#72DFF7', '#FFFFFF'];

const FIREWORK_PARTICLES = Array.from({ length: 16 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 16;
  const distance = 48 + (index % 4) * 7;
  return {
    color: FIREWORK_COLORS[index % FIREWORK_COLORS.length],
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    rotation: `${(index * 360) / 16}deg`,
  };
});

const FIREWORKS = [
  { x: 0.11, y: 0.17, scale: 0.92, delay: 0, rest: 1_250 },
  { x: 0.36, y: 0.10, scale: 0.72, delay: 430, rest: 1_550 },
  { x: 0.64, y: 0.13, scale: 0.82, delay: 760, rest: 1_300 },
  { x: 0.88, y: 0.20, scale: 1.04, delay: 180, rest: 1_600 },
  { x: 0.09, y: 0.41, scale: 0.68, delay: 920, rest: 1_450 },
  { x: 0.91, y: 0.43, scale: 0.74, delay: 1_180, rest: 1_250 },
  { x: 0.14, y: 0.72, scale: 0.84, delay: 540, rest: 1_700 },
  { x: 0.86, y: 0.73, scale: 0.9, delay: 1_420, rest: 1_350 },
] as const;

const CONFETTI = Array.from({ length: 36 }, (_, index) => ({
  color: FIREWORK_COLORS[index % FIREWORK_COLORS.length],
  left: (index * 37 + 9) % 96,
  startY: -34 - (index % 6) * 26,
  travel: 520 + (index % 5) * 70,
  rotation: 260 + (index % 4) * 90,
  width: index % 3 === 0 ? 4 : 7,
  height: index % 3 === 0 ? 13 : 7,
}));

function FireworkBurst({
  progress,
  left,
  top,
  scale = 1,
}: {
  progress: Animated.Value;
  left: number;
  top: number;
  scale?: number;
}) {
  return (
    <View pointerEvents="none" style={[styles.firework, { left, top, transform: [{ scale }] }]}>
      {FIREWORK_PARTICLES.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.fireworkParticle,
            {
              backgroundColor: particle.color,
              opacity: progress.interpolate({
                inputRange: [0, 0.08, 0.55, 0.82, 1],
                outputRange: [0, 1, 1, 0.22, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.dx],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.dy],
                  }),
                },
                { rotate: particle.rotation },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.2, 0.8, 1],
                    outputRange: [0.2, 1, 0.8, 0.2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.fireworkCore,
          {
            opacity: progress.interpolate({
              inputRange: [0, 0.06, 0.28, 0.5, 1],
              outputRange: [0, 1, 0.75, 0, 0],
            }),
            transform: [{
              scale: progress.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0.2, 1.2, 0.2],
              }),
            }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.fireworkRing,
          {
            opacity: progress.interpolate({
              inputRange: [0, 0.08, 0.45, 0.72, 1],
              outputRange: [0, 0.85, 0.42, 0, 0],
            }),
            transform: [{
              scale: progress.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [0.15, 0.9, 1.8],
              }),
            }],
          },
        ]}
      />
    </View>
  );
}

export default function ProUpgradeCelebration({ visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { l } = useLocalization();
  const [reduceMotion, setReduceMotion] = useState(false);
  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const confetti = useRef(new Animated.Value(0)).current;
  const fireworkBursts = useRef(FIREWORKS.map(() => new Animated.Value(0))).current;
  const shouldReduceMotion = reduceMotion;

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
    if (!visible) return;

    backdrop.setValue(0);
    card.setValue(0);
    confetti.setValue(0);
    fireworkBursts.forEach((burst) => burst.setValue(0));

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    const entrance = Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: shouldReduceMotion ? 160 : 320,
        useNativeDriver: true,
      }),
      Animated.spring(card, {
        toValue: 1,
        damping: shouldReduceMotion ? 100 : 12,
        stiffness: shouldReduceMotion ? 500 : 150,
        mass: 0.85,
        useNativeDriver: true,
      }),
    ]);

    const confettiAnimation = shouldReduceMotion
      ? null
      : Animated.loop(Animated.sequence([
        Animated.timing(confetti, {
          toValue: 1,
          duration: 3_200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(confetti, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));

    const staticFireworks = shouldReduceMotion
      ? Animated.parallel(fireworkBursts.map((burst) => (
        Animated.timing(burst, { toValue: 0.55, duration: 240, useNativeDriver: true })
      )))
      : null;

    let fireworksStopped = false;
    const fireworkAnimations = fireworkBursts.map(() => null as ReturnType<typeof Animated.sequence> | null);
    const playBurst = (index: number, firstRun: boolean) => {
      if (fireworksStopped) return;
      const burst = fireworkBursts[index];
      burst.setValue(0);
      const animation = Animated.sequence([
        Animated.delay(firstRun ? FIREWORKS[index].delay : 0),
        Animated.timing(burst, {
          toValue: 1,
          duration: 920,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // At progress 1 every ray is fully transparent. Keep that invisible
        // frame for a beat before resetting and blooming again.
        Animated.delay(FIREWORKS[index].rest),
      ]);
      fireworkAnimations[index] = animation;
      animation.start(({ finished }) => {
        if (finished && !fireworksStopped) playBurst(index, false);
      });
    };

    entrance.start();
    confettiAnimation?.start();
    staticFireworks?.start();
    if (!shouldReduceMotion) {
      fireworkBursts.forEach((_, index) => playBurst(index, true));
    }

    return () => {
      fireworksStopped = true;
      entrance.stop();
      confettiAnimation?.stop();
      staticFireworks?.stop();
      fireworkAnimations.forEach((animation) => animation?.stop());
    };
  }, [backdrop, card, confetti, fireworkBursts, shouldReduceMotion, visible]);

  const cardWidth = Math.min(width - 32, 390);

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdrop }]} />

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {CONFETTI.map((piece, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  backgroundColor: piece.color,
                  height: piece.height,
                  left: `${piece.left}%` as `${number}%`,
                  top: piece.startY,
                  width: piece.width,
                  opacity: shouldReduceMotion ? 0.25 : confetti.interpolate({
                    inputRange: [0, 0.08, 0.82, 1],
                    outputRange: [0, 1, 0.9, 0],
                  }),
                  transform: [
                    {
                      translateY: shouldReduceMotion ? 80 : confetti.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.max(height + 100, piece.travel)],
                      }),
                    },
                    {
                      rotate: shouldReduceMotion ? `${index * 14}deg` : confetti.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${piece.rotation}deg`],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
          {FIREWORKS.map((firework, index) => (
            <FireworkBurst
              key={index}
              progress={fireworkBursts[index]}
              left={width * firework.x}
              top={height * firework.y}
              scale={firework.scale}
            />
          ))}
        </View>

        <Animated.View
          accessibilityLiveRegion="assertive"
          accessibilityViewIsModal
          style={[
            styles.cardShell,
            {
              marginBottom: Math.max(insets.bottom, 12),
              width: cardWidth,
              opacity: card,
              transform: [
                {
                  translateY: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [shouldReduceMotion ? 8 : 46, 0],
                  }),
                },
                {
                  scale: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [shouldReduceMotion ? 0.98 : 0.82, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.cardScroll}
          >
            <LinearGradient
              colors={['#34215B', '#17152F', '#0F1022']}
              end={{ x: 0.9, y: 1 }}
              start={{ x: 0.1, y: 0 }}
              style={styles.card}
            >
              <View pointerEvents="none" style={styles.cardGlow} />
              <LinearGradient colors={['#FFF1A8', '#F6B84D', '#D98B2E']} style={styles.crownRing}>
                <View style={styles.crownInner}>
                  <Ionicons color="#FFD97D" name="diamond" size={33} />
                </View>
              </LinearGradient>

              <View style={styles.proPill}>
                <Ionicons color="#3A235A" name="sparkles" size={13} />
                <Text style={styles.proPillText}>NUMELYRA PRO</Text>
              </View>

              <Text style={styles.eyebrow}>{l('CHÚC MỪNG!', 'CONGRATULATIONS!')}</Text>
              <Text style={styles.title}>{l('Một hành trình mới đã mở ra', 'A new journey has opened')}</Text>
              <Text style={styles.subtitle}>
                {l(
                  'Tài khoản của bạn đã được nâng cấp. Từ giờ, bạn có thể khám phá NUMELYRA sâu hơn mỗi ngày.',
                  'Your account is now upgraded. You can explore NUMELYRA more deeply every day.',
                )}
              </Text>

              <View style={styles.benefits}>
                <View style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Ionicons color={GOLD} name="chatbubble-ellipses-outline" size={18} />
                  </View>
                  <Text style={styles.benefitText}>{l('200 lượt luận giải AI mỗi tháng', '200 AI readings every month')}</Text>
                  <Ionicons color="#86E2C0" name="checkmark-circle" size={19} />
                </View>
                <View style={styles.benefitDivider} />
                <View style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Ionicons color={GOLD} name="planet-outline" size={19} />
                  </View>
                  <Text style={styles.benefitText}>{l('Mở khóa trải nghiệm dành riêng cho Pro', 'Unlock experiences made for Pro')}</Text>
                  <Ionicons color="#86E2C0" name="checkmark-circle" size={19} />
                </View>
              </View>

              <ThreeDButton
                fullWidth
                label={l('Bắt đầu khám phá', 'Start exploring')}
                leadingIcon={<Ionicons color="#4A2A36" name="diamond" size={21} />}
                onPress={onClose}
                shape="pill"
                size="lg"
                style={styles.ctaButton}
                trailingIcon={<Ionicons color="#4A2A36" name="chevron-forward" size={24} />}
                variant="gold"
              />
              <Text style={styles.footer}>{l('Cảm ơn bạn đã đồng hành cùng NUMELYRA', 'Thank you for being part of NUMELYRA')}</Text>
            </LinearGradient>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    backgroundColor: 'rgba(5, 4, 18, 0.9)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  confetti: {
    borderRadius: 3,
    position: 'absolute',
  },
  firework: {
    height: 1,
    position: 'absolute',
    width: 1,
  },
  fireworkParticle: {
    borderRadius: 4,
    height: 3,
    left: -4,
    position: 'absolute',
    top: -1,
    width: 9,
  },
  fireworkCore: {
    backgroundColor: '#FFF6C7',
    borderRadius: 8,
    height: 14,
    left: -7,
    position: 'absolute',
    shadowColor: '#FFD66B',
    shadowOpacity: 0.95,
    shadowRadius: 12,
    top: -7,
    width: 14,
  },
  fireworkRing: {
    borderColor: 'rgba(255, 230, 154, 0.82)',
    borderRadius: 17,
    borderWidth: 1.5,
    height: 34,
    left: -17,
    position: 'absolute',
    top: -17,
    width: 34,
  },
  cardShell: {
    borderColor: 'rgba(247, 200, 106, 0.72)',
    borderRadius: 30,
    borderWidth: 1,
    maxHeight: '88%',
    shadowColor: '#B77BFF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 30,
  },
  card: {
    alignItems: 'center',
    borderRadius: 29,
    paddingBottom: 23,
    paddingHorizontal: 22,
    paddingTop: 30,
  },
  cardScroll: {
    borderRadius: 29,
    overflow: 'hidden',
  },
  cardScrollContent: {
    flexGrow: 1,
  },
  cardGlow: {
    backgroundColor: 'rgba(168, 112, 255, 0.16)',
    borderRadius: 110,
    height: 210,
    position: 'absolute',
    top: -105,
    width: 210,
  },
  crownRing: {
    alignItems: 'center',
    borderRadius: 43,
    height: 86,
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#F7C86A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    width: 86,
  },
  crownInner: {
    alignItems: 'center',
    backgroundColor: '#25183F',
    borderRadius: 38,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  proPill: {
    alignItems: 'center',
    backgroundColor: GOLD,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    marginTop: -10,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  proPillText: {
    color: '#35204F',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  eyebrow: {
    color: '#F8D27D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginTop: 20,
  },
  title: {
    color: '#FFF7E6',
    fontFamily: 'serif',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 33,
    marginTop: 7,
    textAlign: 'center',
  },
  subtitle: {
    color: '#D7CDE6',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 11,
    maxWidth: 320,
    textAlign: 'center',
  },
  benefits: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: 'rgba(247,200,106,0.16)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 21,
    paddingHorizontal: 14,
    width: '100%',
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,200,106,0.11)',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  benefitText: {
    color: '#F2ECF8',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    paddingHorizontal: 11,
  },
  benefitDivider: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    height: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    marginTop: 20,
  },
  footer: {
    color: '#9488A8',
    fontSize: 11,
    marginTop: 13,
    textAlign: 'center',
  },
});
