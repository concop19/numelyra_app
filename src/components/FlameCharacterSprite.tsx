import React, { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

const FRAME_COUNT = 6;
const CHARACTER_HEIGHT = 86;
const VIEWPORT_WIDTH = 95;
const VIEWPORT_HEIGHT = 95;

type Frame = {
  source: ImageSourcePropType;
  width: number;
  height: number;
};

// These individual files have been cropped to each character's visible bounds.
// Keep their natural aspect ratios, centre them, and anchor them to one baseline.
const LEFT_FRAMES: Frame[] = [
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_left/Sprite-0001.png'), width: 163, height: 184 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_left/Sprite-0002.png'), width: 159, height: 180 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_left/Sprite-0003.png'), width: 151, height: 185 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_left/Sprite-0004.png'), width: 163, height: 150 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_left/Sprite-0005.png'), width: 167, height: 169 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_left/Sprite-0006.png'), width: 153, height: 180 },
];

const RIGHT_FRAMES: Frame[] = [
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_right/Sprite-0007.png'), width: 176, height: 190 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_right/Sprite-0008.png'), width: 179, height: 193 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_right/Sprite-0009.png'), width: 167, height: 189 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_right/Sprite-0010.png'), width: 181, height: 143 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_right/Sprite-0011.png'), width: 168, height: 170 },
  { source: require('../../assets/giao_dien/giaodien1/chat_detail/item/lay_right/Sprite-0012.png'), width: 171, height: 176 },
];

type Props = {
  scale: number;
  active: boolean;
  side: 'left' | 'right';
};

/** An individually cropped, six-frame flame character for the tarot mat. */
export default function FlameCharacterSprite({ scale, active, side }: Props) {
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
  const renderedHeight = CHARACTER_HEIGHT * scale;
  const viewportWidth = VIEWPORT_WIDTH * scale;
  const viewportHeight = VIEWPORT_HEIGHT * scale;

  return <View
    pointerEvents="none"
    style={[styles.viewport, {
      left: (side === 'left' ? 212.5 : 650.5) * scale,
      top: 357 * scale,
      width: viewportWidth,
      height: viewportHeight,
    }]}
  >
    {frames.map((frameAsset, index) => {
      const renderedWidth = frameAsset.width / frameAsset.height * renderedHeight;
      return <Image
        key={index}
        source={frameAsset.source}
        // Android otherwise fades every newly displayed image for 300 ms.
        fadeDuration={0}
        resizeMode="contain"
        style={{
          position: 'absolute',
          left: (viewportWidth - renderedWidth) / 2,
          bottom: 0,
          width: renderedWidth,
          height: renderedHeight,
          opacity: frame === index ? 1 : 0,
        }}
      />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 2,
  },
});
