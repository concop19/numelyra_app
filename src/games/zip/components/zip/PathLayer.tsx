/**
 * PathLayer
 *
 * Draws the player's path as a series of small stamps at each visited cell
 * centre plus rectangular connectors between consecutive cells. The L-shape
 * at corners emerges naturally from the union of one horizontal and one
 * vertical connector meeting at the cell stamp — no shape gymnastics, and
 * crucially no over-fill that bleeds into diagonally-adjacent cells.
 *
 * Cell-centre stamps are rendered as circles (rounded squares of diameter
 * `thickness`) so the path's start and end caps are naturally rounded.
 *
 * Colour: each piece is tinted by interpolating between two anchor colours
 * across the column axis (red on the left, magenta on the right) — matching
 * the gradient on the LinkedIn Zip path.
 */

import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PATH_THICKNESS_FRACTION } from '@/game/layout';
import type { CellPos, Puzzle } from '@/game/types';

interface PathLayerProps {
  readonly path: readonly CellPos[];
  readonly cellSize: number;
  readonly puzzleSize: Puzzle['size'];
  /** Thickness of the path as a fraction of cellSize. Defaults to the
   *  shared layout constant that keeps it equal to the checkpoint dot. */
  readonly thicknessFraction?: number;
}

function lerpColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  // #E94B26 → #C0388F (red-orange to magenta), matching the LinkedIn look.
  const r = Math.round(0xe9 + (0xc0 - 0xe9) * x);
  const g = Math.round(0x4b + (0x38 - 0x4b) * x);
  const b = Math.round(0x26 + (0x8f - 0x26) * x);
  return `rgb(${r},${g},${b})`;
}

function PathLayerInner({
  path,
  cellSize,
  puzzleSize,
  thicknessFraction = PATH_THICKNESS_FRACTION,
}: PathLayerProps) {
  const thickness = useMemo(
    () => cellSize * thicknessFraction,
    [cellSize, thicknessFraction],
  );
  const half = thickness / 2;
  const colsForLerp = Math.max(1, puzzleSize - 1);
  const segments = useMemo(() => path.slice(1), [path]);

  if (path.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, styles.root]}
    >
      {/* Connectors between consecutive cells. Length = cellSize, drawn from
          the centre of one cell to the centre of the next. */}
      {segments.map(([r, c], i) => {
        const [pr, pc] = path[i];
        const horizontal = pr === r;
        const minR = Math.min(pr, r);
        const minC = Math.min(pc, c);
        const avgCol = (pc + c) / 2;
        const color = lerpColor(avgCol / colsForLerp);

        const style = horizontal
          ? {
              left: minC * cellSize + cellSize / 2,
              top: minR * cellSize + cellSize / 2 - half,
              width: cellSize,
              height: thickness,
            }
          : {
              left: minC * cellSize + cellSize / 2 - half,
              top: minR * cellSize + cellSize / 2,
              width: thickness,
              height: cellSize,
            };

        return (
          <Animated.View
            key={`seg-${pr}-${pc}-${r}-${c}`}
            entering={FadeIn.duration(110)}
            style={[styles.piece, { backgroundColor: color }, style]}
          />
        );
      })}

      {/* Round stamp at each visited cell centre — covers the inner corner
          where two connectors meet, and provides rounded caps at the path
          start and end. */}
      {path.map(([r, c], i) => {
        const cx = c * cellSize + cellSize / 2;
        const cy = r * cellSize + cellSize / 2;
        const color = lerpColor(c / colsForLerp);
        return (
          <Animated.View
            key={`stamp-${r}-${c}-${i}`}
            entering={FadeIn.duration(110)}
            exiting={FadeOut.duration(70)}
            style={[
              styles.piece,
              {
                left: cx - half,
                top: cy - half,
                width: thickness,
                height: thickness,
                borderRadius: half,
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  piece: {
    position: 'absolute',
  },
});

export const PathLayer = memo(PathLayerInner);
