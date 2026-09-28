export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface CellState {
  value: number; // 0 for empty, 1-9 for filled
  isClue: boolean; // pre-filled, cannot edit
  notes: number[]; // pencil marks (1-9)
}

export type BoardState = CellState[][];

// Utility: Create an empty 9x9 number grid
export const createEmptyGrid = (): number[][] => {
  return Array(9).fill(null).map(() => Array(9).fill(0));
};

// Check if a number can be placed at board[row][col]
export const isValidPlace = (board: number[][], row: number, col: number, num: number): boolean => {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num && c !== col) return false;
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num && r !== row) return false;
  }

  // Check 3x3 box
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  for (let r = boxRowStart; r < boxRowStart + 3; r++) {
    for (let c = boxColStart; c < boxColStart + 3; c++) {
      if (board[r][c] === num && (r !== row || c !== col)) return false;
    }
  }

  return true;
};

// Shuffle helper
const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Backtracking solver to fill the board with random numbers
const fillBoard = (board: number[][]): boolean => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValidPlace(board, r, c, num)) {
            board[r][c] = num;
            if (fillBoard(board)) {
              return true;
            }
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// Backtracking solver to count solutions
const countSolutions = (board: number[][], count = { val: 0 }): number => {
  let r = -1;
  let c = -1;
  let isEmpty = false;
  
  // Find first empty cell
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) {
        r = i;
        c = j;
        isEmpty = true;
        break;
      }
    }
    if (isEmpty) break;
  }

  // If no empty cell, we found a solution
  if (!isEmpty) {
    count.val++;
    return count.val;
  }

  for (let num = 1; num <= 9; num++) {
    if (isValidPlace(board, r, c, num)) {
      board[r][c] = num;
      countSolutions(board, count);
      board[r][c] = 0; // backtrack
      
      // Stop early if multiple solutions are found
      if (count.val > 1) {
        return count.val;
      }
    }
  }
  return count.val;
};

// Generate Sudoku board logic
export const generateSudoku = (
  difficulty: Difficulty
): { startBoard: BoardState; solution: number[][] } => {
  // 1. Generate full solved board
  const solutionGrid = createEmptyGrid();
  fillBoard(solutionGrid);

  // Copy solution grid for creating the puzzle
  const puzzleGrid = solutionGrid.map((row) => [...row]);

  // Set number of clues/removals based on difficulty
  // Easy: ~43 clues (remove ~38)
  // Medium: ~35 clues (remove ~46)
  // Hard: ~28 clues (remove ~53)
  // Expert: ~23 clues (remove ~58)
  let cellsToRemove = 38;
  if (difficulty === 'medium') cellsToRemove = 46;
  if (difficulty === 'hard') cellsToRemove = 53;
  if (difficulty === 'expert') cellsToRemove = 58;

  // Create list of all 81 cell indices and shuffle them
  const cellIndices = Array.from({ length: 81 }, (_, i) => i);
  const shuffledIndices = shuffleArray(cellIndices);

  let removedCount = 0;
  for (const index of shuffledIndices) {
    if (removedCount >= cellsToRemove) break;

    const r = Math.floor(index / 9);
    const c = index % 9;

    const temp = puzzleGrid[r][c];
    puzzleGrid[r][c] = 0;

    // Check if the board still has a unique solution
    const count = { val: 0 };
    // Create a copy of the puzzle grid for counting solutions
    const tempGrid = puzzleGrid.map((row) => [...row]);
    countSolutions(tempGrid, count);

    if (count.val === 1) {
      removedCount++;
    } else {
      // Put the value back if it results in non-unique solution
      puzzleGrid[r][c] = temp;
    }
  }

  // 2. Convert grid to Game BoardState
  const startBoard: BoardState = puzzleGrid.map((row, r) =>
    row.map((val, c) => ({
      value: val,
      isClue: val !== 0,
      notes: [],
    }))
  );

  return {
    startBoard,
    solution: solutionGrid,
  };
};

// Check conflicts on the board
// Returns a 2D boolean grid representing whether a cell is conflicting
export const getConflictGrid = (board: BoardState): boolean[][] => {
  const conflicts = Array(9).fill(null).map(() => Array(9).fill(false));
  const rawGrid = board.map((row) => row.map((cell) => cell.value));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = rawGrid[r][c];
      if (val === 0) continue;

      // Check row duplicates
      for (let i = 0; i < 9; i++) {
        if (i !== c && rawGrid[r][i] === val) {
          conflicts[r][c] = true;
          conflicts[r][i] = true;
        }
      }

      // Check col duplicates
      for (let i = 0; i < 9; i++) {
        if (i !== r && rawGrid[i][c] === val) {
          conflicts[r][c] = true;
          conflicts[i][c] = true;
        }
      }

      // Check box duplicates
      const boxRowStart = Math.floor(r / 3) * 3;
      const boxColStart = Math.floor(c / 3) * 3;
      for (let i = boxRowStart; i < boxRowStart + 3; i++) {
        for (let j = boxColStart; j < boxColStart + 3; j++) {
          if ((i !== r || j !== c) && rawGrid[i][j] === val) {
            conflicts[r][c] = true;
            conflicts[i][j] = true;
          }
        }
      }
    }
  }

  return conflicts;
};

// Check if the board is fully solved and valid
export const isBoardSolved = (board: BoardState, solution: number[][]): boolean => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c].value !== solution[r][c]) {
        return false;
      }
    }
  }
  return true;
};
