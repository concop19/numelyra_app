import type { ImageSourcePropType } from 'react-native';

export type MascotVisibleBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MascotVisualAsset = {
  source: ImageSourcePropType;
  canvasWidth: number;
  canvasHeight: number;
  visibleBounds: MascotVisibleBounds;
  /** Pixel coordinate in the source canvas that should sit on the stage anchor. */
  anchorX: number;
  /** Pixel coordinate in the source canvas that should sit on the stage baseline. */
  anchorY: number;
  visualScale?: number;
};

export type MascotVisualLayoutOptions = {
  stageSize: number;
  maxVisualWidth?: number;
  visibleHeightRatio?: number;
  baselineRatio?: number;
};

export type MascotVisualLayout = {
  width: number;
  height: number;
  left: number;
  top: number;
  scale: number;
  baselineY: number;
  visibleWidth: number;
  visibleHeight: number;
  visibleCenterX: number;
  visibleBottom: number;
};

export const DEFAULT_MASCOT_VISIBLE_HEIGHT_RATIO = 0.8;
export const DEFAULT_MASCOT_BASELINE_RATIO = 0.9;

/**
 * Sizes an animation from its visible pixels, then pins its authored anchor to
 * one shared stage baseline. This avoids the apparent jumps caused by fitting
 * differently shaped WebP canvases into the same square image view.
 */
export function resolveMascotVisualLayout(
  asset: MascotVisualAsset,
  options: MascotVisualLayoutOptions
): MascotVisualLayout {
  const {
    stageSize,
    maxVisualWidth,
    visibleHeightRatio = DEFAULT_MASCOT_VISIBLE_HEIGHT_RATIO,
    baselineRatio = DEFAULT_MASCOT_BASELINE_RATIO,
  } = options;

  if (stageSize <= 0) throw new Error('stageSize must be greater than zero');
  if (asset.canvasWidth <= 0 || asset.canvasHeight <= 0) {
    throw new Error('Mascot canvas dimensions must be greater than zero');
  }
  if (asset.visibleBounds.width <= 0 || asset.visibleBounds.height <= 0) {
    throw new Error('Mascot visible bounds must be greater than zero');
  }

  const requestedVisibleHeight = stageSize
    * visibleHeightRatio
    * (asset.visualScale ?? 1);
  let scale = requestedVisibleHeight / asset.visibleBounds.height;

  if (maxVisualWidth !== undefined && maxVisualWidth > 0) {
    scale = Math.min(scale, maxVisualWidth / asset.visibleBounds.width);
  }

  const baselineY = stageSize * baselineRatio;
  const left = (stageSize / 2) - (asset.anchorX * scale);
  const top = baselineY - (asset.anchorY * scale);

  return {
    width: asset.canvasWidth * scale,
    height: asset.canvasHeight * scale,
    left,
    top,
    scale,
    baselineY,
    visibleWidth: asset.visibleBounds.width * scale,
    visibleHeight: asset.visibleBounds.height * scale,
    visibleCenterX: left
      + ((asset.visibleBounds.x + (asset.visibleBounds.width / 2)) * scale),
    visibleBottom: top
      + ((asset.visibleBounds.y + asset.visibleBounds.height) * scale),
  };
}

function visualAsset(
  source: ImageSourcePropType,
  canvasWidth: number,
  canvasHeight: number,
  visibleBounds: MascotVisibleBounds,
  visualScale?: number
): MascotVisualAsset {
  return {
    source,
    canvasWidth,
    canvasHeight,
    visibleBounds,
    anchorX: visibleBounds.x + (visibleBounds.width / 2),
    anchorY: visibleBounds.y + visibleBounds.height,
    visualScale,
  };
}

/**
 * Canvas sizes and alpha-union bounds measured across every frame in each
 * bundled WebP. Keeping this data beside the layout function makes new assets
 * explicit and prevents a silent return to square, center-based fitting.
 */
export const MASCOT_VISUAL_ASSETS = {
  defaultIdle: visualAsset(
    require('../../../assets/char/result_Flame_character_sitting_peacefully_1080p_20261017202140_2_ (1)/idle_1.webp'),
    244,
    313,
    { x: 8, y: 8, width: 228, height: 297 }
  ),
  footballIdle: visualAsset(
    require('../../../assets/char/result_Flame_character_in_football_jersey_20261017202155/preview_3_idle.webp'),
    457,
    374,
    { x: 0, y: 0, width: 449, height: 366 }
  ),
  footballAction: visualAsset(
    require('../../../assets/char/preview copy 3.webp'),
    284,
    375,
    { x: 8, y: 0, width: 268, height: 367 }
  ),
  schoolIdle: visualAsset(
    require('../../../assets/char/result_Flame_character_breathing_idle_1080p_20261017202322/preview_5_idle.webp'),
    485,
    384,
    { x: 8, y: 4, width: 477, height: 380 }
  ),
  schoolAction: visualAsset(
    require('../../../assets/char/preview copy 5.webp'),
    682,
    384,
    { x: 0, y: 0, width: 682, height: 384 }
  ),
  walletIdle: visualAsset(
    require('../../../assets/char/result_Flame_character_holding_wallet_1080p_20261017202251/preview_7_idle.webp'),
    682,
    384,
    { x: 0, y: 0, width: 682, height: 384 }
  ),
  walletAction: visualAsset(
    require('../../../assets/char/preview copy 7.webp'),
    348,
    384,
    { x: 8, y: 0, width: 332, height: 384 }
  ),
  suitIdle: visualAsset(
    require('../../../assets/char/result_Flame_character_wearing_suit_sta__20261017202150/preview_10_idle.webp'),
    230,
    364,
    { x: 8, y: 8, width: 214, height: 348 }
  ),
  suitAction: visualAsset(
    require('../../../assets/char/preview copy 10.webp'),
    311,
    365,
    { x: 8, y: 8, width: 295, height: 349 }
  ),
  crying: visualAsset(
    require('../../../assets/char/preview.webp'),
    378,
    371,
    { x: 8, y: 8, width: 362, height: 363 }
  ),
  floorCrying: visualAsset(
    require('../../../assets/char/preview copy.webp'),
    527,
    380,
    { x: 8, y: 0, width: 511, height: 372 }
  ),
  shotgun: visualAsset(
    require('../../../assets/char/preview copy 2.webp'),
    292,
    377,
    { x: 8, y: 8, width: 276, height: 369 }
  ),
  melting: visualAsset(
    require('../../../assets/char/preview copy 4.webp'),
    398,
    345,
    { x: 8, y: 8, width: 382, height: 329 }
  ),
  phone: visualAsset(
    require('../../../assets/char/preview copy 6.webp'),
    613,
    384,
    { x: 0, y: 0, width: 605, height: 384 }
  ),
  tired: visualAsset(
    require('../../../assets/char/preview copy 8.webp'),
    318,
    384,
    { x: 8, y: 4, width: 302, height: 380 }
  ),
  party: visualAsset(
    require('../../../assets/char/preview copy 9.webp'),
    682,
    384,
    { x: 0, y: 0, width: 682, height: 384 }
  ),
} satisfies Record<string, MascotVisualAsset>;

