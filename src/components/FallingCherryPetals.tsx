import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

type PetalConfig = {
  leftRatio: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  direction: 1 | -1;
  color: string;
};

const PETAL_CONFIGS: PetalConfig[] = [
  { leftRatio: 0.04, size: 8, duration: 8600, delay: 0, drift: 36, direction: 1, color: '#FFB5DA' },
  { leftRatio: 0.13, size: 6, duration: 10500, delay: 3100, drift: 28, direction: -1, color: '#FFD0E5' },
  { leftRatio: 0.22, size: 9, duration: 9300, delay: 1600, drift: 42, direction: 1, color: '#F79BCA' },
  { leftRatio: 0.31, size: 7, duration: 11300, delay: 5200, drift: 31, direction: -1, color: '#FFC1DD' },
  { leftRatio: 0.41, size: 6, duration: 9800, delay: 800, drift: 25, direction: 1, color: '#FFE0EC' },
  { leftRatio: 0.50, size: 10, duration: 12100, delay: 6500, drift: 47, direction: -1, color: '#F79BC7' },
  { leftRatio: 0.59, size: 7, duration: 8900, delay: 2300, drift: 34, direction: 1, color: '#FFD0E3' },
  { leftRatio: 0.68, size: 8, duration: 10800, delay: 4300, drift: 39, direction: -1, color: '#FFB2D4' },
  { leftRatio: 0.77, size: 6, duration: 9500, delay: 1200, drift: 27, direction: 1, color: '#FFE1ED' },
  { leftRatio: 0.86, size: 9, duration: 11700, delay: 5900, drift: 44, direction: -1, color: '#F99FCB' },
  { leftRatio: 0.94, size: 7, duration: 10100, delay: 3600, drift: 30, direction: 1, color: '#FFC7DF' },
  { leftRatio: 0.17, size: 5, duration: 12600, delay: 7400, drift: 22, direction: -1, color: '#FFE6F0' },
  { leftRatio: 0.63, size: 5, duration: 13200, delay: 8700, drift: 26, direction: 1, color: '#FFD7E8' },
  { leftRatio: 0.82, size: 6, duration: 12400, delay: 9600, drift: 33, direction: -1, color: '#FFBDD9' },
];

function FallingPetal({ config, screenHeight, screenWidth }: {
  config: PetalConfig;
  screenHeight: number;
  screenWidth: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [config.delay, config.duration, progress, screenHeight]);

  const signedDrift = config.drift * config.direction;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-32, screenHeight + 70],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.22, 0.5, 0.76, 1],
    outputRange: [0, signedDrift, -signedDrift * 0.35, signedDrift * 0.72, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${config.direction * 540}deg`],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.72, 0.94, 1],
    outputRange: [0, 0.9, 0.82, 0.35, 0],
  });

  return (
    <Animated.View
      style={[
        styles.petalTrack,
        {
          left: Math.max(0, Math.min(screenWidth - config.size * 2, screenWidth * config.leftRatio)),
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    >
      <View
        style={[
          styles.petal,
          {
            width: config.size,
            height: config.size * 1.65,
            borderRadius: config.size,
            backgroundColor: config.color,
          },
        ]}
      />
    </Animated.View>
  );
}

export default function FallingCherryPetals() {
  const { width, height } = useWindowDimensions();
  const configs = useMemo(() => PETAL_CONFIGS, []);

  return (
    <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {configs.map((config, index) => (
        <FallingPetal key={index} config={config} screenHeight={height} screenWidth={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  petalTrack: {
    position: 'absolute',
    top: 0,
  },
  petal: {
    transform: [{ rotate: '28deg' }],
    shadowColor: '#FFB7D8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 3,
    elevation: 1,
  },
});
