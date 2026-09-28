import { AIDifficulty, DotBoxGameState, Line, Player } from '../types';
import {
  connectLine,
  findNonThirdSideLines,
  getAllOpenLines,
  getCloseableBoxes,
} from './dotBoxEngine';

function getRandomItem<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

/**
 * Calculates how many chain boxes an opponent can capture if this line is played.
 */
function countSacrificeCost(state: DotBoxGameState, lineId: string, aiPlayer: Player): number {
  const opponent = (aiPlayer === 0 ? 1 : 0) as Player;
  let simState = connectLine(state, lineId, aiPlayer).nextState;
  let chainLength = 0;

  // Simulate greedy capture by opponent
  let closeable = getCloseableBoxes(simState);
  while (closeable.length > 0) {
    const target = closeable[0];
    chainLength++;
    simState = connectLine(simState, target.openLine.id, opponent).nextState;
    closeable = getCloseableBoxes(simState);
  }

  return chainLength;
}

export function chooseAIMove(
  state: DotBoxGameState,
  difficulty: AIDifficulty,
  aiPlayer: Player = 1
): string | null {
  const allOpen = getAllOpenLines(state);
  if (allOpen.length === 0) return null;

  // 1. Easy: Completely random move
  if (difficulty === 'easy') {
    return getRandomItem(allOpen).id;
  }

  // 2. Medium: Avoid giving the 3rd side to any box
  if (difficulty === 'medium') {
    // If can close a box with 40% probability, do it; else avoid third side
    const closeable = getCloseableBoxes(state);
    if (closeable.length > 0 && Math.random() < 0.6) {
      return getRandomItem(closeable).openLine.id;
    }

    const safeLines = findNonThirdSideLines(state);
    if (safeLines.length > 0) {
      return getRandomItem(safeLines).id;
    }

    return getRandomItem(allOpen).id;
  }

  // 3. Hard: Single Box Closer + Chain Strategy
  // Priority 1: ALWAYS capture closeable boxes!
  const closeable = getCloseableBoxes(state);
  if (closeable.length > 0) {
    // If multiple options, prefer one that creates or extends another capture
    return closeable[0].openLine.id;
  }

  // Priority 2: Pick safe lines (does not give 3rd side)
  const safeLines = findNonThirdSideLines(state);
  if (safeLines.length > 0) {
    return getRandomItem(safeLines).id;
  }

  // Priority 3: All moves sacrifice at least one box to opponent.
  // Find the move that minimizes opponent's chain capture!
  let bestLine = allOpen[0];
  let minChain = Infinity;

  for (const line of allOpen) {
    const chainCost = countSacrificeCost(state, line.id, aiPlayer);
    if (chainCost < minChain) {
      minChain = chainCost;
      bestLine = line;
    }
  }

  return bestLine.id;
}
