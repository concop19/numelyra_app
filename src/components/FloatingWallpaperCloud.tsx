import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

const CLOUD_SPRITE = require('../../assets/giao_dien/giaodien1/wallpaper_asset/decorate/Dreamy Sunset Cloud Animation Frames.png');

// Six equally sized cells in the 2172 × 724 source sprite sheet.
const FRAME_COUNT = 6;
const FRAME_WIDTH = 357;
const FRAME_HEIGHT = FRAME_WIDTH * 724 / (2172 / FRAME_COUNT);

interface Props {
  width?: number;
  topRatio?: number;
  minTop?: number;
  driftDurationMs?: number;
  pauseDurationMs?: number;
  opacity?: number;
}

/** A slow cloud drifting through the input view's background. */
export default function FloatingWallpaperCloud({
  width = FRAME_WIDTH,
  topRatio = 0.25,
  minTop = 150,
  driftDurationMs = 22_000,
  pauseDurationMs = 0,
  opacity = 1,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [frame, setFrame] = useState(0);
  const driftX = useRef(new Animated.Value(-width)).current;
  const frameHeight = width * FRAME_HEIGHT / FRAME_WIDTH;

  useEffect(() => {
    const frameTimer = setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, 180);

    return () => clearInterval(frameTimer);
  }, []);

  useEffect(() => {
    driftX.setValue(-width);
    const crossing = Animated.timing(driftX, {
      toValue: screenWidth + 24,
      duration: driftDurationMs,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    const drift = Animated.loop(
      pauseDurationMs > 0
        ? Animated.sequence([crossing, Animated.delay(pauseDurationMs)])
        : crossing
    );
    drift.start();

    return () => drift.stop();
  }, [driftDurationMs, driftX, pauseDurationMs, screenWidth, width]);

  return <Animated.View
    pointerEvents="none"
    style={[styles.drifter, {
      top: Math.max(minTop, screenHeight * topRatio),
      width,
      height: frameHeight,
      opacity,
      transform: [{ translateX: driftX }],
    }]}
  >
    <View style={styles.frameViewport}>
      <Image
        source={CLOUD_SPRITE}
        fadeDuration={0}
        resizeMode="stretch"
        style={{
          width: width * FRAME_COUNT,
          height: frameHeight,
          transform: [{ translateX: -frame * width }],
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
