/**
 * Procedural puzzle generator.
 *
 * Pipeline:
 *   1. Generate a Hamiltonian path on the N×N grid via randomised
 *      Warnsdorff DFS (prefer next cells with the fewest unvisited
 *      neighbours; break ties with a seeded RNG).
 *   2. Pick 8–12 evenly-spaced indices along the path with random jitter.
 *      Index 0 always becomes "1", the last index always becomes the
 *      final number. The intermediate indices fill in 2..N−1.
 *   3. Wrap the result as a `Puzzle`.
 *
 * Determinism: a given (seed, size, checkpointCount) tuple always produces
 * the same puzzle, so progress records keyed by puzzle id stay valid across
 * app restarts. If the first DFS attempt fails (very rare for these grid
 * sizes with Warnsdorff ordering), the generator retries with a derived
 * sub-seed up to `MAX_ATTEMPTS` times before throwing.
 */

import type { CellPos, Checkpoint, Puzzle, Wall } from './types';

type RNG = () => number;

const MAX_ATTEMPTS = 200;

const DIRS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Small, fast, seedable PRNG. Stable across JS engines. */
export function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Find a Hamiltonian path on an N×N grid starting from a random cell,
 * using DFS with Warnsdorff ordering. Returns null if no path is found.
 */
export function generateHamiltonianPath(
  size: number,
  rng: RNG,
): CellPos[] | null {
  const N = size;
  const total = N * N;
  const idx = (r: number, c: number) => r * N + c;
  const inB = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

  const visited = new Uint8Array(total);
  const path: CellPos[] = [];

  // Count *current* unvisited neighbours of (nr, nc) — not counting the
  // cell we're about to leave, since after the move it'll be visited.
  function unvisitedDegree(nr: number, nc: number): number {
    let n = 0;
    for (const [dr, dc] of DIRS) {
      const r = nr + dr;
      const c = nc + dc;
      if (inB(r, c) && !visited[idx(r, c)]) n++;
    }
    return n;
  }

  function dfs(r: number, c: number): boolean {
    visited[idx(r, c)] = 1;
    path.push([r, c]);
    if (path.length === total) return true;

    const candidates: [number, number, number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (inB(nr, nc) && !visited[idx(nr, nc)]) {
        candidates.push([nr, nc, unvisitedDegree(nr, nc) - 1, rng()]);
      }
    }
    if (candidates.length === 0) {
      visited[idx(r, c)] = 0;
      path.pop();
      return false;
    }
    // Warnsdorff: lowest forward-degree first; random tie-break.
    candidates.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
    for (const [nr, nc] of candidates) {
      if (dfs(nr, nc)) return true;
    }
    visited[idx(r, c)] = 0;
    path.pop();
    return false;
  }

  const startR = Math.floor(rng() * N);
  const startC = Math.floor(rng() * N);
  return dfs(startR, startC) ? [...path] : null;
}

/**
 * Pick `count` indices along a path of length `pathLen`, evenly spaced with
 * jitter, always including the first and last index. Returns indices in
 * ascending order. Distinct values guaranteed.
 */
export function pickCheckpointIndices(
  pathLen: number,
  count: number,
  rng: RNG,
): number[] {
  if (count <= 1) return [0];
  if (count >= pathLen) return Array.from({ length: pathLen }, (_, i) => i);

  const indices = new Set<number>([0, pathLen - 1]);
  const segments = count - 1;
  const segLen = (pathLen - 1) / segments;

  for (let i = 1; i < segments; i++) {
    const center = i * segLen;
    const jitter = (rng() - 0.5) * segLen * 0.6;
    let chosen = Math.round(center + jitter);
    if (chosen <= 0) chosen = 1;
    if (chosen >= pathLen - 1) chosen = pathLen - 2;
    let direction = rng() < 0.5 ? -1 : 1;
    while (indices.has(chosen)) {
      chosen += direction;
      if (chosen <= 0 || chosen >= pathLen - 1) {
        direction = -direction;
        chosen += direction * 2;
      }
    }
    indices.add(chosen);
  }
  return [...indices].sort((a, b) => a - b);
}

/**
 * Pick `count` walls to place on edges that the reference path does *not*
 * traverse. Doing so guarantees the generated puzzle remains solvable via
 * the path the generator already produced. Returns fewer walls than asked
 * for if the grid runs out of non-path edges.
 */
export function generateWalls(
  size: number,
  path: readonly CellPos[],
  count: number,
  rng: RNG,
): Wall[] {
  const canon = (a: CellPos, b: CellPos): readonly [CellPos, CellPos] =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  const edgeKey = (a: CellPos, b: CellPos): string => {
    const [x, y] = canon(a, b);
    return `${x[0]},${x[1]}|${y[0]},${y[1]}`;
  };

  const pathEdges = new Set<string>();
  for (let i = 1; i < path.length; i++) {
    pathEdges.add(edgeKey(path[i - 1], path[i]));
  }

  const candidates: Wall[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r + 1 < size) {
        const a: CellPos = [r, c];
        const b: CellPos = [r + 1, c];
        if (!pathEdges.has(edgeKey(a, b))) candidates.push({ a, b });
      }
      if (c + 1 < size) {
        const a: CellPos = [r, c];
        const b: CellPos = [r, c + 1];
        if (!pathEdges.has(edgeKey(a, b))) candidates.push({ a, b });
      }
    }
  }

  // Fisher–Yates shuffle so the choice depends on `rng`.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(count, candidates.length));
}

interface GeneratePuzzleArgs {
  readonly id: string;
  readonly name: string;
  readonly difficulty: Puzzle['difficulty'];
  readonly size: number;
  readonly checkpointCount: number;
  /** How many walls to add. Defaults to 0. */
  readonly wallCount?: number;
  readonly seed: number;
}

/**
 * Build a complete Puzzle deterministically from `seed`. Retries with a
 * derived sub-seed if the path generator fails (rare for sizes ≤ 8).
 */
export function generatePuzzle(args: GeneratePuzzleArgs): Puzzle {
  const { size, checkpointCount, seed } = args;

  let path: CellPos[] | null = null;
  let resolvedSeed = seed;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const subSeed = (seed ^ (attempt * 0x9e3779b1)) >>> 0;
    const rng = mulberry32(subSeed);
    path = generateHamiltonianPath(size, rng);
    if (path) {
      resolvedSeed = subSeed;
      break;
    }
  }

  if (!path) {
    throw new Error(
      `generatePuzzle: no Hamiltonian path for seed=${seed} size=${size}`,
    );
  }

  const cpRng = mulberry32((resolvedSeed * 0x85ebca6b) >>> 0);
  const indices = pickCheckpointIndices(path.length, checkpointCount, cpRng);
  const checkpoints: Checkpoint[] = indices.map((i, n) => ({
    pos: path![i],
    value: n + 1,
  }));

  const wallRng = mulberry32((resolvedSeed * 0xc2b2ae35) >>> 0);
  const walls =
    args.wallCount && args.wallCount > 0
      ? generateWalls(args.size, path, args.wallCount, wallRng)
      : undefined;

  return {
    id: args.id,
    name: args.name,
    difficulty: args.difficulty,
    size: args.size,
    checkpoints,
    walls,
    solution: path,
  };
}
