/**
 * Pure game logic for Zip.
 *
 * Everything in this module is side-effect free so it can be unit-tested and
 * called from worklets if needed in the future.
 */

import type { CellPos, Puzzle, Wall } from './types';

const cellKey = (r: number, c: number) => `${r},${c}`;

export const samePos = (a: CellPos, b: CellPos): boolean =>
  a[0] === b[0] && a[1] === b[1];

export const inBounds = (size: number, r: number, c: number): boolean =>
  r >= 0 && r < size && c >= 0 && c < size;

export const areAdjacent = (a: CellPos, b: CellPos): boolean => {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  return dr + dc === 1;
};

/**
 * Build a fast lookup for walls. A wall between A and B is stored under both
 * directional keys so order doesn't matter at lookup time.
 */
export function buildWallSet(walls: readonly Wall[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!walls) return set;
  for (const w of walls) {
    set.add(`${cellKey(...w.a)}|${cellKey(...w.b)}`);
    set.add(`${cellKey(...w.b)}|${cellKey(...w.a)}`);
  }
  return set;
}

export const hasWallBetween = (
  wallSet: Set<string>,
  a: CellPos,
  b: CellPos,
): boolean => wallSet.has(`${cellKey(...a)}|${cellKey(...b)}`);

/**
 * Build a map from "row,col" → checkpoint value for O(1) lookup while drawing.
 */
export function buildCheckpointMap(
  puzzle: Puzzle,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const cp of puzzle.checkpoints) {
    map.set(cellKey(...cp.pos), cp.value);
  }
  return map;
}

/**
 * Returns true if the proposed extension from `head` to `next` is legal:
 *  - `next` is in bounds
 *  - `next` is orthogonally adjacent to `head`
 *  - there is no wall between `head` and `next`
 *  - `next` is not already on the path
 *  - if `next` is a checkpoint, its value matches the next expected number
 */
export function canExtendPath(args: {
  size: number;
  head: CellPos;
  next: CellPos;
  visited: Set<string>;
  wallSet: Set<string>;
  checkpoints: Map<string, number>;
  nextExpected: number | null;
}): boolean {
  const { size, head, next, visited, wallSet, checkpoints, nextExpected } = args;
  if (!inBounds(size, next[0], next[1])) return false;
  if (!areAdjacent(head, next)) return false;
  if (hasWallBetween(wallSet, head, next)) return false;
  if (visited.has(cellKey(...next))) return false;

  const cpValue = checkpoints.get(cellKey(...next));
  if (cpValue !== undefined && cpValue !== nextExpected) return false;

  return true;
}

/**
 * Determines the index of `cell` in `path`, or -1 if not present.
 * Used to decide whether a drag-over is a backtrack.
 */
export const indexOnPath = (path: readonly CellPos[], cell: CellPos): number => {
  for (let i = path.length - 1; i >= 0; i--) {
    if (samePos(path[i], cell)) return i;
  }
  return -1;
};

/**
 * Compute the next checkpoint value the path must hit, given the path so far.
 * Returns null when all checkpoints have been crossed.
 */
export function nextCheckpointValue(
  checkpointMap: ReadonlyMap<string, number>,
  checkpointCount: number,
  path: readonly CellPos[],
): number | null {
  let highest = 0;
  for (const p of path) {
    const v = checkpointMap.get(cellKey(...p));
    if (v !== undefined && v > highest) highest = v;
  }
  return highest >= checkpointCount ? null : highest + 1;
}

/**
 * Returns true when the path is a valid winning solution: every cell visited
 * exactly once, all checkpoints crossed in order, starting at "1" and ending
 * with the last numbered checkpoint having been hit.
 */
export function isWinningPath(puzzle: Puzzle, path: readonly CellPos[]): boolean {
  const total = puzzle.size * puzzle.size;
  if (path.length !== total) return false;

  // Adjacency / no-revisit / wall checks
  const wallSet = buildWallSet(puzzle.walls);
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const key = cellKey(...path[i]);
    if (seen.has(key)) return false;
    seen.add(key);
    if (i > 0) {
      if (!areAdjacent(path[i - 1], path[i])) return false;
      if (hasWallBetween(wallSet, path[i - 1], path[i])) return false;
    }
  }

  // Checkpoint order
  const cpMap = buildCheckpointMap(puzzle);
  let expected = 1;
  for (const p of path) {
    const v = cpMap.get(cellKey(...p));
    if (v !== undefined) {
      if (v !== expected) return false;
      expected += 1;
    }
  }
  return expected - 1 === puzzle.checkpoints.length;
}

/**
 * For the hint feature: returns one cell adjacent to the current head that
 * is a legal next move, preferring the direction of the next checkpoint.
 * Returns null if no legal extension exists.
 */
export function suggestHint(args: {
  puzzle: Puzzle;
  path: readonly CellPos[];
  visited: Set<string>;
  wallSet: Set<string>;
  checkpoints: Map<string, number>;
  nextExpected: number | null;
}): CellPos | null {
  const { puzzle, path, visited, wallSet, checkpoints, nextExpected } = args;
  if (path.length === 0) {
    const first = puzzle.checkpoints.find((c) => c.value === 1);
    return first ? first.pos : null;
  }
  const head = path[path.length - 1];
  const candidates: CellPos[] = [
    [head[0] - 1, head[1]],
    [head[0] + 1, head[1]],
    [head[0], head[1] - 1],
    [head[0], head[1] + 1],
  ];
  // Find target cell of next checkpoint to break ties
  let target: CellPos | null = null;
  if (nextExpected !== null) {
    const t = puzzle.checkpoints.find((c) => c.value === nextExpected);
    if (t) target = t.pos;
  }
  const legal = candidates.filter((next) =>
    canExtendPath({
      size: puzzle.size,
      head,
      next,
      visited,
      wallSet,
      checkpoints,
      nextExpected,
    }),
  );
  if (legal.length === 0) return null;
  if (!target) return legal[0];
  legal.sort(
    (a, b) =>
      Math.abs(a[0] - target![0]) + Math.abs(a[1] - target![1]) -
      (Math.abs(b[0] - target![0]) + Math.abs(b[1] - target![1])),
  );
  return legal[0];
}

export const posKey = cellKey;
