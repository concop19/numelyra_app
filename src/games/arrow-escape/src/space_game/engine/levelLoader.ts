import { ArrowNode, BoardState, Direction, LevelDefinition } from '../../game/types';
import { getLevel, getTotalLevels } from '../../levels/levels';
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
  const total = getTotalLevels();
  const safeId = Math.max(1, Math.min(total, levelId));
  const levelDef = getLevel(safeId);

  const spaceArrows: SpaceArrowNode[] = levelDef.arrows.map((arrow, index) => {
    const len = arrow.fullPath.length;
    let ammoType: AmmoType = 'NORMAL';
    let ammoCount = 16;

    if (index % 5 === 4) {
      ammoType = 'SHIELD';
      ammoCount = 8;
    } else if (len >= 8) {
      ammoType = 'MISSILE';
      ammoCount = 5;
    } else if (len >= 5) {
      ammoType = 'SCATTER';
      ammoCount = 12;
    } else {
      ammoType = 'NORMAL';
      ammoCount = 18;
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
