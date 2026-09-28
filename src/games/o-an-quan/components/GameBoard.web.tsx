// @ts-nocheck
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

export function GameBoard(props: any) {
  return (
    <WithSkiaWeb
      opts={{
        locateFile: (file: string) =>
          `https://unpkg.com/canvaskit-wasm@0.41.0/bin/full/${file}`,
      }}
      componentProps={props}
      fallback={<View style={styles.loading} />}
      getComponent={() =>
        import('./GameBoardCanvas').then((module) => ({ default: module.GameBoard }))
      }
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    width: '100%',
    aspectRatio: 1000 / 760,
    backgroundColor: '#392315',
    borderRadius: 10,
  },
});
