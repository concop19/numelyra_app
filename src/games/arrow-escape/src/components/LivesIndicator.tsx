import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useEffect, useRef } from 'react';

import { theme } from '../theme/theme';

type Props = {
  livesLeft: number;
};

export function LivesIndicator({ livesLeft }: Props) {
  const prevLives = useRef(livesLeft);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (livesLeft < prevLives.current) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      shakeX.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
    prevLives.current = livesLeft;
  }, [livesLeft, scale, shakeX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 34,
    paddingTop: 28
  }));

  return (
    <Animated.View style={animStyle} accessibilityLabel={`${livesLeft} lives left`}>
      {Array.from({ length: 3 }, (_, index) => (
        <Text key={index} style={[styles.drop, index >= livesLeft && styles.empty]}>
          {index < livesLeft ? '❤' : '♡'}
        </Text>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 34,
    paddingTop: 28
  },
  drop: {
    color: theme.colors.lifeRed,
    fontSize: 28,
  },
  empty: {
    color: theme.colors.lifeMuted,
  }
});
