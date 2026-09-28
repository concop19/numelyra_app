/**
 * Puzzle bank.
 *
 * Every puzzle is produced by `generatePuzzle` from a fixed seed, so the
 * puzzle for a given id is identical across app launches and devices —
 * which is what lets us key persistent best-time/best-moves on `puzzle.id`.
 *
 * Real LinkedIn Zip puzzles have 8–12 numbered checkpoints and 0–3 walls,
 * so the configs below stay in those ranges across difficulty levels.
 *
 * Daily puzzle: seeded by today's date so it stays consistent throughout
 * the day, and changes overnight.
 */

import { generatePuzzle } from './generator';
import type { Puzzle } from './types';

interface PuzzleConfig {
  readonly id: string;
  readonly name: string;
  readonly difficulty: Puzzle['difficulty'];
  readonly size: number;
  readonly checkpointCount: number;
  readonly wallCount: number;
  readonly seed: number;
}

const PUZZLE_CONFIGS: readonly PuzzleConfig[] = [
  // Easy: smaller grids, fewer walls.
  { id: 'first-loop', name: 'First Loop', difficulty: 'easy', size: 5, checkpointCount: 8, wallCount: 0, seed: 1001 },
  { id: 'detour',     name: 'Detour',     difficulty: 'easy', size: 5, checkpointCount: 8, wallCount: 1, seed: 1042 },
  // Medium: 6×6, 9–10 numbers, 1–2 walls.
  { id: 'crossroads', name: 'Crossroads', difficulty: 'medium', size: 6, checkpointCount: 9,  wallCount: 1, seed: 2003 },
  { id: 'coastline',  name: 'Coastline',  difficulty: 'medium', size: 6, checkpointCount: 10, wallCount: 2, seed: 2071 },
  // Hard: 7–8 wide, 10–12 numbers, 2–3 walls.
  { id: 'switchback', name: 'Switchback', difficulty: 'hard', size: 7, checkpointCount: 10, wallCount: 2, seed: 3001 },
  { id: 'ribbon',     name: 'Ribbon',     difficulty: 'hard', size: 7, checkpointCount: 11, wallCount: 3, seed: 3057 },
  { id: 'long-way',   name: 'The Long Way', difficulty: 'hard', size: 8, checkpointCount: 12, wallCount: 2, seed: 4015 },
  { id: 'big-twist',  name: 'Big Twist',  difficulty: 'hard', size: 8, checkpointCount: 11, wallCount: 3, seed: 4119 },
];

export const PUZZLES: readonly Puzzle[] = PUZZLE_CONFIGS.map(generatePuzzle);

export function getPuzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}

export function getDailyDateKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generate today's daily puzzle. Same date → same puzzle, different date →
 * different puzzle. Size and checkpoint/wall counts also vary slightly so
 * the daily feels fresh.
 */
export function getDailyPuzzle(date: Date = new Date()): Puzzle {
  const key = getDailyDateKey(date);
  const seedBase =
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate();

  // Daily always sits in the medium/hard band — never trivially small.
  const sizes = [6, 7, 8] as const;
  const counts = [9, 10, 10, 11, 12] as const;
  const walls = [1, 2, 2, 3] as const;

  const size = sizes[seedBase % sizes.length];
  const checkpointCount = counts[(seedBase >> 3) % counts.length];
  const wallCount = walls[(seedBase >> 5) % walls.length];

  return generatePuzzle({
    id: `daily-${key}`,
    name: 'Daily Puzzle',
    difficulty: size === 6 ? 'medium' : 'hard',
    size,
    checkpointCount,
    wallCount,
    seed: seedBase,
  });
}
