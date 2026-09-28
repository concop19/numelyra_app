import {
  generatePuzzle,
  mulberry32,
  pickCheckpointIndices,
} from './generator';
import { buildCheckpointMap, buildWallSet, hasWallBetween, isWinningPath } from './logic';
import { getDailyPuzzle, PUZZLES } from './puzzles';
import type { CellPos, Puzzle } from './types';

function uniqueCellCount(path: readonly CellPos[]): number {
  return new Set(path.map(([r, c]) => `${r},${c}`)).size;
}

function countTurns(path: readonly CellPos[]): number {
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const [ar, ac] = path[i - 2];
    const [br, bc] = path[i - 1];
    const [cr, cc] = path[i];
    const dir1: CellPos = [br - ar, bc - ac];
    const dir2: CellPos = [cr - br, cc - bc];
    if (dir1[0] !== dir2[0] || dir1[1] !== dir2[1]) turns += 1;
  }
  return turns;
}

function checkpointIndices(puzzle: Puzzle): number[] {
  const byCell = buildCheckpointMap(puzzle);
  return puzzle.solution.flatMap((cell, index) =>
    byCell.has(`${cell[0]},${cell[1]}`) ? [index] : [],
  );
}

function checkpointQuartiles(puzzle: Puzzle): Set<number> {
  const total = puzzle.solution.length;
  return new Set(
    checkpointIndices(puzzle).map((index) =>
      Math.min(3, Math.floor((index / total) * 4)),
    ),
  );
}

describe('pickCheckpointIndices', () => {
  it('keeps checkpoints sorted, unique, and spread from start to end', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const indices = pickCheckpointIndices(49, 10, mulberry32(seed));
      expect(indices[0]).toBe(0);
      expect(indices.at(-1)).toBe(48);
      expect(new Set(indices).size).toBe(indices.length);
      expect(indices).toEqual([...indices].sort((a, b) => a - b));

      const gaps = indices.slice(1).map((value, i) => value - indices[i]);
      expect(Math.max(...gaps)).toBeLessThanOrEqual(12);
      expect(gaps.filter((gap) => gap >= 3).length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('generatePuzzle', () => {
  it('is deterministic for the same config', () => {
    const args = {
      id: 'repeatable',
      name: 'Repeatable',
      difficulty: 'medium' as const,
      size: 6,
      checkpointCount: 9,
      wallCount: 2,
      seed: 20260510,
    };

    expect(generatePuzzle(args)).toEqual(generatePuzzle(args));
  });

  it('always returns a valid winning solution for representative seeds', () => {
    const samples = [
      { size: 5, checkpointCount: 8, wallCount: 1, seed: 1001, difficulty: 'easy' as const },
      { size: 6, checkpointCount: 9, wallCount: 2, seed: 2003, difficulty: 'medium' as const },
      { size: 7, checkpointCount: 10, wallCount: 2, seed: 3001, difficulty: 'hard' as const },
      { size: 8, checkpointCount: 11, wallCount: 3, seed: 4119, difficulty: 'hard' as const },
    ];

    for (const sample of samples) {
      const puzzle = generatePuzzle({
        id: `sample-${sample.size}-${sample.seed}`,
        name: 'Sample',
        difficulty: sample.difficulty,
        size: sample.size,
        checkpointCount: sample.checkpointCount,
        wallCount: sample.wallCount,
        seed: sample.seed,
      });

      expect(puzzle.solution).toHaveLength(sample.size * sample.size);
      expect(uniqueCellCount(puzzle.solution)).toBe(sample.size * sample.size);
      expect(isWinningPath(puzzle, puzzle.solution)).toBe(true);
    }
  });

  it('places checkpoints in solution order and walls off the solution path', () => {
    for (const puzzle of PUZZLES) {
      const cpIndices = checkpointIndices(puzzle);
      expect(cpIndices[0]).toBe(0);
      expect(cpIndices.at(-1)).toBe(puzzle.solution.length - 1);
      expect(cpIndices).toEqual([...cpIndices].sort((a, b) => a - b));
      expect(checkpointQuartiles(puzzle).size).toBe(4);

      const wallSet = buildWallSet(puzzle.walls);
      for (let i = 1; i < puzzle.solution.length; i += 1) {
        expect(
          hasWallBetween(wallSet, puzzle.solution[i - 1], puzzle.solution[i]),
        ).toBe(false);
      }
    }
  });

  it('keeps generated puzzles varied enough to feel intentional', () => {
    for (const puzzle of [...PUZZLES, getDailyPuzzle(new Date('2026-05-10'))]) {
      expect(countTurns(puzzle.solution)).toBeGreaterThanOrEqual(puzzle.size);
      expect(new Set(puzzle.checkpoints.map((cp) => cp.pos[0])).size).toBeGreaterThan(1);
      expect(new Set(puzzle.checkpoints.map((cp) => cp.pos[1])).size).toBeGreaterThan(1);
    }
  });

  it('keeps daily puzzles deterministic for a fixed date', () => {
    const date = new Date('2026-05-10T12:00:00Z');
    expect(getDailyPuzzle(date)).toEqual(getDailyPuzzle(date));
  });
});
