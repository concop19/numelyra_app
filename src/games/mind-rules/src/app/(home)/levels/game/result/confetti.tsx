import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

// Use a relative path (prefer this) instead of metro alias if you had resolution issues.
// Example relative path: '../../assets/animations/confetti.json'
// Replace the path below if your file is in a different location.
import confettiJson from '@/assets/animations/confetti.json';

type ConfettiProps = {
  autoPlay?: boolean;
  onFinish?: () => void;
  style?: object;
};

const Confetti: React.FC<ConfettiProps> = ({
  autoPlay = true,
  onFinish,
  style,
}) => {
  const ref = useRef<LottieView | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Lottie React Native is not supported in typical web builds
      console.warn('Confetti: Lottie not supported on web in this setup.');
      return;
    }

    // small delay to ensure native module is ready
    const t = setTimeout(() => {
      try {
        if (autoPlay) {
          ref.current?.play();
        }
      } catch (err) {
        console.warn('Confetti: play() failed', err);
      }
    }, 80);

    return () => clearTimeout(t);
  }, [autoPlay]);

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <LottieView
        ref={ref}
        // If import failed, this will be undefined; guard to produce helpful message
        source={confettiJson as any}
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => onFinish?.()}
        style={styles.animation}
      />
    </View>
  );
};

export default Confetti;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    zIndex: 999,
    // backgroundColor: 'red',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
