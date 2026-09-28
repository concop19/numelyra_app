export type Equation = { input: number; output: number };

export type Puzzle = {
  id: number;
  /** Short title shown on the game screen */
  title: string;
  /** Worked examples revealing the hidden rule */
  equations: Equation[];
  question: number;
  answer: number;
  hint: string;
};

/**
 * Ten hand-authored "find the rule" puzzles, ordered by difficulty.
 * Each shows input → output examples; the player solves for the question mark.
 */
export const PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: 'Warm Up',
    equations: [
      { input: 1, output: 6 },
      { input: 3, output: 8 },
      { input: 7, output: 12 },
    ],
    question: 9,
    answer: 14,
    hint: 'Each output is the input with the same amount added. How much?',
  },
  {
    id: 2,
    title: 'Triple Trouble',
    equations: [
      { input: 2, output: 6 },
      { input: 4, output: 12 },
      { input: 5, output: 15 },
    ],
    question: 8,
    answer: 24,
    hint: 'The output grows three times as fast as the input.',
  },
  {
    id: 3,
    title: 'Perfect Squares',
    equations: [
      { input: 3, output: 9 },
      { input: 5, output: 25 },
      { input: 7, output: 49 },
    ],
    question: 9,
    answer: 81,
    hint: 'Try multiplying the number by itself.',
  },
  {
    id: 4,
    title: 'Double Plus',
    equations: [
      { input: 1, output: 3 },
      { input: 3, output: 7 },
      { input: 5, output: 11 },
    ],
    question: 8,
    answer: 17,
    hint: 'Double the input, then nudge it up by one.',
  },
  {
    id: 5,
    title: 'Square & Add',
    equations: [
      { input: 2, output: 6 },
      { input: 5, output: 30 },
      { input: 8, output: 72 },
    ],
    question: 9,
    answer: 90,
    hint: 'Multiply the number by itself, then add the number once more.',
  },
  {
    id: 6,
    title: 'Almost Square',
    equations: [
      { input: 2, output: 3 },
      { input: 4, output: 15 },
      { input: 5, output: 24 },
    ],
    question: 7,
    answer: 48,
    hint: 'Square the number, then take one away.',
  },
  {
    id: 7,
    title: 'Nine Lives',
    equations: [
      { input: 2, output: 18 },
      { input: 3, output: 27 },
      { input: 5, output: 45 },
    ],
    question: 9,
    answer: 81,
    hint: 'A single multiplier turns each input into its output.',
  },
  {
    id: 8,
    title: 'Cube Crunch',
    equations: [
      { input: 2, output: 8 },
      { input: 3, output: 27 },
      { input: 4, output: 64 },
    ],
    question: 5,
    answer: 125,
    hint: 'Multiply the number by itself, and once more again.',
  },
  {
    id: 9,
    title: 'Neighbours',
    equations: [
      { input: 3, output: 6 },
      { input: 5, output: 20 },
      { input: 7, output: 42 },
    ],
    question: 9,
    answer: 72,
    hint: 'Multiply the number by the value just below it.',
  },
  {
    id: 10,
    title: 'Square Plus One',
    equations: [
      { input: 2, output: 5 },
      { input: 4, output: 17 },
      { input: 6, output: 37 },
    ],
    question: 8,
    answer: 65,
    hint: 'Square the number, then add one.',
  },
];

export const TOTAL_LEVELS = PUZZLES.length;

export const getPuzzle = (level: number): Puzzle =>
  PUZZLES.find((puzzle) => puzzle.id === level) ?? PUZZLES[0];

/** Stars awarded based on hints used and wrong attempts. */
export const computeStars = (hintUsed: boolean, wrongAttempts: number): number => {
  if (!hintUsed && wrongAttempts === 0) return 3;
  if (!hintUsed && wrongAttempts <= 1) return 2;
  if (wrongAttempts <= 1) return 2;
  return 1;
};
