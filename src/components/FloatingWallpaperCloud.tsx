import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';

const CLOUD_SPRITE = require('../../assets/giao_dien/giaodien1/wallpaper_asset/decorate/Dreamy Sunset Cloud Animation Frames.png');

// Six equally sized cells in the 2172 × 724 source sprite sheet.
const FRAME_COUNT = 6;
const FRAME_WIDTH = 357;
const FRAME_HEIGHT = FRAME_WIDTH * 724 / (2172 / FRAME_COUNT);

/** A slow cloud drifting through the input view's background. */
export default function FloatingWallpaperCloud() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [frame, setFrame] = useState(0);
  const driftX = useRef(new Animated.Value(-FRAME_WIDTH)).current;

  useEffect(() => {
    const frameTimer = setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, 180);

    return () => clearInterval(frameTimer);
  }, []);

  useEffect(() => {
    driftX.setValue(-FRAME_WIDTH);
    const drift = Animated.loop(Animated.timing(driftX, {
      toValue: screenWidth + 24,
      duration: 22_000,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    drift.start();

    return () => drift.stop();
  }, [driftX, screenWidth]);

  return <Animated.View
    pointerEvents="none"
    style={[styles.drifter, {
      top: Math.max(150, screenHeight * 0.25),
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      transform: [{ translateX: driftX }],
    }]}
  >
    <View style={styles.frameViewport}>
      <Image
        source={CLOUD_SPRITE}
        fadeDuration={0}
        resizeMode="stretch"
        style={{
          width: FRAME_WIDTH * FRAME_COUNT,
          height: FRAME_HEIGHT,
          transform: [{ translateX: -frame * FRAME_WIDTH }],
        }}
      />
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  drifter: {
    position: 'absolute',
    zIndex: 1,
  },
  frameViewport: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
