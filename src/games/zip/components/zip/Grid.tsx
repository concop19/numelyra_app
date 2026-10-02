/**
 * Grid
 *
 * Composes the static board (cell tiles) with the dynamic PathLayer and the
 * Checkpoint / Wall overlays, all under one Pan gesture detector.
 *
 * Layering, bottom up:
 *   1. Cell tiles            (dark tiles with golden grid borders)
 *   2. PathLayer             (the glowing snake the player draws)
 *   3. CheckpointLayer       (circular golden numbered badges, on top of path)
 *   4. WallLayer             (neon barrier bars between cells, on top of everything)
 *
 * The Pan gesture runs on the JS thread (`runOnJS(true)`) and a ref filters
 * out same-cell repeats so the state machine only sees one event per cell
 * crossing.
 */

import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { palette } from '../../game/colors';
import { posKey } from '../../game/logic';
import type { CellPos, Puzzle } from '../../game/types';

import { Cell } from './Cell';
import { CheckpointLayer, WallLayer } from './Overlays';
import { PathLayer } from './PathLayer';

interface GridProps {
  readonly puzzle: Puzzle;
  readonly path: readonly CellPos[];
  readonly hintCell: CellPos | null;
  readonly maxWidth: number;
  readonly disabled?: boolean;
  readonly onBegin: (cell: CellPos) => void;
  readonly onEnter: (cell: CellPos) => void;
}

export function Grid({
  puzzle,
  path,
  hintCell,
  maxWidth,
  disabled,
  onBegin,
  onEnter,
}: GridProps) {
  const { size } = puzzle;
  const cellSize = Math.floor(maxWidth / size);
  const boardSize = cellSize * size;

  const checkpointMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cp of puzzle.checkpoints) map.set(posKey(...cp.pos), cp.value);
    return map;
  }, [puzzle.checkpoints]);

  const cellRows = useMemo(
    () =>
      Array.from({ length: size }, (_, r) => (
        <View key={`row-${r}`} style={styles.row}>
          {Array.from({ length: size }, (_, c) => (
            <Cell key={`cell-${r}-${c}`} size={cellSize} />
          ))}
        </View>
      )),
    [cellSize, size],
  );

  const reachedCheckpoints = useMemo(() => {
    const set = new Set<number>();
    for (const p of path) {
      const v = checkpointMap.get(posKey(...p));
      if (v !== undefined) set.add(v);
    }
    return set;
  }, [checkpointMap, path]);

  const lastCellRef = useRef<string | null>(null);

  const cellAt = useCallback(
    (x: number, y: number): CellPos | null => {
      if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return null;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r < 0 || r >= size || c < 0 || c >= size) return null;
      return [r, c];
    },
    [boardSize, cellSize, size],
  );

  const handleBegin = useCallback(
    (x: number, y: number) => {
      const cell = cellAt(x, y);
      if (!cell) return;
      lastCellRef.current = posKey(...cell);
      onBegin(cell);
    },
    [cellAt, onBegin],
  );

  const handleUpdate = useCallback(
    (x: number, y: number) => {
      const cell = cellAt(x, y);
      if (!cell) return;
      const key = posKey(...cell);
      if (lastCellRef.current === key) return;
      lastCellRef.current = key;
      onEnter(cell);
    },
    [cellAt, onEnter],
  );

  const handleEnd = useCallback(() => {
    lastCellRef.current = null;
  }, []);

  const pan = useMemo(
    () => {
      const gesture = Gesture.Pan()
        .enabled(!disabled)
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => handleBegin(e.x, e.y))
        .onUpdate((e) => handleUpdate(e.x, e.y))
        .onEnd(handleEnd)
        .onFinalize(handleEnd);
      return gesture;
    },
    [disabled, handleBegin, handleUpdate, handleEnd],
  );

  const hintKey = hintCell ? posKey(...hintCell) : null;

  return (
    <GestureDetector gesture={pan}>
      <View
        collapsable={false}
        style={[
          styles.board,
          { width: boardSize, height: boardSize },
        ]}
      >
        {/* Cell tiles with crisp golden borders */}
        {cellRows}

        {hintKey && (
          <View
            pointerEvents="none"
            style={[
              styles.hintWash,
              {
                width: cellSize,
                height: cellSize,
                left: hintCell![1] * cellSize,
                top: hintCell![0] * cellSize,
              },
            ]}
          />
        )}

        {/* The continuous rounded snake path */}
        <PathLayer
          path={path}
          cellSize={cellSize}
          puzzleSize={puzzle.size}
        />

        {/* Numbered circular checkpoints */}
        <CheckpointLayer
          checkpoints={puzzle.checkpoints}
          cellSize={cellSize}
          hitValues={reachedCheckpoints}
        />

        {/* Walls — barriers between cells */}
        {puzzle.walls && puzzle.walls.length > 0 && (
          <WallLayer walls={puzzle.walls} cellSize={cellSize} />
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: palette.cellEmpty,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.borderStrong,
    shadowColor: palette.borderStrong,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
  },
  hintWash: {
    position: 'absolute',
    backgroundColor: palette.cellHintWash,
    borderWidth: 2,
    borderColor: '#FFD54F',
    borderRadius: 4,
  },
});
