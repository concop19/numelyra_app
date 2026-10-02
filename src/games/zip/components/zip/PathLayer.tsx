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
 * Colour: vibrant glowing flame/gold gradient matching the dark board aesthetic.
 */

import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PATH_THICKNESS_FRACTION } from '../../game/layout';
import type { CellPos, Puzzle } from '../../game/types';

interface PathLayerProps {
  readonly path: readonly CellPos[];
  readonly cellSize: number;
  readonly puzzleSize: Puzzle['size'];
  readonly thicknessFraction?: number;
}

function lerpColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  // #FF3D00 (fiery orange-red) → #FFB800 (radiant gold)
  const r = 255;
  const g = Math.round(61 + (184 - 61) * x);
  const b = Math.round(0 + (10 - 0) * x);
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
      style={[StyleSheet.absoluteFill, styles.root]}
    >
      {/* Connectors between consecutive cells */}
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
            entering={FadeIn.duration(90)}
            style={[
              styles.piece,
              {
                backgroundColor: color,
                shadowColor: color,
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 3,
              },
              style,
            ]}
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
            entering={FadeIn.duration(90)}
            exiting={FadeOut.duration(60)}
            style={[
              styles.piece,
              {
                left: cx - half,
                top: cy - half,
                width: thickness,
                height: thickness,
                borderRadius: half,
                backgroundColor: color,
                shadowColor: color,
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 3,
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
