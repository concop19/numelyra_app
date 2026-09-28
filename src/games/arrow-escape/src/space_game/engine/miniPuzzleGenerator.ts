import { AMMO_CONFIGS, AmmoType, Direction, GridPoint, MiniArrow, MiniBoard } from '../types';

const DIR_VEC: Record<Direction, GridPoint> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

const AMMO_POOLS: AmmoType[] = [
  'NORMAL',
  'NORMAL',
  'NORMAL',
  'SCATTER',
  'SCATTER',
  'MISSILE',
  'SHIELD',
];

export function getExitDirection(arrow: MiniArrow): Direction {
  const fp = arrow.fullPath;
  if (fp.length < 2) return 'RIGHT';
  const last = fp[fp.length - 1]!;
  const prev = fp[fp.length - 2]!;
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  if (dx > 0) return 'RIGHT';
  if (dx < 0) return 'LEFT';
  if (dy > 0) return 'DOWN';
  return 'UP';
}

export function isInsideGrid(p: GridPoint, cols: number, rows: number): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows;
}

export function isArrowClear(arrow: MiniArrow, board: MiniBoard): boolean {
  const dir = getExitDirection(arrow);
  const vec = DIR_VEC[dir];
  const head = arrow.fullPath[arrow.fullPath.length - 1]!;

  let cur: GridPoint = { x: head.x + vec.x, y: head.y + vec.y };

  const otherCells = new Set<string>();
  for (const other of board.arrows) {
    if (other.id === arrow.id) continue;
    for (const cell of other.fullPath) {
      otherCells.add(`${cell.x},${cell.y}`);
    }
  }

  while (isInsideGrid(cur, board.columns, board.rows)) {
    if (otherCells.has(`${cur.x},${cur.y}`)) {
      return false;
    }
    cur = { x: cur.x + vec.x, y: cur.y + vec.y };
  }

  return true;
}

/**
 * Generates a clean, fast-paced mini puzzle guaranteed 100% solvable.
 */
export function generateMiniBoard(columns = 4, rows = 4, count = 5): MiniBoard {
  let attempts = 0;

  while (attempts < 50) {
    attempts++;
    const board = tryGenerateBoard(columns, rows, count);
    if (board && board.arrows.length >= 4) {
      return board;
    }
  }

  // Guaranteed fallback template
  return createFallbackBoard(columns, rows);
}

function tryGenerateBoard(cols: number, rows: number, targetCount: number): MiniBoard | null {
  const occupied = new Set<string>();
  const arrows: MiniArrow[] = [];

  // Generate arrows in reverse removal order to guarantee solvability
  for (let i = 0; i < targetCount; i++) {
    const arrow = tryCreateReverseArrow(cols, rows, occupied, `a_${i}`);
    if (!arrow) continue;

    for (const cell of arrow.fullPath) {
      occupied.add(`${cell.x},${cell.y}`);
    }
    arrows.push(arrow);
  }

  if (arrows.length < 3) return null;

  return {
    columns: cols,
    rows: rows,
    arrows,
  };
}

function tryCreateReverseArrow(
  cols: number,
  rows: number,
  occupied: Set<string>,
  id: string
): MiniArrow | null {
  const possibleDirs = [...DIRS].sort(() => Math.random() - 0.5);

  for (const dir of possibleDirs) {
    const vec = DIR_VEC[dir];

    // Find candidate head positions where ray to exit is completely clear of already placed arrows
    const candidateHeads: GridPoint[] = [];
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        if (occupied.has(`${x},${y}`)) continue;

        // Check if ray to exit in direction `dir` is empty
        let cur = { x: x + vec.x, y: y + vec.y };
        let clear = true;
        while (isInsideGrid(cur, cols, rows)) {
          if (occupied.has(`${cur.x},${cur.y}`)) {
            clear = false;
            break;
          }
          cur = { x: cur.x + vec.x, y: cur.y + vec.y };
        }

        if (clear) candidateHeads.push({ x, y });
      }
    }

    if (candidateHeads.length === 0) continue;

    // Pick random head
    const head = candidateHeads[Math.floor(Math.random() * candidateHeads.length)]!;
    const length = Math.floor(Math.random() * 2) + 2; // length 2 or 3

    // Grow body backwards (opposite to exit direction)
    const backVec = { x: -vec.x, y: -vec.y };
    const fullPath: GridPoint[] = [];
    let valid = true;

    // Build from tail to head
    for (let l = length - 1; l >= 0; l--) {
      const pt = { x: head.x + backVec.x * l, y: head.y + backVec.y * l };
      if (!isInsideGrid(pt, cols, rows) || occupied.has(`${pt.x},${pt.y}`)) {
        valid = false;
        break;
      }
      fullPath.push(pt);
    }

    if (valid && fullPath.length >= 2) {
      const ammoType = AMMO_POOLS[Math.floor(Math.random() * AMMO_POOLS.length)]!;
      return {
        id,
        fullPath,
        ammoType,
        color: AMMO_CONFIGS[ammoType].color,
      };
    }
  }

  return null;
}

function createFallbackBoard(cols: number, rows: number): MiniBoard {
  return {
    columns: cols,
    rows: rows,
    arrows: [
      {
        id: 'fb_1',
        fullPath: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
        ammoType: 'NORMAL',
        color: AMMO_CONFIGS.NORMAL.color,
      },
      {
        id: 'fb_2',
        fullPath: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }],
        ammoType: 'SCATTER',
        color: AMMO_CONFIGS.SCATTER.color,
      },
      {
        id: 'fb_3',
        fullPath: [{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }],
        ammoType: 'MISSILE',
        color: AMMO_CONFIGS.MISSILE.color,
      },
      {
        id: 'fb_4',
        fullPath: [{ x: 2, y: 2 }, { x: 1, y: 2 }],
        ammoType: 'NORMAL',
        color: AMMO_CONFIGS.NORMAL.color,
      },
      {
        id: 'fb_5',
        fullPath: [{ x: 1, y: 3 }, { x: 2, y: 3 }],
        ammoType: 'SHIELD',
        color: AMMO_CONFIGS.SHIELD.color,
      },
    ],
  };
}
