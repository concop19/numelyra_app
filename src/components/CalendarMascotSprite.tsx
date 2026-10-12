import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const CALENDAR_IDLE_SPRITE = require('../../assets/giao_dien/giaodien1/calender_asset/mascot/idle_3x4.png');

const COLUMNS = 4;
const ROWS = 3;
const FRAME_COUNT = COLUMNS * ROWS;
const FRAME_DURATION_MS = 100;

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

/** Plays the 4 x 3 idle sprite sheet prepared for the calendar scene. */
export default function CalendarMascotSprite({ size = 112, style, active = true }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setFrameIndex(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % FRAME_COUNT);
    }, FRAME_DURATION_MS);

    return () => clearInterval(timer);
  }, [active]);

  const column = frameIndex % COLUMNS;
  const row = Math.floor(frameIndex / COLUMNS);

  return (
    <View
      pointerEvents="none"
      style={[styles.viewport, { width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={CALENDAR_IDLE_SPRITE}
        fadeDuration={0}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: -column * size,
          top: -row * size,
          width: size * COLUMNS,
          height: size * ROWS,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
  },
});
