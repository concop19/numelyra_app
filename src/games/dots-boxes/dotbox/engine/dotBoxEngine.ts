import { Box, DotBoxGameState, Line, Player, Point } from '../types';

export function normalizeLineId(d1: Point, d2: Point): { id: string; d1: Point; d2: Point; orientation: 'H' | 'V' } {
  const isHorizontal = d1.y === d2.y;
  if (isHorizontal) {
    const minX = Math.min(d1.x, d2.x);
    const maxX = Math.max(d1.x, d2.x);
    const y = d1.y;
    return {
      id: `H_${minX}_${y}_${maxX}_${y}`,
      d1: { x: minX, y },
      d2: { x: maxX, y },
      orientation: 'H',
    };
  } else {
    const minY = Math.min(d1.y, d2.y);
    const maxY = Math.max(d1.y, d2.y);
    const x = d1.x;
    return {
      id: `V_${x}_${minY}_${x}_${maxY}`,
      d1: { x, y: minY },
      d2: { x, y: maxY },
      orientation: 'V',
    };
  }
}

export function createInitialGameState(boardSize: number = 3): DotBoxGameState {
  const dotCount = boardSize + 1;
  const lines: Record<string, Line> = {};
  const boxes: Box[] = [];

  // 1. Generate Horizontal lines: (dotCount rows, boardSize lines per row)
  for (let y = 0; y < dotCount; y++) {
    for (let x = 0; x < boardSize; x++) {
      const norm = normalizeLineId({ x, y }, { x: x + 1, y });
      lines[norm.id] = {
        id: norm.id,
        d1: norm.d1,
        d2: norm.d2,
        orientation: norm.orientation,
        owner: null,
      };
    }
  }

  // 2. Generate Vertical lines: (dotCount cols, boardSize lines per col)
  for (let x = 0; x < dotCount; x++) {
    for (let y = 0; y < boardSize; y++) {
      const norm = normalizeLineId({ x, y }, { x, y: y + 1 });
      lines[norm.id] = {
        id: norm.id,
        d1: norm.d1,
        d2: norm.d2,
        orientation: norm.orientation,
        owner: null,
      };
    }
  }

  // 3. Generate Boxes: (boardSize x boardSize)
  let boxIndex = 0;
  for (let by = 0; by < boardSize; by++) {
    for (let bx = 0; bx < boardSize; bx++) {
      const topLineId = normalizeLineId({ x: bx, y: by }, { x: bx + 1, y: by }).id;
      const rightLineId = normalizeLineId({ x: bx + 1, y: by }, { x: bx + 1, y: by + 1 }).id;
      const bottomLineId = normalizeLineId({ x: bx, y: by + 1 }, { x: bx + 1, y: by + 1 }).id;
      const leftLineId = normalizeLineId({ x: bx, y: by }, { x: bx, y: by + 1 }).id;

      boxes.push({
        index: boxIndex++,
        x: bx,
        y: by,
        lineIds: [topLineId, rightLineId, bottomLineId, leftLineId],
        owner: null,
      });
    }
  }

  return {
    boardSize,
    dotCount,
    lines,
    boxes,
    currentPlayer: 0,
    scores: [0, 0],
    isGameOver: false,
    winner: null,
    extraTurn: false,
    lastClaimedBoxes: [],
    lastLineId: null,
    moveCount: 0,
  };
}

export function cloneGameState(state: DotBoxGameState): DotBoxGameState {
  const clonedLines: Record<string, Line> = {};
  for (const key of Object.keys(state.lines)) {
    clonedLines[key] = { ...state.lines[key] };
  }

  const clonedBoxes: Box[] = state.boxes.map((box) => ({
    ...box,
    lineIds: [...box.lineIds],
  }));

  return {
    ...state,
    lines: clonedLines,
    boxes: clonedBoxes,
    scores: [state.scores[0], state.scores[1]],
    lastClaimedBoxes: [...state.lastClaimedBoxes],
  };
}

export function getAdjacentBoxes(lineId: string, boxes: Box[]): Box[] {
  return boxes.filter((box) => box.lineIds.includes(lineId));
}

export function getBoxLineStates(box: Box, lines: Record<string, Line>): { open: Line[]; connected: Line[] } {
  const open: Line[] = [];
  const connected: Line[] = [];

  for (const lineId of box.lineIds) {
    const line = lines[lineId];
    if (line && line.owner !== null) {
      connected.push(line);
    } else if (line) {
      open.push(line);
    }
  }

  return { open, connected };
}

export function getAllOpenLines(state: DotBoxGameState): Line[] {
  return Object.values(state.lines).filter((l) => l.owner === null);
}

export function getCloseableBoxes(state: DotBoxGameState): { box: Box; openLine: Line }[] {
  const results: { box: Box; openLine: Line }[] = [];
  for (const box of state.boxes) {
    if (box.owner === null) {
      const { open } = getBoxLineStates(box, state.lines);
      if (open.length === 1) {
        results.push({ box, openLine: open[0] });
      }
    }
  }
  return results;
}

export function findNonThirdSideLines(state: DotBoxGameState): Line[] {
  const openLines = getAllOpenLines(state);
  const result: Line[] = [];

  for (const line of openLines) {
    const adjBoxes = getAdjacentBoxes(line.id, state.boxes);
    // Safe line if every adjacent box currently has 3 or 4 open lines (i.e. <= 1 connected line),
    // meaning playing this line makes it have 2 connected lines (still 2 open), NOT giving 3rd side!
    const isSafe = adjBoxes.every((b) => {
      const { open } = getBoxLineStates(b, state.lines);
      return open.length >= 3;
    });

    if (isSafe) {
      result.push(line);
    }
  }

  return result;
}

export function connectLine(
  state: DotBoxGameState,
  lineId: string,
  player: Player
): {
  nextState: DotBoxGameState;
  closedBoxIndices: number[];
  extraTurn: boolean;
  isValid: boolean;
} {
  const line = state.lines[lineId];
  if (!line || line.owner !== null || state.isGameOver) {
    return {
      nextState: state,
      closedBoxIndices: [],
      extraTurn: false,
      isValid: false,
    };
  }

  const nextState = cloneGameState(state);
  nextState.lines[lineId].owner = player;
  nextState.lastLineId = lineId;
  nextState.moveCount++;

  const closedBoxIndices: number[] = [];
  const adjBoxes = getAdjacentBoxes(lineId, nextState.boxes);

  for (const box of adjBoxes) {
    if (box.owner === null) {
      const isComplete = box.lineIds.every((lid) => nextState.lines[lid].owner !== null);
      if (isComplete) {
        box.owner = player;
        closedBoxIndices.push(box.index);
      }
    }
  }

  nextState.scores[player] += closedBoxIndices.length;
  nextState.lastClaimedBoxes = closedBoxIndices;

  const hasClosedBox = closedBoxIndices.length > 0;
  nextState.extraTurn = hasClosedBox;

  // Extra turn: player gets another turn if they closed at least one box!
  if (!hasClosedBox) {
    nextState.currentPlayer = player === 0 ? 1 : 0;
  } else {
    nextState.currentPlayer = player;
  }

  // Check Game Over
  const allBoxesClaimed = nextState.boxes.every((b) => b.owner !== null);
  if (allBoxesClaimed) {
    nextState.isGameOver = true;
    if (nextState.scores[0] > nextState.scores[1]) {
      nextState.winner = 0;
    } else if (nextState.scores[1] > nextState.scores[0]) {
      nextState.winner = 1;
    } else {
      nextState.winner = 'draw';
    }
  }

  return {
    nextState,
    closedBoxIndices,
    extraTurn: hasClosedBox,
    isValid: true,
  };
}
