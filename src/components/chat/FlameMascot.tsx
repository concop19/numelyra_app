import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import LottieView, { type AnimationObject } from 'lottie-react-native';

const FIRE_ANIMATION = require('../../../assets/char/Streak fire.json') as AnimationObject;

export type MascotState = 'idle' | 'thinking' | 'answer' | 'speaking';

interface Props {
  state: MascotState;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  paletteIndex?: number;
}

export type FirePalette = {
  primary: string;
  outline: string;
};

export const FLAME_COLOR_CHANGE_INTERVAL_MS = 7_000;
const ORIGINAL_PRIMARY = [0.19215686274509805, 0.592156862745098, 0.996078431372549];
const ORIGINAL_OUTLINE = [0.419607992733, 0.807843017578, 1];

export const FLAME_COLOR_PALETTES: FirePalette[] = [
  { primary: '#8B5CF6', outline: '#C4B5FD' },
  { primary: '#EC4899', outline: '#F9A8D4' },
  { primary: '#F97316', outline: '#FCD34D' },
  { primary: '#10B981', outline: '#6EE7B7' },
  { primary: '#3197FE', outline: '#6BCFFF' },
];

const hexToLottieColor = (hex: string) => {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
    1,
  ];
};

const matchesColor = (color: unknown, expected: number[]) => (
  Array.isArray(color)
  && color.length >= expected.length
  && expected.every((channel, index) => Math.abs(Number(color[index]) - channel) < 0.002)
);

const recolorFireAnimation = (palette: FirePalette): AnimationObject => {
  const animation = JSON.parse(JSON.stringify(FIRE_ANIMATION)) as AnimationObject;
  const primary = hexToLottieColor(palette.primary);
  const outline = hexToLottieColor(palette.outline);

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, any>;
    const color = record.c?.k;

    if ((record.ty === 'fl' || record.ty === 'st') && matchesColor(color, ORIGINAL_PRIMARY)) {
      record.c.k = primary;
    } else if ((record.ty === 'fl' || record.ty === 'st') && matchesColor(color, ORIGINAL_OUTLINE)) {
      record.c.k = outline;
    }

    Object.values(record).forEach(visit);
  };

  visit(animation);
  return animation;
};

export const FlameMascot: React.FC<Props> = ({
  state = 'idle',
  size = 180,
  style,
  onPress,
  paletteIndex = 0,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowPulseAnim = useRef(new Animated.Value(0.68)).current;
  const normalizedPaletteIndex = (
    (paletteIndex % FLAME_COLOR_PALETTES.length) + FLAME_COLOR_PALETTES.length
  ) % FLAME_COLOR_PALETTES.length;
  const palette = FLAME_COLOR_PALETTES[normalizedPaletteIndex];
  const animationSource = useMemo(() => recolorFireAnimation(palette), [palette]);

  useEffect(() => {
    const bounce = Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.08,
        duration: 180,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]);

    bounce.start();
    return () => bounce.stop();
  }, [bounceAnim, state]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.65,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [glowPulseAnim]);

  const speed = state === 'thinking'
    ? 1.25
    : state === 'speaking'
      ? 1.15
      : state === 'answer'
        ? 1.05
        : 0.9;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.wrapper, { width: size, height: size }, style]}
    >
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: size * 0.68,
            height: size * 0.68,
            left: size * 0.16,
            bottom: -size * 0.13,
            borderRadius: size * 0.34,
            backgroundColor: `${palette.primary}4D`,
            shadowColor: palette.primary,
            opacity: isPressed ? 1 : glowPulseAnim,
            transform: [
              { scaleX: isPressed ? 1.16 : 1 },
              { scaleY: isPressed ? 0.27 : 0.24 },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.animationContainer,
          {
            width: size,
            height: size,
            transform: [{ scale: bounceAnim }],
          },
        ]}
      >
        <LottieView
          key={`fire-${normalizedPaletteIndex}`}
          source={animationSource}
          autoPlay
          loop
          speed={speed}
          resizeMode="contain"
          style={styles.animation}
          webStyle={styles.webAnimation}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 5,
  },
  animationContainer: {
    overflow: 'visible',
    position: 'relative',
    zIndex: 1,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  webAnimation: {
    width: '100%',
    height: '100%',
  },
});

export default FlameMascot;
