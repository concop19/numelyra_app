import React, { useEffect } from 'react';
import {
  Canvas,
  Circle,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type CandleGlowState = 'idle' | 'thinking' | 'answer' | 'speaking';

interface Props {
  size: number;
  state: CandleGlowState;
  pressed: boolean;
}

const STATE_INTENSITY: Record<CandleGlowState, number> = {
  idle: 1,
  thinking: 1.14,
  answer: 1.05,
  speaking: 1.07,
};

const CANDLE_COLORS = {
  ambient: [
    'rgba(255, 244, 194, 0.46)',
    'rgba(255, 194, 89, 0.32)',
    'rgba(255, 119, 38, 0.14)',
    'rgba(255, 86, 24, 0)',
  ],
  core: [
    'rgba(255, 255, 239, 0.98)',
    'rgba(255, 236, 158, 0.88)',
    'rgba(255, 162, 55, 0.5)',
    'rgba(255, 111, 24, 0)',
  ],
  ground: [
    'rgba(255, 224, 137, 0.58)',
    'rgba(255, 159, 62, 0.3)',
    'rgba(255, 104, 30, 0)',
  ],
} as const;

const GRADIENT_POSITIONS = {
  ambient: [0, 0.3, 0.63, 1],
  core: [0, 0.2, 0.56, 1],
  ground: [0, 0.44, 1],
};

const GradientDisc: React.FC<{
  diameter: number;
  colors: readonly string[];
  positions: number[];
}> = ({ diameter, colors, positions }) => {
  const radius = diameter / 2;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Circle cx={radius} cy={radius} r={radius}>
        <RadialGradient
          c={vec(radius, radius)}
          r={radius}
          colors={[...colors]}
          positions={positions}
        />
      </Circle>
    </Canvas>
  );
};

/** Warm, layered light emitted by the chat mascot. It never participates in layout. */
export const CandleFlameGlow: React.FC<Props> = ({ size, state, pressed }) => {
  const reduceMotion = useReducedMotion();
  const ambientFlicker = useSharedValue(1);
  const coreFlicker = useSharedValue(1);
  const groundFlicker = useSharedValue(1);
  const pressBoost = useSharedValue(0);
  const stateIntensity = STATE_INTENSITY[state];

  useEffect(() => {
    cancelAnimation(ambientFlicker);
    cancelAnimation(coreFlicker);
    cancelAnimation(groundFlicker);

    if (reduceMotion) {
      ambientFlicker.value = 0.96;
      coreFlicker.value = 0.98;
      groundFlicker.value = 0.95;
      return;
    }

    ambientFlicker.value = withRepeat(
      withSequence(
        withTiming(0.93, { duration: 760, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.02, { duration: 430, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.97, { duration: 910, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 540, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    coreFlicker.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.91, { duration: 620, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.01, { duration: 470, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: 710, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    groundFlicker.value = withRepeat(
      withSequence(
        withTiming(0.94, { duration: 980, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.01, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.97, { duration: 830, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(ambientFlicker);
      cancelAnimation(coreFlicker);
      cancelAnimation(groundFlicker);
    };
  }, [ambientFlicker, coreFlicker, groundFlicker, reduceMotion]);

  useEffect(() => {
    pressBoost.value = withTiming(pressed ? 1 : 0, {
      duration: pressed ? 110 : 360,
      easing: pressed ? Easing.out(Easing.quad) : Easing.inOut(Easing.sin),
    });
  }, [pressBoost, pressed]);

  const ambientDiameter = size * 1.56;
  const coreDiameter = size * 0.7;
  const groundDiameter = size * 1.34;

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, 0.78 * stateIntensity * ambientFlicker.value + pressBoost.value * 0.12),
    transform: [
      { translateY: (ambientFlicker.value - 1) * size * 0.08 },
      { scaleX: 1 + (ambientFlicker.value - 1) * 0.65 + pressBoost.value * 0.035 },
      { scaleY: 1 + (ambientFlicker.value - 1) * 1.05 + pressBoost.value * 0.07 },
    ],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, 0.9 * stateIntensity * coreFlicker.value + pressBoost.value * 0.1),
    transform: [
      { translateY: (coreFlicker.value - 1) * size * 0.1 },
      { scaleX: 1 + (coreFlicker.value - 1) * 0.35 + pressBoost.value * 0.025 },
      { scaleY: 1 + (coreFlicker.value - 1) * 0.85 + pressBoost.value * 0.08 },
    ],
  }));

  const groundStyle = useAnimatedStyle(() => ({
    opacity: Math.min(0.82, 0.57 * stateIntensity * groundFlicker.value + pressBoost.value * 0.08),
    transform: [
      { scaleX: 1 + (groundFlicker.value - 1) * 0.55 + pressBoost.value * 0.05 },
      { scaleY: 0.24 + (groundFlicker.value - 1) * 0.18 + pressBoost.value * 0.015 },
    ],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.lightLayer,
          {
            width: ambientDiameter,
            height: ambientDiameter,
            left: (size - ambientDiameter) / 2,
            top: -size * 0.16,
          },
          ambientStyle,
        ]}
      >
        <GradientDisc
          diameter={ambientDiameter}
          colors={CANDLE_COLORS.ambient}
          positions={GRADIENT_POSITIONS.ambient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.lightLayer,
          {
            width: groundDiameter,
            height: groundDiameter,
            left: (size - groundDiameter) / 2,
            top: size * 0.3,
          },
          groundStyle,
        ]}
      >
        <GradientDisc
          diameter={groundDiameter}
          colors={CANDLE_COLORS.ground}
          positions={GRADIENT_POSITIONS.ground}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.lightLayer,
          {
            width: coreDiameter,
            height: coreDiameter,
            left: (size - coreDiameter) / 2,
            top: size * 0.17,
          },
          coreStyle,
        ]}
      >
        <GradientDisc
          diameter={coreDiameter}
          colors={CANDLE_COLORS.core}
          positions={GRADIENT_POSITIONS.core}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  lightLayer: {
    position: 'absolute',
  },
});

export default CandleFlameGlow;
