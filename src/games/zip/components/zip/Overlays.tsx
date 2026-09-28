/**
 * Overlay layers rendered above the path: numbered checkpoint circles and
 * walls between cells. Both sit absolutely positioned inside the grid so
 * they layer correctly with `PathLayer`.
 */

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/game/colors';
import {
  CHECKPOINT_DOT_FRACTION,
  CHECKPOINT_FONT_FRACTION,
} from '@/game/layout';
import type { Checkpoint, Wall } from '@/game/types';

interface CheckpointLayerProps {
  readonly checkpoints: readonly Checkpoint[];
  readonly cellSize: number;
  readonly hitValues: ReadonlySet<number>;
}

function CheckpointLayerInner({
  checkpoints,
  cellSize,
  hitValues,
}: CheckpointLayerProps) {
  // Compact dots — slightly under half the cell width so they read as
  // markers rather than dominating the tile. Path thickness (PathLayer)
  // is locked to this same fraction via the shared layout module.
  const dotSize = cellSize * CHECKPOINT_DOT_FRACTION;
  const fontSize = dotSize * CHECKPOINT_FONT_FRACTION;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {checkpoints.map(({ pos: [r, c], value }) => {
        const hit = hitValues.has(value);
        const dotLeft = c * cellSize + (cellSize - dotSize) / 2;
        const dotTop = r * cellSize + (cellSize - dotSize) / 2;
        return (
          <View
            key={`cp-${value}`}
            style={[
              styles.dot,
              {
                left: dotLeft,
                top: dotTop,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: hit
                  ? palette.checkpointFillHit
                  : palette.checkpointFill,
              },
            ]}
          >
            <Text
              style={[
                styles.dotText,
                {
                  fontSize,
                  color: hit
                    ? palette.checkpointTextHit
                    : palette.checkpointText,
                },
              ]}
            >
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface WallLayerProps {
  readonly walls: readonly Wall[];
  readonly cellSize: number;
}

function WallLayerInner({ walls, cellSize }: WallLayerProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {walls.map((w, i) => {
        const [r1, c1] = w.a;
        const [r2, c2] = w.b;
        const horizontalSplit = r1 !== r2;

        if (horizontalSplit) {
          const r = Math.max(r1, r2);
          const c = c1;
          return (
            <View
              key={`wall-${i}`}
              style={[
                styles.wall,
                {
                  left: c * cellSize,
                  top: r * cellSize - 2,
                  width: cellSize,
                  height: 4,
                },
              ]}
            />
          );
        }
        const c = Math.max(c1, c2);
        const r = r1;
        return (
          <View
            key={`wall-${i}`}
            style={[
              styles.wall,
              {
                left: c * cellSize - 2,
                top: r * cellSize,
                width: 4,
                height: cellSize,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  dotText: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlign: 'center',
  },
  wall: {
    position: 'absolute',
    backgroundColor: palette.wall,
    borderRadius: 2,
  },
});

export const CheckpointLayer = memo(CheckpointLayerInner);
export const WallLayer = memo(WallLayerInner);
