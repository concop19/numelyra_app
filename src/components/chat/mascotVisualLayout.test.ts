import {
  DEFAULT_MASCOT_VISIBLE_HEIGHT_RATIO,
  MASCOT_VISUAL_ASSETS,
  resolveMascotVisualLayout,
} from './mascotVisualLayout';

const ALL_ASSETS = Object.values(MASCOT_VISUAL_ASSETS);

describe('mascot visual layout', () => {
  it('contains measured profiles for all 16 bundled mascot WebPs', () => {
    expect(ALL_ASSETS).toHaveLength(16);
  });

  it.each(ALL_ASSETS.map((asset, index) => [index, asset] as const))(
    'anchors asset %s to the shared center and baseline',
    (_, asset) => {
      const stageSize = 175;
      const layout = resolveMascotVisualLayout(asset, {
        stageSize,
        maxVisualWidth: 1_000,
      });

      expect(layout.visibleCenterX).toBeCloseTo(stageSize / 2, 5);
      expect(layout.visibleBottom).toBeCloseTo(layout.baselineY, 5);
      expect(layout.visibleHeight).toBeCloseTo(
        stageSize * DEFAULT_MASCOT_VISIBLE_HEIGHT_RATIO,
        5
      );
      expect(layout.width / layout.height).toBeCloseTo(
        asset.canvasWidth / asset.canvasHeight,
        5
      );
    }
  );

  it.each(ALL_ASSETS.map((asset, index) => [index, asset] as const))(
    'keeps asset %s inside the responsive visible-width limit',
    (_, asset) => {
      const maxVisualWidth = 216;
      const layout = resolveMascotVisualLayout(asset, {
        stageSize: 175,
        maxVisualWidth,
      });

      expect(layout.visibleWidth).toBeLessThanOrEqual(maxVisualWidth + 0.001);
      expect(layout.visibleBottom).toBeCloseTo(layout.baselineY, 5);
    }
  );

  it.each([
    ['football', MASCOT_VISUAL_ASSETS.footballIdle, MASCOT_VISUAL_ASSETS.footballAction],
    ['school', MASCOT_VISUAL_ASSETS.schoolIdle, MASCOT_VISUAL_ASSETS.schoolAction],
    ['wallet', MASCOT_VISUAL_ASSETS.walletIdle, MASCOT_VISUAL_ASSETS.walletAction],
    ['suit', MASCOT_VISUAL_ASSETS.suitIdle, MASCOT_VISUAL_ASSETS.suitAction],
  ])('does not move the baseline across the %s idle/action transition', (_, idle, action) => {
    const options = { stageSize: 175, maxVisualWidth: 300 };
    const idleLayout = resolveMascotVisualLayout(idle, options);
    const actionLayout = resolveMascotVisualLayout(action, options);

    expect(idleLayout.visibleBottom).toBeCloseTo(actionLayout.visibleBottom, 5);
    expect(idleLayout.visibleCenterX).toBeCloseTo(actionLayout.visibleCenterX, 5);
    expect(idleLayout.visibleHeight).toBeCloseTo(actionLayout.visibleHeight, 5);
  });
});

