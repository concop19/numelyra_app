import { generatePuzzle } from './generator';
import {
  buildCheckpointMap,
  buildWallSet,
  canExtendPath,
  isWinningPath,
  nextCheckpointValue,
  suggestHint,
} from './logic';

const puzzle = generatePuzzle({
  id: 'logic-suite',
  name: 'Logic Suite',
  difficulty: 'medium',
  size: 6,
  checkpointCount: 9,
  wallCount: 2,
  seed: 4242,
});

describe('game logic', () => {
  it('recognizes the generated solution as a win and rejects truncated paths', () => {
    expect(isWinningPath(puzzle, puzzle.solution)).toBe(true);
    expect(isWinningPath(puzzle, puzzle.solution.slice(0, -1))).toBe(false);
  });

  it('computes the next checkpoint from partial progress', () => {
    const checkpoints = buildCheckpointMap(puzzle);
    const pathToSecondCheckpoint = puzzle.solution.slice(
      0,
      puzzle.solution.findIndex(
        ([r, c]) =>
          puzzle.checkpoints.some(
            (cp) => cp.value === 2 && cp.pos[0] === r && cp.pos[1] === c,
          ),
      ) + 1,
    );

    expect(nextCheckpointValue(checkpoints, puzzle.checkpoints.length, [])).toBe(1);
    expect(nextCheckpointValue(checkpoints, puzzle.checkpoints.length, pathToSecondCheckpoint)).toBe(3);
    expect(nextCheckpointValue(checkpoints, puzzle.checkpoints.length, puzzle.solution)).toBeNull();
  });

  it('allows the actual next solution move and blocks revisits', () => {
    const partial = puzzle.solution.slice(0, 5);
    const head = partial.at(-1)!;
    const next = puzzle.solution[5];
    const wallSet = buildWallSet(puzzle.walls);
    const checkpoints = buildCheckpointMap(puzzle);
    const visited = new Set(partial.map(([r, c]) => `${r},${c}`));

    expect(
      canExtendPath({
        size: puzzle.size,
        head,
        next,
        visited,
        wallSet,
        checkpoints,
        nextExpected: nextCheckpointValue(checkpoints, puzzle.checkpoints.length, partial),
      }),
    ).toBe(true);

    expect(
      canExtendPath({
        size: puzzle.size,
        head,
        next: partial[0],
        visited,
        wallSet,
        checkpoints,
        nextExpected: nextCheckpointValue(checkpoints, puzzle.checkpoints.length, partial),
      }),
    ).toBe(false);
  });

  it('suggests a legal hint that can be appended to the path', () => {
    const partial = puzzle.solution.slice(0, 8);
    const wallSet = buildWallSet(puzzle.walls);
    const checkpoints = buildCheckpointMap(puzzle);
    const visited = new Set(partial.map(([r, c]) => `${r},${c}`));
    const nextExpected = nextCheckpointValue(
      checkpoints,
      puzzle.checkpoints.length,
      partial,
    );

    const hint = suggestHint({
      puzzle,
      path: partial,
      visited,
      wallSet,
      checkpoints,
      nextExpected,
    });

    expect(hint).not.toBeNull();
    expect(
      canExtendPath({
        size: puzzle.size,
        head: partial.at(-1)!,
        next: hint!,
        visited,
        wallSet,
        checkpoints,
        nextExpected,
      }),
    ).toBe(true);
  });
});
