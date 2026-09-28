import type { LevelDefinition } from '../game/types';
import levelData from './level.json';

export const levels: LevelDefinition[] = levelData as unknown as LevelDefinition[];

export function getLevel(id: number): LevelDefinition {
  const level = levels.find((l) => l.id === id);
  if (!level) throw new Error(`Level ${id} not found`);
  return level;
}

export function getTotalLevels(): number {
  return levels.length;
}

export function getNextLevelId(currentId: number): number {
  const currentIndex = levels.findIndex((l) => l.id === currentId);
  if (currentIndex < 0 || currentIndex >= levels.length - 1) return currentId;
  return levels[currentIndex + 1]!.id;
}
