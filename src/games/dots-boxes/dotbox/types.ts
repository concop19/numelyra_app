export type Point = {
  x: number;
  y: number;
};

export type LineOrientation = 'H' | 'V';

export type Line = {
  id: string; // e.g. "H_0_0_1_0" or "V_0_0_0_1"
  d1: Point;
  d2: Point;
  orientation: LineOrientation;
  owner: number | null; // 0 for Player 1 (Blue), 1 for Player 2 / AI (Red)
};

export type Box = {
  index: number;
  x: number;
  y: number;
  lineIds: string[];
  owner: number | null;
};

export type Player = 0 | 1;

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'pve' | 'pvp';

export interface DotBoxGameState {
  boardSize: number; // e.g. 3 => 3x3 boxes (4x4 dots)
  dotCount: number; // boardSize + 1
  lines: Record<string, Line>;
  boxes: Box[];
  currentPlayer: Player;
  scores: [number, number];
  isGameOver: boolean;
  winner: Player | 'draw' | null;
  extraTurn: boolean;
  lastClaimedBoxes: number[];
  lastLineId: string | null;
  moveCount: number;
}
