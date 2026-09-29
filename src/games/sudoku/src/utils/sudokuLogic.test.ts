import { generateSudoku } from './sudokuLogic';

describe('seeded Sudoku generation', () => {
  it('creates the same daily board for the same date seed', () => {
    const first = generateSudoku('easy', 20260928);
    const second = generateSudoku('easy', 20260928);
    expect(first.solution).toEqual(second.solution);
    expect(first.startBoard).toEqual(second.startBoard);
  });
});
