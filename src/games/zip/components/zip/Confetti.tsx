/**
 * Lightweight confetti effect using Reanimated. Avoids adding a third-party
 * dependency just for a few seconds of celebration.
 */

import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#5B8DEF', '#22C55E', '#F59E0B', '#FF5C7A', '#A78BFA', '#06B6D4'];

interface ConfettiProps {
  readonly count?: number;
  readonly active: boolean;
}

interface PieceProps {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

function ConfettiPiece({ index, width, height }: PieceProps) {
  // Deterministic pseudo-random offsets so pieces look distinct but stable.
  const seed = (n: number) => {
    const x = Math.sin(index * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };

  const startX = seed(1) * width;
  const drift = (seed(2) - 0.5) * width * 0.6;
  const delay = seed(3) * 800;
  const duration = 2200 + seed(4) * 1400;
  const rotateEndDeg = seed(5) * 720 - 360;
  const sizeBase = 6 + Math.floor(seed(6) * 8);
  const color = COLORS[Math.floor(seed(7) * COLORS.length)];

  const progress = useSharedValue(0);
  const spin = useSharedValue(0);

  const spinDuration = 700 + seed(8) * 800;
  useEffect(() => {
    progress.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    spin.value = withRepeat(
      withSequence(withTiming(1, { duration: spinDuration })),
      -1,
      false,
    );
  }, [progress, spin, duration, spinDuration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + drift * progress.value },
      { translateY: -20 + (height + 60) * progress.value },
      { rotate: `${rotateEndDeg * spin.value}deg` },
    ],
    opacity: 1 - Math.max(0, progress.value - 0.85) / 0.15,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: sizeBase,
          height: sizeBase * 1.6,
          backgroundColor: color,
          marginTop: -delay / 8,
        },
        style,
      ]}
    />
  );
}

export function Confetti({ count = 60, active }: ConfettiProps) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count],
  );
  if (!active) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((i) => (
        <ConfettiPiece key={i} index={i} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});
