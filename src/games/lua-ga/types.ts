import type { LuaGaSettings } from './config';

export type Point = { x: number; y: number };
export type ChickenType = 'hen' | 'rooster';
export type ChickenState =
  | 'WANDER' | 'PECK' | 'ESCAPE' | 'PANIC' | 'CLAP_PANIC'
  | 'GO_TO_FOOD' | 'EAT' | 'ENTERING_COOP' | 'SECURED' | 'COOP_OPEN'
  | 'COOP_RELEASED' | 'ROOSTER_AIM' | 'ROOSTER_CHARGE' | 'ROOSTER_RECOVER';

export type LuaGaInputFrame = {
  moveX: number;
  moveY: number;
  sprint: boolean;
  dropGrain: boolean;
  clap: boolean;
  toggleCoop: boolean;
  dashHeld: boolean;
  dashReleased: boolean;
};

export const EMPTY_INPUT: LuaGaInputFrame = {
  moveX: 0,
  moveY: 0,
  sprint: false,
  dropGrain: false,
  clap: false,
  toggleCoop: false,
  dashHeld: false,
  dashReleased: false,
};

export type Player = Point & {
  radius: number; speed: number; velocityX: number; velocityY: number;
  directionX: number; directionY: number; sprintActiveTime: number;
  sprintCooldownRemaining: number; dashCooldownRemaining: number;
  dashEffectRemaining: number; dashEffectDuration: number;
  dashStartX: number; dashStartY: number; dashEndX: number; dashEndY: number;
  dashAiming: boolean; dashAimDirectionX: number; dashAimDirectionY: number;
  dashPreviewX: number; dashPreviewY: number;
};

export type Chicken = Point & {
  id: string; type: ChickenType; radius: number; state: ChickenState; previousState: ChickenState;
  directionX: number; directionY: number; speed: number; alertRadius: number;
  pressureRadius: number; panicRadius: number; wanderSpeed: number; escapeSpeed: number;
  panicSpeed: number; clapPanicSpeed: number; wanderTimer: number; peckTimer: number;
  alertTimer: number; escapeDistanceRemaining: number; directionLockRemaining: number;
  lastEscapeBase: Point; attackTelegraphRemaining: number; attackDistanceRemaining: number;
  attackRecoverRemaining: number; attackTargetX: number; attackTargetY: number;
  attackStarted: boolean; nextAttackAt: number; rageActive: boolean; rageArmedAt: number;
  escapeTriggerTimes: number[]; targetFoodId: string | null; eatTimer: number;
  coopStayTime: number; secured: boolean; distanceTravelled: number;
};

export type GrainPile = Point & {
  id: string; radius: number; amount: number; attractionRadius: number;
  playerExclusionRadius: number; coopGateExclusionRadius: number;
  tooCloseToCoopGate: boolean; consumeAccumulator: number; age: number; active: boolean;
};

export type Coop = Point & { width: number; height: number; requiredStayTime: number; closed: boolean; gateWidth: number; wallThickness: number };
export type Obstacle = Point & { id: string; radius: number; kind: 'rock' | 'hay' };
export type ClapWave = Point & { id: string; radius: number; maxRadius: number; speed: number; width: number; hitChickenIds: Set<string> };
export type LuaGaEvent = 'collision' | 'attack' | 'success';

export type LuaGaWorld = {
  settings: LuaGaSettings;
  player: Player; chickens: Chicken[]; grainPiles: GrainPile[]; obstacles: Obstacle[];
  coop: Coop; clapWaves: ClapWave[]; elapsedTime: number; completed: boolean;
  failed: boolean; failureReason: 'time' | 'lives' | null; paused: boolean;
  playerLives: number; grainCharges: number; grainRechargeTimer: number;
  grainSequence: number; clapSequence: number; events: LuaGaEvent[];
  stats: { grainDropsUsed: number; clapsUsed: number; panicCount: number; roosterHits: number; coopBailed: number };
};

export type LuaGaSnapshot = {
  elapsedTime: number; timeRemaining: number; securedCount: number; chickenCount: number;
  completed: boolean; failed: boolean; failureReason: 'time' | 'lives' | null;
  paused: boolean; playerLives: number; maxPlayerLives: number;
  grainDropsRemaining: number; grainRechargeRemaining: number; coopClosed: boolean;
};

export type RandomSource = () => number;
