import React, { useEffect } from 'react';
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

type ColorStop = {
  position: number;
  rgba: readonly [red: number, green: number, blue: number, alpha: number];
};

const CANDLE_STOPS: Record<'ambient' | 'core' | 'ground', readonly ColorStop[]> = {
  ambient: [
    { position: 0, rgba: [255, 244, 194, 0.46] },
    { position: 0.3, rgba: [255, 194, 89, 0.32] },
    { position: 0.63, rgba: [255, 119, 38, 0.14] },
    { position: 1, rgba: [255, 86, 24, 0] },
  ],
  core: [
    { position: 0, rgba: [255, 255, 239, 0.98] },
    { position: 0.2, rgba: [255, 236, 158, 0.88] },
    { position: 0.56, rgba: [255, 162, 55, 0.5] },
    { position: 1, rgba: [255, 111, 24, 0] },
  ],
  ground: [
    { position: 0, rgba: [255, 224, 137, 0.58] },
    { position: 0.44, rgba: [255, 159, 62, 0.3] },
    { position: 1, rgba: [255, 104, 30, 0] },
  ],
};

const GRADIENT_RING_COUNT = 20;

function colorAt(stops: readonly ColorStop[], position: number): string {
  const upperIndex = stops.findIndex(stop => stop.position >= position);
  if (upperIndex <= 0) {
    const [red, green, blue, alpha] = stops[0].rgba;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const lower = stops[upperIndex - 1];
  const upper = stops[upperIndex];
  const progress = (position - lower.position) / (upper.position - lower.position);
  const rgba = lower.rgba.map((value, index) =>
    value + (upper.rgba[index] - value) * progress
  );

  return `rgba(${Math.round(rgba[0])}, ${Math.round(rgba[1])}, ${Math.round(rgba[2])}, ${rgba[3].toFixed(3)})`;
}

const GradientDisc: React.FC<{
  diameter: number;
  stops: readonly ColorStop[];
}> = ({ diameter, stops }) => {
  const ringThickness = diameter / (GRADIENT_RING_COUNT * 2);

  return (
    <View style={StyleSheet.absoluteFill}>
      {Array.from({ length: GRADIENT_RING_COUNT }, (_, index) => {
        const ringDiameter = diameter * (GRADIENT_RING_COUNT - index) / GRADIENT_RING_COUNT;
        const radialPosition = Math.max(0, (ringDiameter / 2 - ringThickness / 2) / (diameter / 2));

        return (
          <View
            key={index}
            style={[
              styles.gradientRing,
              {
                width: ringDiameter,
                height: ringDiameter,
                left: (diameter - ringDiameter) / 2,
                top: (diameter - ringDiameter) / 2,
                borderRadius: ringDiameter / 2,
                borderWidth: ringThickness + 0.5,
                borderColor: colorAt(stops, radialPosition),
                backgroundColor: index === GRADIENT_RING_COUNT - 1
                  ? colorAt(stops, 0)
                  : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
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
          stops={CANDLE_STOPS.ambient}
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
          stops={CANDLE_STOPS.ground}
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
          stops={CANDLE_STOPS.core}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientRing: {
    position: 'absolute',
  },
  lightLayer: {
    position: 'absolute',
  },
});

export default CandleFlameGlow;
