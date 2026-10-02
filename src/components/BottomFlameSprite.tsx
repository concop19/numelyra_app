import React, { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

const FRAME_COUNT = 6;
const CHARACTER_HEIGHT = 96;
const BASELINE = 1084;

type Frame = {
  source: ImageSourcePropType;
  width: number;
  height: number;
};

const LEFT_FRAMES: Frame[] = [
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_left/1.png'), width: 472, height: 493 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_left/2.png'), width: 478, height: 496 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_left/3.png'), width: 427, height: 502 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_left/4.png'), width: 472, height: 469 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_left/5.png'), width: 460, height: 466 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_left/6.png'), width: 394, height: 469 },
];

const RIGHT_FRAMES: Frame[] = [
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_right/1.png'), width: 421, height: 487 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_right/2.png'), width: 412, height: 457 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_right/3.png'), width: 418, height: 448 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_right/4.png'), width: 400, height: 430 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_right/5.png'), width: 409, height: 433 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lac_right/6.png'), width: 421, height: 460 },
];

type Props = {
  scale: number;
  active: boolean;
  side: 'left' | 'right';
};

/** Animated flame characters positioned below the lower edge of the tarot mat. */
export default function BottomFlameSprite({ scale, active, side }: Props) {
  const initialFrame = side === 'left' ? 0 : 3;
  const [frame, setFrame] = useState(initialFrame);

  useEffect(() => {
    if (!active) {
      setFrame(initialFrame);
      return;
    }

    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, 240);

    return () => clearInterval(timer);
  }, [active, initialFrame]);

  const frames = side === 'left' ? LEFT_FRAMES : RIGHT_FRAMES;
  const height = CHARACTER_HEIGHT * scale;
  const centerX = side === 'left' ? 243 : 735;

  return <View pointerEvents="none" style={styles.layer}>
    {frames.map((frameAsset, index) => {
      const width = frameAsset.width / frameAsset.height * height;
      return <Image
        key={index}
        source={frameAsset.source}
        // Keep every frame mounted; only the visible frame changes.
        fadeDuration={0}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: centerX * scale - width / 2,
          top: (BASELINE - CHARACTER_HEIGHT) * scale,
          width,
          height,
          opacity: frame === index ? 1 : 0,
        }}
      />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
});
