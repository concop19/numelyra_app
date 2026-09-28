import { describe, expect, it } from 'vitest';

import { createInitialBoard, isFrontClear, resolveTap } from '../engine';
import type { LevelDefinition } from '../types';

const level: LevelDefinition = {
  id: 99,
  title: 'Test Level',
  difficulty: 'Easy',
  gridSize: { columns: 5, rows: 5 },
  arrows: [
    {
      id: 'clear',
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      fullPath: [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    },
    {
      id: 'blocked',
      path: [{ x: 0, y: 2 }, { x: 1, y: 2 }],
      fullPath: [{ x: 0, y: 2 }, { x: 1, y: 2 }]
    },
    {
      id: 'blocker',
      path: [{ x: 3, y: 2 }, { x: 3, y: 3 }],
      fullPath: [{ x: 3, y: 2 }, { x: 3, y: 3 }]
    }
  ]
};

describe('engine', () => {
  it('allows removal when the arrow front is clear to the edge', () => {
    const board = createInitialBoard(level);
    const arrow = board.arrows.find((candidate) => candidate.id === 'clear')!;

    expect(isFrontClear(arrow, board)).toBe(true);
    expect(resolveTap('clear', board).type).toBe('REMOVED');
  });

  it('rejects a tap when another arrow blocks the front path', () => {
    const board = createInitialBoard(level);
    const arrow = board.arrows.find((candidate) => candidate.id === 'blocked')!;

    expect(isFrontClear(arrow, board)).toBe(false);
    expect(resolveTap('blocked', board).type).toBe('BLOCKED');
  });

  it('decrements a life on invalid moves', () => {
    const board = createInitialBoard(level, 3);
    const result = resolveTap('blocked', board);

    expect(result.type).toBe('BLOCKED');
    expect(result.board.livesLeft).toBe(2);
  });
});
