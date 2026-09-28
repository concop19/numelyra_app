export type AmmoType = 'NORMAL' | 'SCATTER' | 'MISSILE' | 'SHIELD';

export type AmmoConfig = {
  name: string;
  color: string;
  label: string;
  icon: string;
};

export const AMMO_CONFIGS: Record<AmmoType, AmmoConfig> = {
  NORMAL: {
    name: 'Normal Laser',
    color: '#00E676', // Bright Green
    label: '+12 Ammo',
    icon: '⚡',
  },
  SCATTER: {
    name: 'Scatter Shot',
    color: '#FF9100', // Neon Orange
    label: '+8 Tri-Shot',
    icon: '💥',
  },
  MISSILE: {
    name: 'Homing Rocket',
    color: '#FF1744', // Neon Red
    label: '+3 Rockets',
    icon: '🚀',
  },
  SHIELD: {
    name: 'Energy Shield',
    color: '#D500F9', // Neon Purple
    label: '+Shield',
    icon: '🛡️',
  },
};

export interface GridPoint {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface MiniArrow {
  id: string;
  fullPath: GridPoint[];
  ammoType: AmmoType;
  color: string;
}

export interface MiniBoard {
  columns: number;
  rows: number;
  arrows: MiniArrow[];
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: AmmoType;
  damage: number;
  targetId?: string;
}

export interface Chicken {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  type: 'MINION' | 'ARMORED' | 'BOSS';
  shootCooldown: number;
  shootTimer: number;
  radius: number;
  phase: number;
}

export interface EggBomb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface SpaceGameState {
  score: number;
  wave: number;
  ammo: number;
  maxAmmo: number;
  health: number;
  maxHealth: number;
  overdriveTimer: number; // in seconds
  shieldTimer: number;
  chickensDefeated: number;
  status: 'PLAYING' | 'GAMEOVER';
}
