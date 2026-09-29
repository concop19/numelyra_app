import { ArrowNode, BoardState, Direction, LevelDefinition } from '../../game/types';
import {
  getNarrowEscapePuzzle,
  getNarrowEscapePuzzleTotal,
} from '../../levels/levels';
import { AMMO_CONFIGS, AmmoType } from '../types';

export interface SpaceArrowNode extends ArrowNode {
  ammoType: AmmoType;
  color: string;
  ammoCount: number;
}

export interface SpaceBoardState {
  levelId: number;
  levelTitle: string;
  totalLevels: number;
  columns: number;
  rows: number;
  arrows: SpaceArrowNode[];
  rawBoard: BoardState;
}

export function loadSpaceLevel(levelId = 1): SpaceBoardState {
  const total = getNarrowEscapePuzzleTotal();
  const safeId = Math.max(1, Math.min(total, levelId));
  const levelDef = getNarrowEscapePuzzle(safeId);

  const spaceArrows: SpaceArrowNode[] = levelDef.arrows.map((arrow, index) => {
    const len = arrow.fullPath.length;
    let ammoType: AmmoType = 'NORMAL';
    let ammoCount = 5;

    if (index % 5 === 4) {
      ammoType = 'SHIELD';
      ammoCount = 0;
    } else if (len >= 8) {
      ammoType = 'MISSILE';
      ammoCount = 2;
    } else if (len >= 5) {
      ammoType = 'SCATTER';
      ammoCount = 4;
    } else {
      ammoType = 'NORMAL';
      ammoCount = 5;
    }

    const cfg = AMMO_CONFIGS[ammoType];

    return {
      ...arrow,
      ammoType,
      color: cfg.color,
      ammoCount,
    };
  });

  const rawBoard: BoardState = {
    level: levelDef,
    arrows: spaceArrows,
    livesLeft: 3,
    removedIds: [],
  };

  return {
    levelId: safeId,
    levelTitle: levelDef.title,
    totalLevels: total,
    columns: levelDef.gridSize.columns,
    rows: levelDef.gridSize.rows,
    arrows: spaceArrows,
    rawBoard,
  };
}
