import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Image, Animated, Easing } from 'react-native';

const FIRE_IDLE = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/character/fire_char_idle_3x4.png');
const FIRE_THINKING = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/character/fire_char_thinking_3x4.png');
const FIRE_ANSWER = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/character/fire_char_answer_3x4.png');

export type MascotState = 'idle' | 'thinking' | 'answer' | 'speaking';

interface Props {
  state: MascotState;
  size?: number;
  style?: any;
  onPress?: () => void;
}

const COLUMNS = 4;
const ROWS = 3;
const TOTAL_FRAMES = 12;
const NATIVE_FRAME_SIZE = 362; // 1448 / 4 = 362, 1086 / 3 = 362

export const FlameMascot: React.FC<Props> = ({
  state = 'idle',
  size = 180,
  style,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowPulseAnim = useRef(new Animated.Value(0.7)).current;

  // Chọn sprite sheet tương ứng theo state
  const spriteSource =
    state === 'thinking'
      ? FIRE_THINKING
      : state === 'answer' || state === 'speaking'
      ? FIRE_ANSWER
      : FIRE_IDLE;

  // Tốc độ frame: thinking cháy dồn dập hơn (14 fps), idle nhịp nhàng thư thái (10 fps), answer rạng rỡ (12 fps)
  const fps = state === 'thinking' ? 14 : state === 'speaking' ? 16 : state === 'idle' ? 10 : 12;

  // Chuyển frame animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % TOTAL_FRAMES);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [fps, state]);

  // Hiệu ứng nhảy nảy (bounce) khi đổi trạng thái
  useEffect(() => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.15,
        duration: 180,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1.0,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state]);

  // Hiệu ứng hào quang dưới chân linh vật
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1.0,
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
  }, []);

  const col = frameIndex % COLUMNS;
  const row = Math.floor(frameIndex / COLUMNS);

  const scaleRatio = size / NATIVE_FRAME_SIZE;

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {/* Vầng sáng ma thuật tỏa dưới chân ngọn lửa */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: size * 1.3,
            height: size * 0.45,
            bottom: -size * 0.08,
            opacity: glowPulseAnim,
            backgroundColor:
              state === 'thinking'
                ? 'rgba(255, 170, 70, 0.45)'
                : state === 'answer' || state === 'speaking'
                ? 'rgba(255, 120, 150, 0.5)'
                : 'rgba(255, 195, 100, 0.35)',
          },
        ]}
      />

      {/* Sprite Sheet frame cropping */}
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
        <Image
          source={spriteSource}
          style={{
            position: 'absolute',
            left: -col * size,
            top: -row * size,
            width: size * COLUMNS,
            height: size * ROWS,
            zIndex: 1,
          }}
          resizeMode="stretch"
        />
      </Animated.View>
    </View>
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
    // React Native Web paints the bitmap at a negative internal z-index.
    // This local context keeps it above the scene background.
    zIndex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
});

export default FlameMascot;
