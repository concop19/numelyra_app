import type { ArrowNode, BoardState, Direction, GridPosition, LevelDefinition, TapResult } from './types';

const directionVector: Record<Direction, GridPosition> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

export function createInitialBoard(level: LevelDefinition, livesLeft = 3): BoardState {
  return {
    level,
    arrows: level.arrows,
    livesLeft,
    removedIds: []
  };
}

/**
 * Returns every cell occupied by this arrow.
 */
export function getArrowCells(arrow: ArrowNode): GridPosition[] {
  return arrow.fullPath;
}

/**
 * The tip/head of the arrow — the last cell in fullPath.
 */
export function getArrowHead(arrow: ArrowNode): GridPosition {
  return arrow.fullPath[arrow.fullPath.length - 1] ?? arrow.fullPath[0]!;
}

/**
 * Compute the exit direction from the last two cells of fullPath.
 * This is the direction the arrow is pointing at its tip.
 */
export function getExitDirection(arrow: ArrowNode): Direction {
  const fp = arrow.fullPath;
  if (fp.length < 2) return 'RIGHT'; // fallback
  const last = fp[fp.length - 1]!;
  const prev = fp[fp.length - 2]!;
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  if (dx > 0) return 'RIGHT';
  if (dx < 0) return 'LEFT';
  if (dy > 0) return 'DOWN';
  return 'UP';
}

export function isInsideGrid(position: GridPosition, level: LevelDefinition): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < level.gridSize.columns &&
    position.y < level.gridSize.rows
  );
}

export function samePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

/**
 * Check whether nothing blocks this arrow's exit path.
 * Traces forward from the head in the exit direction until leaving the grid.
 */
export function isFrontClear(arrow: ArrowNode, board: BoardState): boolean {
  const dir = getExitDirection(arrow);
  const vector = directionVector[dir];
  const head = getArrowHead(arrow);

  let cursor = {
    x: head.x + vector.x,
    y: head.y + vector.y
  };

  const occupiedCells = board.arrows
    .filter((candidate) => candidate.id !== arrow.id)
    .flatMap((candidate) => getArrowCells(candidate));

  while (isInsideGrid(cursor, board.level)) {
    if (occupiedCells.some((cell) => samePosition(cell, cursor))) {
      return false;
    }

    cursor = { x: cursor.x + vector.x, y: cursor.y + vector.y };
  }

  return true;
}

export function resolveTap(arrowId: string, board: BoardState): TapResult {
  const arrow = board.arrows.find((candidate) => candidate.id === arrowId);

  if (!arrow) {
    return {
      type: 'BLOCKED',
      arrowId,
      livesLeft: Math.max(0, board.livesLeft - 1),
      board: { ...board, livesLeft: Math.max(0, board.livesLeft - 1) }
    };
  }

  if (!isFrontClear(arrow, board)) {
    const livesLeft = Math.max(0, board.livesLeft - 1);

    return {
      type: 'BLOCKED',
      arrowId,
      livesLeft,
      board: { ...board, livesLeft }
    };
  }

  return {
    type: 'REMOVED',
    arrowId,
    board: {
      ...board,
      arrows: board.arrows.filter((candidate) => candidate.id !== arrowId),
      removedIds: [...board.removedIds, arrowId]
    }
  };
}

export function isBoardWon(board: BoardState): boolean {
  return board.arrows.length === 0;
}


/**
 * Find an arrow that can be removed right now (front is clear).
 * Returns the arrow or undefined if no valid move exists.
 */
export function findHintArrow(board: BoardState): ArrowNode | undefined {
  return board.arrows.find((arrow) => isFrontClear(arrow, board));
}

/**
 * Check if a level is solvable by greedily removing arrows with clear fronts.
 * Returns true if all arrows can be removed in some order.
 */
export function isSolvable(level: LevelDefinition): boolean {
  let currentArrows = [...level.arrows];

  while (currentArrows.length > 0) {
    const tempBoard: BoardState = {
      level,
      arrows: currentArrows,
      livesLeft: 3,
      removedIds: []
    };

    const removable = currentArrows.find((arrow) => isFrontClear(arrow, tempBoard));

    if (!removable) {
      return false;
    }

    currentArrows = currentArrows.filter((a) => a.id !== removable.id);
  }

  return true;
}
