import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type MeteorPath = {
  startX: number;
  startY: number;
  travelX: number;
  travelY: number;
  delay: number;
  duration: number;
  length: number;
  headSize: number;
};

interface Props {
  burstKey: number;
  color: string;
  glowColor: string;
}

// Tọa độ theo tỉ lệ màn hình. Các đường bay nằm ở vùng trời và né khu vực mascot.
const METEOR_PATHS: MeteorPath[] = [
  { startX: 0.92, startY: 0.06, travelX: -0.56, travelY: 0.27, delay: 0, duration: 900, length: 92, headSize: 6 },
  { startX: 1.05, startY: 0.17, travelX: -0.70, travelY: 0.34, delay: 130, duration: 1080, length: 112, headSize: 7 },
  { startX: 0.68, startY: 0.02, travelX: -0.43, travelY: 0.22, delay: 260, duration: 820, length: 72, headSize: 5 },
  { startX: 0.97, startY: 0.29, travelX: -0.50, travelY: 0.24, delay: 390, duration: 960, length: 86, headSize: 6 },
  { startX: 0.51, startY: 0.12, travelX: -0.33, travelY: 0.19, delay: 520, duration: 780, length: 62, headSize: 4 },
];

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const MeteorShower: React.FC<Props> = ({ burstKey, color, glowColor }) => {
  const { width, height } = useWindowDimensions();
  const progressValues = useRef(
    METEOR_PATHS.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (burstKey === 0) return undefined;

    progressValues.forEach((progress) => {
      progress.stopAnimation();
      progress.setValue(0);
    });

    const burst = Animated.parallel(
      METEOR_PATHS.map((path, index) => Animated.sequence([
        Animated.delay(path.delay),
        Animated.timing(progressValues[index], {
          toValue: 1,
          duration: path.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]))
    );

    burst.start();
    return () => burst.stop();
  }, [burstKey, progressValues]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {METEOR_PATHS.map((path, index) => {
        const progress = progressValues[index];

        return (
          <Animated.View
            key={`${index}-${burstKey}`}
            style={[
              styles.meteorTrack,
              {
                left: path.startX * width,
                top: path.startY * height,
                opacity: progress.interpolate({
                  inputRange: [0, 0.08, 0.76, 1],
                  outputRange: [0, 1, 0.92, 0],
                }),
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, path.travelX * width],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, path.travelY * height],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.12, 0.8, 1],
                      outputRange: [0.5, 1, 1, 0.72],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.meteorBody}>
              <View
                style={[
                  styles.head,
                  {
                    width: path.headSize,
                    height: path.headSize,
                    borderRadius: path.headSize / 2,
                    borderColor: color,
                    shadowColor: glowColor,
                  },
                ]}
              />
              <LinearGradient
                colors={[color, `${glowColor}B3`, `${glowColor}00`]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.tail, { width: path.length }]}
              />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  meteorTrack: {
    position: 'absolute',
  },
  meteorBody: {
    alignItems: 'center',
    flexDirection: 'row',
    transform: [{ rotate: '-27deg' }],
  },
  tail: {
    height: 3,
    borderRadius: 2,
    marginLeft: -1,
  },
  head: {
    backgroundColor: '#FFF9EE',
    borderWidth: 1,
    elevation: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});

export default MeteorShower;
