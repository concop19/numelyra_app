import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const CHARACTER_SHEET = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/char/char_1.png');
const AURA_SHEET = require('../../../../assets/giao_dien/giaodien1/chat_detail/love_mode/char/char_behind_1.png');

const COLUMN_COUNT = 3;
const ROW_COUNT = 2;
const FRAME_COUNT = COLUMN_COUNT * ROW_COUNT;

const SHEET_SIZES = {
  character: { width: 491, height: 329 },
  aura: { width: 451, height: 309 },
} as const;

type Props = {
  size: number;
  phase?: number;
  mirrored?: boolean;
  reduceMotion?: boolean;
};

type SpriteLayerProps = {
  source: number;
  sheetWidth: number;
  sheetHeight: number;
  frame: number;
  size: number;
  opacity?: number;
};

function SpriteLayer({
  source,
  sheetWidth,
  sheetHeight,
  frame,
  size,
  opacity = 1,
}: SpriteLayerProps) {
  const column = frame % COLUMN_COUNT;
  const row = Math.floor(frame / COLUMN_COUNT);
  const frameWidth = sheetWidth / COLUMN_COUNT;
  const frameHeight = sheetHeight / ROW_COUNT;
  const frameScale = size / Math.max(frameWidth, frameHeight);
  const renderedFrameWidth = frameWidth * frameScale;
  const renderedFrameHeight = frameHeight * frameScale;

  return (
    <Image
      source={source}
      fadeDuration={0}
      resizeMode="stretch"
      style={{
        position: 'absolute',
        left: ((size - renderedFrameWidth) / 2) - (column * renderedFrameWidth),
        top: ((size - renderedFrameHeight) / 2) - (row * renderedFrameHeight),
        width: sheetWidth * frameScale,
        height: sheetHeight * frameScale,
        opacity,
      }}
    />
  );
}

/** Composes the matching six-frame aura and character sheets into one love spirit. */
export default function LoveSpiritSprite({
  size,
  phase = 0,
  mirrored = false,
  reduceMotion = false,
}: Props) {
  const initialFrame = ((phase % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
  const [frame, setFrame] = useState(initialFrame);

  useEffect(() => {
    setFrame(initialFrame);
    if (reduceMotion) return undefined;

    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, 220);

    return () => clearInterval(timer);
  }, [initialFrame, reduceMotion]);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.viewport,
        { width: size, height: size },
        mirrored && styles.mirrored,
      ]}
    >
      <SpriteLayer
        source={AURA_SHEET}
        sheetWidth={SHEET_SIZES.aura.width}
        sheetHeight={SHEET_SIZES.aura.height}
        frame={frame}
        size={size}
        opacity={0.96}
      />
      <SpriteLayer
        source={CHARACTER_SHEET}
        sheetWidth={SHEET_SIZES.character.width}
        sheetHeight={SHEET_SIZES.character.height}
        frame={frame}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  mirrored: { transform: [{ scaleX: -1 }] },
});
