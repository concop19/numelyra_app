/**
 * useZipGame — single source of truth for an active puzzle session.
 *
 * Owns:
 *  - The current path (ordered list of cells)
 *  - Move/backtrack counters, elapsed timer
 *  - Win detection
 *  - Light haptic feedback on extend / backtrack / win
 *
 * Returns memoised setters for the touch layer.
 */

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildCheckpointMap,
  buildWallSet,
  canExtendPath,
  indexOnPath,
  isWinningPath,
  nextCheckpointValue,
  posKey,
  samePos,
  suggestHint,
} from '@/game/logic';
import type { CellPos, GameStats, Puzzle } from '@/game/types';

interface UseZipGameOptions {
  readonly puzzle: Puzzle;
  readonly hapticsEnabled?: boolean;
  readonly locked?: boolean;
  readonly initialState?: {
    path: readonly CellPos[];
    moves: number;
    backtracks: number;
    elapsedSec: number;
    isComplete: boolean;
  } | null;
  readonly onWin?: (stats: {
    timeSec: number;
    moves: number;
    backtracks: number;
  }) => void;
}

interface UseZipGameResult {
  readonly path: readonly CellPos[];
  readonly visited: ReadonlySet<string>;
  readonly stats: GameStats;
  readonly isComplete: boolean;
  readonly hintCell: CellPos | null;

  /** Begin a drag at `cell`. Truncates the path if `cell` is on it; starts a new path if cell == "1". */
  beginAt: (cell: CellPos) => boolean;
  /** Drag entered `cell` — extend or backtrack as appropriate. */
  enter: (cell: CellPos) => void;
  /** Pop the last segment off the path. */
  undo: () => void;
  /** Clear the path entirely but keep the active run's timer and stats. */
  reset: () => void;
  /** Start a completely fresh session. */
  restart: () => void;
  /** Compute and flash a one-step hint. */
  hint: () => void;
}

export function useZipGame(opts: UseZipGameOptions): UseZipGameResult {
  const {
    puzzle,
    hapticsEnabled = true,
    locked = false,
    initialState = null,
    onWin,
  } = opts;

  const [path, setPath] = useState<readonly CellPos[]>(initialState?.path ?? []);
  const [moves, setMoves] = useState(initialState?.moves ?? 0);
  const [backtracks, setBacktracks] = useState(initialState?.backtracks ?? 0);
  const [elapsedSec, setElapsedSec] = useState(initialState?.elapsedSec ?? 0);
  const [hintCell, setHintCell] = useState<CellPos | null>(null);
  const [isComplete, setIsComplete] = useState(initialState?.isComplete ?? false);

  const startedAtRef = useRef<number | null>(null);
  const winFiredRef = useRef(false);

  // Derived caches that don't change unless the puzzle does.
  const wallSet = useMemo(() => buildWallSet(puzzle.walls), [puzzle.walls]);
  const checkpoints = useMemo(() => buildCheckpointMap(puzzle), [puzzle.checkpoints]);

  const visited = useMemo(() => {
    const s = new Set<string>();
    for (const p of path) s.add(posKey(...p));
    return s;
  }, [path]);

  const nextExpected = useMemo(
    () => nextCheckpointValue(checkpoints, puzzle.checkpoints.length, path),
    [checkpoints, puzzle.checkpoints.length, path],
  );

  const haptic = useCallback(
    (style: Haptics.ImpactFeedbackStyle | 'success') => {
      if (!hapticsEnabled) return;
      if (style === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {},
        );
      } else {
        Haptics.impactAsync(style).catch(() => {});
      }
    },
    [hapticsEnabled],
  );

  // Start the timer the moment the first cell is committed.
  useEffect(() => {
    if (path.length === 0 || startedAtRef.current === null || isComplete) return;
    const id = setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [path.length, isComplete]);

  const ensureTimerStarted = useCallback(() => {
    if (locked) return;
    if (startedAtRef.current !== null) return;
    startedAtRef.current = Date.now();
    setElapsedSec(0);
  }, [locked]);

  const resetSession = useCallback(() => {
    setPath(initialState?.path ?? []);
    setMoves(initialState?.moves ?? 0);
    setBacktracks(initialState?.backtracks ?? 0);
    setElapsedSec(initialState?.elapsedSec ?? 0);
    setHintCell(null);
    setIsComplete(initialState?.isComplete ?? false);
    startedAtRef.current =
      initialState && !initialState.isComplete && initialState.path.length > 0
        ? Date.now() - initialState.elapsedSec * 1000
        : null;
    winFiredRef.current = initialState?.isComplete ?? false;
  }, [initialState]);

  const registerBacktrack = useCallback(() => {
    setMoves((m) => m + 1);
    setBacktracks((count) => count + 1);
  }, []);

  // Win detection — only fire once per session.
  useEffect(() => {
    if (winFiredRef.current) return;
    if (path.length !== puzzle.size * puzzle.size) return;
    if (!isWinningPath(puzzle, path)) return;

    winFiredRef.current = true;
    setIsComplete(true);
    haptic('success');
    const finalTime =
      startedAtRef.current !== null
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : elapsedSec;
    setElapsedSec(finalTime);
    onWin?.({ timeSec: finalTime, moves, backtracks });
  }, [path, puzzle, haptic, onWin, moves, backtracks, elapsedSec]);

  // Reset session whenever the puzzle changes.
  useEffect(() => {
    resetSession();
  }, [puzzle.id, resetSession]);

  const beginAt = useCallback(
    (cell: CellPos): boolean => {
      if (isComplete || locked) return false;
      // If empty, only "1" can start the path.
      if (path.length === 0) {
        const cpValue = checkpoints.get(posKey(...cell));
        if (cpValue !== 1) return false;
        ensureTimerStarted();
        setPath([cell]);
        setMoves((m) => m + 1);
        haptic(Haptics.ImpactFeedbackStyle.Light);
        setHintCell(null);
        return true;
      }
      // If cell is already on the path, truncate to it.
      const idx = indexOnPath(path, cell);
      if (idx >= 0) {
        if (idx < path.length - 1) {
          setPath(path.slice(0, idx + 1));
          registerBacktrack();
          haptic(Haptics.ImpactFeedbackStyle.Light);
        }
        setHintCell(null);
        return true;
      }
      // Otherwise, only allow if cell is a legal extension from current head.
      const head = path[path.length - 1];
      if (
        canExtendPath({
          size: puzzle.size,
          head,
          next: cell,
          visited,
          wallSet,
          checkpoints,
          nextExpected,
        })
      ) {
        ensureTimerStarted();
        setPath([...path, cell]);
        setMoves((m) => m + 1);
        haptic(Haptics.ImpactFeedbackStyle.Light);
        setHintCell(null);
        return true;
      }
      return false;
    },
    [
      isComplete,
      locked,
      path,
      checkpoints,
      visited,
      wallSet,
      puzzle.size,
      nextExpected,
      haptic,
      ensureTimerStarted,
      registerBacktrack,
    ],
  );

  const enter = useCallback(
    (cell: CellPos) => {
      if (isComplete || locked) return;
      if (path.length === 0) {
        // Try to start at "1".
        const cpValue = checkpoints.get(posKey(...cell));
        if (cpValue === 1) {
          ensureTimerStarted();
          setPath([cell]);
          setMoves((m) => m + 1);
          haptic(Haptics.ImpactFeedbackStyle.Light);
          setHintCell(null);
        }
        return;
      }
      const head = path[path.length - 1];
      if (samePos(head, cell)) return;

      // Backtrack: dragging onto the cell just before the head pops the head.
      // Dragging onto a much earlier cell truncates the path to that cell.
      const idx = indexOnPath(path, cell);
      if (idx >= 0) {
        if (idx < path.length - 1) {
          setPath(path.slice(0, idx + 1));
          registerBacktrack();
          haptic(Haptics.ImpactFeedbackStyle.Light);
          setHintCell(null);
        }
        return;
      }

      if (
        canExtendPath({
          size: puzzle.size,
          head,
          next: cell,
          visited,
          wallSet,
          checkpoints,
          nextExpected,
        })
      ) {
        ensureTimerStarted();
        setPath([...path, cell]);
        setMoves((m) => m + 1);
        const cpValue = checkpoints.get(posKey(...cell));
        haptic(
          cpValue !== undefined
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
        setHintCell(null);
      }
    },
    [
      isComplete,
      locked,
      path,
      checkpoints,
      visited,
      wallSet,
      puzzle.size,
      nextExpected,
      haptic,
      ensureTimerStarted,
      registerBacktrack,
    ],
  );

  const undo = useCallback(() => {
    if (isComplete || locked) return;
    if (path.length === 0) return;
    setPath(path.slice(0, -1));
    registerBacktrack();
    haptic(Haptics.ImpactFeedbackStyle.Light);
    setHintCell(null);
  }, [isComplete, locked, path, haptic, registerBacktrack]);

  const reset = useCallback(() => {
    if (locked) return;
    setPath([]);
    setHintCell(null);
    setIsComplete(false);
    winFiredRef.current = false;
    haptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [haptic, locked]);

  const restart = useCallback(() => {
    if (locked) return;
    resetSession();
    haptic(Haptics.ImpactFeedbackStyle.Medium);
  }, [haptic, locked, resetSession]);

  const hint = useCallback(() => {
    if (locked) return;
    const cell = suggestHint({
      puzzle,
      path,
      visited,
      wallSet,
      checkpoints,
      nextExpected,
    });
    setHintCell(cell);
    haptic(Haptics.ImpactFeedbackStyle.Light);
    if (cell) {
      // Auto-clear after a moment so it doesn't linger.
      const id = setTimeout(() => setHintCell(null), 1600);
      return () => clearTimeout(id);
    }
  }, [locked, puzzle, path, visited, wallSet, checkpoints, nextExpected, haptic]);

  const stats: GameStats = useMemo(
    () => ({
      visited: path.length,
      total: puzzle.size * puzzle.size,
      moves,
      backtracks,
      elapsedSec,
      nextCheckpoint: nextExpected,
    }),
    [path.length, puzzle.size, moves, backtracks, elapsedSec, nextExpected],
  );

  return {
    path,
    visited,
    stats,
    isComplete,
    hintCell,
    beginAt,
    enter,
    undo,
    reset,
    restart,
    hint,
  };
}
