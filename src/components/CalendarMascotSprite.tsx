import React from 'react';
import { Image } from 'expo-image';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MASCOT_VISUAL_ASSETS, resolveMascotVisualLayout } from './chat/mascotVisualLayout';

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

/** Reuses the animated idle WebP shown in the chat scene. */
export default function CalendarMascotSprite({ size = 112, style, active = true }: Props) {
  const idleAsset = MASCOT_VISUAL_ASSETS.defaultIdle;
  const visualLayout = resolveMascotVisualLayout(idleAsset, {
    stageSize: size,
    visibleHeightRatio: 1,
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.viewport, { width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={idleAsset.source}
        autoplay={active}
        contentFit="contain"
        contentPosition="center"
        style={{
          position: 'absolute',
          left: visualLayout.left,
          top: visualLayout.top,
          width: visualLayout.width,
          height: visualLayout.height,
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
