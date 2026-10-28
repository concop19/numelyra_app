import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * CanvasKit must be ready before App is imported because App's dependency
 * tree contains components that import React Native Skia.
 */
export async function prepareSkia(): Promise<void> {
  await LoadSkiaWeb({
    locateFile: () => '/canvaskit.wasm',
  });
}
