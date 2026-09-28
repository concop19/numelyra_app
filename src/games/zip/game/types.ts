/**
 * Core types for the Zip puzzle game.
 *
 * A puzzle is a square grid where the player must draw ONE continuous path
 * that visits every cell exactly once and crosses the numbered cells in
 * sequential order (1 → 2 → ... → N).
 */

export type CellPos = readonly [row: number, col: number];

/**
 * A wall blocks movement between two orthogonally adjacent cells.
 * `a` and `b` must differ by exactly one in row or column (not both).
 */
export interface Wall {
  readonly a: CellPos;
  readonly b: CellPos;
}

/**
 * A numbered checkpoint inside the grid. The path must hit `value=1` first,
 * then `value=2`, and so on, in order.
 */
export interface Checkpoint {
  readonly pos: CellPos;
  readonly value: number;
}

export interface Puzzle {
  readonly id: string;
  readonly name: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly size: number;
  readonly checkpoints: readonly Checkpoint[];
  readonly walls?: readonly Wall[];
  readonly solution: readonly CellPos[];
}

export interface GameStats {
  /** Cells visited (length of the path). */
  readonly visited: number;
  /** Total cells in the grid. */
  readonly total: number;
  /** Number of moves the player has made (extensions + backtracks). */
  readonly moves: number;
  /** Number of times the player moved backward or truncated the path. */
  readonly backtracks: number;
  /** Elapsed time in seconds. */
  readonly elapsedSec: number;
  /** Next checkpoint number the path must reach. */
  readonly nextCheckpoint: number | null;
}

export interface PersistedProgress {
  readonly completed: Record<
    string,
    { bestTimeSec: number; bestMoves: number; bestBacktracks: number }
  >;
  readonly streak: number;
  readonly lastDailyDate: string | null;
  readonly hasSeenTutorial: boolean;
}
