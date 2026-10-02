import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const FLAME_SPRITE = require('../../assets/giao_dien/giaodien1/chat_detail/item/nenchay.png');

// `nenchay.png` is a six-cell horizontal sprite sheet (1448 × 340 px).
const FRAME_COUNT = 6;
const FRAME_WIDTH = 104;
const FRAME_HEIGHT = FRAME_WIDTH * 340 / (1448 / FRAME_COUNT);

type Props = {
  /** Scale applied to the 941 × 1672 detail-screen artwork. */
  scale: number;
  /** Stops the timer while the surrounding modal is hidden. */
  active: boolean;
};

/** Renders the candle-flame sprite over the wick in the detail-scene artwork. */
export default function CandleFlameSprite({ scale, active }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }

    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, 90);

    return () => clearInterval(timer);
  }, [active]);

  const width = FRAME_WIDTH * scale;
  const height = FRAME_HEIGHT * scale;

  return <View
    pointerEvents="none"
    style={[styles.viewport, {
      left: 474 * scale,
      top: 50 * scale,
      width,
      height,
    }]}
  >
    <Image
      source={FLAME_SPRITE}
      resizeMode="stretch"
      style={{
        width: width * FRAME_COUNT,
        height,
        transform: [{ translateX: -frame * width }],
      }}
    />
  </View>;
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 1,
  },
});
