import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

const FIRE_IDLE = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/character/fire_char_idle_3x4.png');
const FIRE_THINKING = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/character/fire_char_thinking_3x4.png');
const FIRE_ANSWER = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/character/fire_char_answer_3x4.png');

const FIRE_SPRITES = [
  { key: 'idle', source: FIRE_IDLE },
  { key: 'thinking', source: FIRE_THINKING },
  { key: 'answer', source: FIRE_ANSWER },
] as const;

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
export const FLAME_COLOR_PALETTES: FirePalette[] = [
  { primary: '#8B5CF6', outline: '#C4B5FD' },
  { primary: '#EC4899', outline: '#F9A8D4' },
  { primary: '#F97316', outline: '#FCD34D' },
  { primary: '#10B981', outline: '#6EE7B7' },
  { primary: '#3197FE', outline: '#6BCFFF' },
];

const COLUMNS = 4;
const ROWS = 3;
const TOTAL_FRAMES = COLUMNS * ROWS;

export const FlameMascot: React.FC<Props> = ({
  state = 'idle',
  size = 180,
  style,
  onPress,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowPulseAnim = useRef(new Animated.Value(0.7)).current;

  const activeSpriteKey = state === 'thinking'
    ? 'thinking'
    : state === 'answer' || state === 'speaking'
      ? 'answer'
      : 'idle';

  const fps = state === 'thinking'
    ? 14
    : state === 'speaking'
      ? 16
      : state === 'idle'
        ? 10
        : 12;

  useEffect(() => {
    setFrameIndex(0);
    const interval = setInterval(() => {
      setFrameIndex((previousFrame) => (previousFrame + 1) % TOTAL_FRAMES);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [fps, state]);

  useEffect(() => {
    const bounce = Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.15,
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

  const column = frameIndex % COLUMNS;
  const row = Math.floor(frameIndex / COLUMNS);

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
            width: size * 1.3,
            height: size * 0.45,
            bottom: -size * 0.08,
            opacity: isPressed ? 1 : glowPulseAnim,
            transform: [{ scale: isPressed ? 1.18 : 1 }],
            backgroundColor: isPressed
              ? 'rgba(255, 145, 45, 0.8)'
              : state === 'thinking'
                ? 'rgba(255, 170, 70, 0.45)'
                : state === 'answer' || state === 'speaking'
                  ? 'rgba(255, 120, 150, 0.5)'
                  : 'rgba(255, 195, 100, 0.35)',
          },
        ]}
      />

      <Animated.View
        style={[
          styles.cropContainer,
          {
            width: size,
            height: size,
            transform: [{ scale: bounceAnim }],
          },
        ]}
      >
        {FIRE_SPRITES.map((sprite) => (
          <Image
            key={sprite.key}
            source={sprite.source}
            style={{
              position: 'absolute',
              left: -column * size,
              top: -row * size,
              width: size * COLUMNS,
              height: size * ROWS,
              opacity: sprite.key === activeSpriteKey ? 1 : 0,
              zIndex: sprite.key === activeSpriteKey ? 1 : 0,
            }}
            resizeMode="stretch"
            fadeDuration={0}
          />
        ))}
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
    borderRadius: 999,
    shadowColor: '#FFAE64',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 6,
  },
  cropContainer: {
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
});

export default FlameMascot;
