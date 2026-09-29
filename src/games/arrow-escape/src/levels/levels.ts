import type { ArrowNode, Difficulty, LevelDefinition } from '../game/types';
import levelData from './level.json';

const legacyLevels = levelData as unknown as LevelDefinition[];

// The handcrafted boards are the original Narrow Escape puzzles. The
// progression levels above are intentionally lightweight, but game modes that
// need a proper maze can opt into this catalog directly.
export const narrowEscapePuzzles: LevelDefinition[] = legacyLevels;

function generatedArrow(id: number, row: number, columns: number): ArrowNode {
  const fullPath = Array.from({ length: columns }, (_, x) => ({ x, y: row }));
  return { id: `journey-${id}-${row}`, path: [fullPath[0], fullPath[fullPath.length - 1]], fullPath };
}

function generatedLevel(id: number): LevelDefinition {
  const difficulty: Difficulty = id <= 8 ? 'Easy' : id <= 20 ? 'Medium' : id <= 30 ? 'Hard' : 'Expert';
  const columns = difficulty === 'Easy' ? 5 : difficulty === 'Medium' ? 7 : difficulty === 'Hard' ? 9 : 11;
  const rows = difficulty === 'Easy' ? 5 : difficulty === 'Medium' ? 7 : difficulty === 'Hard' ? 9 : 11;
  const arrowCount = Math.min(rows, 2 + Math.floor((id - 1) / 3));
  return { id, title: `Journey ${id}`, difficulty, gridSize: { columns, rows }, arrows: Array.from({ length: arrowCount }, (_, row) => generatedArrow(id, row, columns)) };
}

// The first public release only contained the four large Expert boards.  Keep
// them as the final Legacy pack while giving new players a real difficulty ramp.
export const levels: LevelDefinition[] = [
  ...Array.from({ length: 36 }, (_, index) => generatedLevel(index + 1)),
  ...legacyLevels.map((level, index) => ({ ...level, id: index + 37, title: `Legacy Expert ${index + 1}`, difficulty: 'Expert' as Difficulty })),
];

export function getLevel(id: number): LevelDefinition {
  const level = levels.find((l) => l.id === id);
  if (!level) throw new Error(`Level ${id} not found`);
  return level;
}

export function getTotalLevels(): number {
  return levels.length;
}

export function getNarrowEscapePuzzle(id: number): LevelDefinition {
  const level = narrowEscapePuzzles.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Narrow Escape puzzle ${id} not found`);
  return level;
}

export function getNarrowEscapePuzzleTotal(): number {
  return narrowEscapePuzzles.length;
}

export function getNextLevelId(currentId: number): number {
  const currentIndex = levels.findIndex((l) => l.id === currentId);
  if (currentIndex < 0 || currentIndex >= levels.length - 1) return currentId;
  return levels[currentIndex + 1]!.id;
}
