import { isSolvable } from '../game/engine';
import { levels } from './levels';

describe('Arrow Escape level catalog', () => {
  it('ships a 40-level catalog with unique ids and solvable boards', () => {
    expect(levels).toHaveLength(40);
    expect(new Set(levels.map((level) => level.id)).size).toBe(40);
    expect(levels.every(isSolvable)).toBe(true);
  });
});
