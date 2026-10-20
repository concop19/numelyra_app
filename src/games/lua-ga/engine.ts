import { LUA_GA_SETTINGS, type LuaGaSettings } from './config';
import type { Chicken, ChickenState, Coop, GrainPile, LuaGaEvent, LuaGaInputFrame, LuaGaSnapshot, LuaGaWorld, Obstacle, Player, Point, RandomSource } from './types';

const START_POSITIONS: Point[] = [
  { x: 430, y: 165 }, { x: 520, y: 250 }, { x: 390, y: 410 },
  { x: 610, y: 390 }, { x: 315, y: 290 }, { x: 560, y: 145 },
  { x: 470, y: 375 }, { x: 575, y: 535 }, { x: 675, y: 230 },
];
const ATTACK_STATES = new Set<ChickenState>(['ROOSTER_AIM', 'ROOSTER_CHARGE', 'ROOSTER_RECOVER']);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y);
  return length < 0.0001 ? { x: 1, y: 0 } : { x: x / length, y: y / length };
}
const between = (rng: RandomSource, min: number, max: number) => min + rng() * (max - min);
function randomDirection(rng: RandomSource): Point {
  const angle = between(rng, 0, Math.PI * 2);
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function createPlayer(settings: LuaGaSettings): Player {
  return {
    x: 150, y: 320, radius: 12, speed: settings.playerSpeed, velocityX: 0, velocityY: 0,
    directionX: 0, directionY: 1, sprintActiveTime: 0, sprintCooldownRemaining: 0,
    dashCooldownRemaining: 0, dashEffectRemaining: 0, dashEffectDuration: settings.playerDashEffectDuration,
    dashStartX: 150, dashStartY: 320, dashEndX: 150, dashEndY: 320, dashAiming: false,
    dashAimDirectionX: 0, dashAimDirectionY: 1, dashPreviewX: 150, dashPreviewY: 320,
  };
}

function createChicken(index: number, type: 'hen' | 'rooster', settings: LuaGaSettings, rng: RandomSource): Chicken {
  const direction = randomDirection(rng);
  const position = START_POSITIONS[index];
  const rooster = type === 'rooster';
  return {
    id: `chicken-${String(index + 1).padStart(2, '0')}`, type,
    x: position.x + between(rng, -24, 24), y: position.y + between(rng, -24, 24), radius: rooster ? 10 : 8,
    state: 'WANDER', previousState: 'WANDER', directionX: direction.x, directionY: direction.y,
    speed: settings.chickenWanderSpeed, alertRadius: settings.chickenAlertRadius,
    pressureRadius: settings.chickenPressureRadius, panicRadius: settings.chickenPanicRadius,
    wanderSpeed: settings.chickenWanderSpeed, escapeSpeed: rooster ? settings.roosterEscapeSpeed : settings.chickenEscapeSpeed,
    panicSpeed: rooster ? settings.roosterPanicSpeed : settings.chickenPanicSpeed, clapPanicSpeed: settings.clapPanicSpeed,
    wanderTimer: between(rng, 0.8, 2.2), peckTimer: 0, alertTimer: 0, escapeDistanceRemaining: 0,
    directionLockRemaining: 0, lastEscapeBase: direction, attackTelegraphRemaining: 0,
    attackDistanceRemaining: 0, attackRecoverRemaining: 0, attackTargetX: position.x, attackTargetY: position.y,
    attackStarted: false, nextAttackAt: rooster ? 12 : Infinity, rageActive: false, rageArmedAt: 0,
    escapeTriggerTimes: [], targetFoodId: null, eatTimer: 0, coopStayTime: 0, secured: false, distanceTravelled: 0,
  };
}

export function createLuaGaWorld(rng: RandomSource = Math.random, settings: LuaGaSettings = LUA_GA_SETTINGS): LuaGaWorld {
  return {
    settings,
    player: createPlayer(settings),
    chickens: Array.from({ length: 9 }, (_, index) => createChicken(index, index < 7 ? 'hen' : 'rooster', settings, rng)),
    grainPiles: [],
    obstacles: [
      { id: 'rock-01', x: 250, y: 180, radius: 20, kind: 'rock' },
      { id: 'rock-02', x: 705, y: 150, radius: 18, kind: 'rock' },
      { id: 'rock-03', x: 665, y: 505, radius: 22, kind: 'rock' },
      { id: 'hay-01', x: 480, y: 325, radius: 34, kind: 'hay' },
      { id: 'hay-02', x: 235, y: 480, radius: 30, kind: 'hay' },
    ],
    coop: { x: 790, y: 245, width: 160, height: 130, requiredStayTime: settings.coopRequiredStayTime, closed: true, gateWidth: settings.coopGateWidth, wallThickness: settings.coopWallThickness },
    clapWaves: [], elapsedTime: 0, completed: false, failed: false, failureReason: null, paused: false,
    playerLives: settings.playerLives, grainCharges: settings.grainDropCount, grainRechargeTimer: 0,
    grainSequence: 0, clapSequence: 0, events: [],
    stats: { grainDropsUsed: 0, clapsUsed: 0, panicCount: 0, roosterHits: 0, coopBailed: 0 },
  };
}

function keepInside(entity: Point & { radius: number; directionX?: number; directionY?: number }, settings: LuaGaSettings): boolean {
  const beforeX = entity.x; const beforeY = entity.y;
  entity.x = clamp(entity.x, entity.radius, settings.worldWidth - entity.radius);
  entity.y = clamp(entity.y, entity.radius, settings.worldHeight - entity.radius);
  if (entity.x !== beforeX && entity.directionX !== undefined) entity.directionX *= -1;
  if (entity.y !== beforeY && entity.directionY !== undefined) entity.directionY *= -1;
  return beforeX !== entity.x || beforeY !== entity.y;
}

function resolveCircle(entity: Point & { radius: number; directionX: number; directionY: number }, obstacle: Obstacle): boolean {
  const min = entity.radius + obstacle.radius;
  const d = distance(entity, obstacle);
  if (d >= min) return false;
  const push = normalize(entity.x - obstacle.x, entity.y - obstacle.y);
  entity.x = obstacle.x + push.x * min; entity.y = obstacle.y + push.y * min;
  const dot = entity.directionX * push.x + entity.directionY * push.y;
  entity.directionX -= 2 * dot * push.x; entity.directionY -= 2 * dot * push.y;
  const next = normalize(entity.directionX, entity.directionY);
  entity.directionX = next.x; entity.directionY = next.y;
  return true;
}

function resolveObstacles(entity: Player | Chicken, world: LuaGaWorld): boolean {
  return world.obstacles.reduce((hit, obstacle) => resolveCircle(entity, obstacle) || hit, false);
}

function gateBounds(coop: Coop) {
  const center = coop.y + coop.height / 2;
  return { top: center - coop.gateWidth / 2, bottom: center + coop.gateWidth / 2 };
}

function coopWalls(coop: Coop) {
  const t = coop.wallThickness; const gate = gateBounds(coop);
  const walls = [
    { x: coop.x, y: coop.y - t / 2, width: coop.width, height: t },
    { x: coop.x, y: coop.y + coop.height - t / 2, width: coop.width, height: t },
    { x: coop.x + coop.width - t / 2, y: coop.y, width: t, height: coop.height },
    { x: coop.x - t / 2, y: coop.y, width: t, height: gate.top - coop.y },
    { x: coop.x - t / 2, y: gate.bottom, width: t, height: coop.y + coop.height - gate.bottom },
  ];
  if (coop.closed) walls.push({ x: coop.x - t / 2, y: gate.top, width: t, height: coop.gateWidth });
  return walls;
}

function resolveRect(entity: Player | Chicken, rect: { x: number; y: number; width: number; height: number }): boolean {
  const closestX = clamp(entity.x, rect.x, rect.x + rect.width);
  const closestY = clamp(entity.y, rect.y, rect.y + rect.height);
  let ox = entity.x - closestX; let oy = entity.y - closestY;
  const d2 = ox * ox + oy * oy;
  if (d2 > entity.radius * entity.radius) return false;
  if (d2 < 0.0001) {
    const choices = [
      { d: Math.abs(entity.x - rect.x), x: rect.x - entity.radius, y: entity.y, nx: -1, ny: 0 },
      { d: Math.abs(rect.x + rect.width - entity.x), x: rect.x + rect.width + entity.radius, y: entity.y, nx: 1, ny: 0 },
      { d: Math.abs(entity.y - rect.y), x: entity.x, y: rect.y - entity.radius, nx: 0, ny: -1 },
      { d: Math.abs(rect.y + rect.height - entity.y), x: entity.x, y: rect.y + rect.height + entity.radius, nx: 0, ny: 1 },
    ].sort((a, b) => a.d - b.d)[0];
    entity.x = choices.x; entity.y = choices.y; ox = choices.nx; oy = choices.ny;
  } else {
    const d = Math.sqrt(d2); const push = entity.radius - d; ox /= d; oy /= d;
    entity.x += ox * push; entity.y += oy * push;
  }
  const dot = entity.directionX * ox + entity.directionY * oy;
  const next = normalize(entity.directionX - 2 * dot * ox, entity.directionY - 2 * dot * oy);
  entity.directionX = next.x; entity.directionY = next.y;
  return true;
}

function resolveCoop(entity: Player | Chicken, coop: Coop) {
  return coopWalls(coop).reduce((hit, wall) => resolveRect(entity, wall) || hit, false);
}

function insideCoop(chicken: Chicken, coop: Coop) {
  return chicken.x - chicken.radius >= coop.x && chicken.x + chicken.radius <= coop.x + coop.width
    && chicken.y - chicken.radius >= coop.y && chicken.y + chicken.radius <= coop.y + coop.height;
}

function setState(chicken: Chicken, next: ChickenState) {
  chicken.previousState = chicken.state; chicken.state = next;
}

function chooseEscape(chicken: Chicken, player: Player, world: LuaGaWorld, panic: boolean, d: number, rng: RandomSource) {
  const settings = world.settings; const center = normalize(chicken.x - player.x, chicken.y - player.y);
  const half = ((panic ? Math.min(150, settings.escapeConeAngle + 35) : settings.escapeConeAngle) * Math.PI) / 360;
  const angle = settings.escapeDistribution === 'center'
    ? (between(rng, -half, half) + between(rng, -half, half)) / 2 : between(rng, -half, half);
  chicken.directionX = center.x * Math.cos(angle) - center.y * Math.sin(angle);
  chicken.directionY = center.x * Math.sin(angle) + center.y * Math.cos(angle);
  chicken.lastEscapeBase = center;
  chicken.escapeDistanceRemaining = Math.max(between(rng, settings.minimumEscapeDistance, settings.maximumEscapeDistance), settings.chickenAlertRadius + settings.escapeExitBuffer - d);
  chicken.directionLockRemaining = between(rng, settings.minimumDirectionLockTime, settings.maximumDirectionLockTime);
}

function escapeSpeed(chicken: Chicken, d: number, world: LuaGaWorld, panic: boolean) {
  const multiplier = panic ? world.settings.chickenPanicBurstMultiplier : world.settings.chickenEscapeBurstMultiplier;
  return (panic ? chicken.panicSpeed : chicken.escapeSpeed) * (multiplier + (1 - clamp(d / chicken.alertRadius, 0, 1)) * multiplier * 0.75);
}

function activateRage(chicken: Chicken, world: LuaGaWorld) {
  if (chicken.attackStarted) return;
  chicken.rageActive = true; chicken.rageArmedAt = world.elapsedTime; chicken.escapeTriggerTimes = [];
}

function recordRoosterChase(chicken: Chicken, world: LuaGaWorld) {
  if (chicken.type !== 'rooster' || chicken.rageActive || chicken.attackStarted) return;
  chicken.escapeTriggerTimes.push(world.elapsedTime);
  chicken.escapeTriggerTimes = chicken.escapeTriggerTimes.filter(t => t >= world.elapsedTime - world.settings.roosterEscapeChaseWindow);
  if (chicken.escapeTriggerTimes.length >= world.settings.roosterEscapeChaseThreshold) activateRage(chicken, world);
}

function scheduleAttack(chicken: Chicken, world: LuaGaWorld, rng: RandomSource) {
  chicken.nextAttackAt = world.elapsedTime + between(rng, world.settings.roosterAttackMinInterval, world.settings.roosterAttackMaxInterval);
}

function updateRoosterAttack(chicken: Chicken, world: LuaGaWorld, dt: number, rng: RandomSource): boolean {
  const settings = world.settings;
  if (!chicken.attackStarted && !chicken.rageActive && world.elapsedTime >= chicken.nextAttackAt) activateRage(chicken, world);
  if (chicken.rageActive && !chicken.attackStarted) {
    if (distance(chicken, world.player) <= settings.roosterRageRadius) {
      const dir = normalize(world.player.x - chicken.x, world.player.y - chicken.y);
      chicken.rageActive = false; chicken.attackStarted = true; chicken.attackTelegraphRemaining = settings.roosterAttackTelegraphTime;
      chicken.attackDistanceRemaining = settings.roosterAttackDistance; chicken.directionX = dir.x; chicken.directionY = dir.y;
      chicken.speed = 0; setState(chicken, 'ROOSTER_AIM'); world.events.push('attack'); return true;
    }
    if (world.elapsedTime - chicken.rageArmedAt >= settings.roosterRageTimeout) { chicken.rageActive = false; scheduleAttack(chicken, world, rng); }
    return false;
  }
  if (chicken.state === 'ROOSTER_AIM') {
    if (distance(chicken, world.player) > settings.roosterRageRadius) {
      chicken.attackStarted = false; scheduleAttack(chicken, world, rng); setState(chicken, 'WANDER'); return false;
    }
    const dir = normalize(world.player.x - chicken.x, world.player.y - chicken.y);
    chicken.directionX = dir.x; chicken.directionY = dir.y; chicken.attackTelegraphRemaining -= dt; chicken.speed = 0;
    if (chicken.attackTelegraphRemaining <= 0) { setState(chicken, 'ROOSTER_CHARGE'); chicken.speed = settings.roosterAttackSpeed; }
    return true;
  }
  if (chicken.state === 'ROOSTER_CHARGE') { chicken.speed = settings.roosterAttackSpeed; return true; }
  if (chicken.state === 'ROOSTER_RECOVER') {
    chicken.attackRecoverRemaining -= dt; chicken.speed = 0;
    if (chicken.attackRecoverRemaining <= 0) { chicken.attackStarted = false; scheduleAttack(chicken, world, rng); setState(chicken, 'WANDER'); }
    return true;
  }
  return false;
}

function findFood(chicken: Chicken, world: LuaGaWorld) {
  return world.grainPiles.filter(p => p.active && p.amount > 0 && !p.tooCloseToCoopGate
    && distance(chicken, p) <= p.attractionRadius && distance(world.player, p) >= p.playerExclusionRadius)
    .sort((a, b) => distance(chicken, a) - distance(chicken, b))[0];
}

function updateChickenIntent(chicken: Chicken, world: LuaGaWorld, dt: number, rng: RandomSource) {
  const settings = world.settings;
  chicken.directionLockRemaining = Math.max(0, chicken.directionLockRemaining - dt);
  if (chicken.type === 'rooster' && updateRoosterAttack(chicken, world, dt, rng)) return;
  const d = distance(chicken, world.player);
  const continuing = ['ESCAPE', 'PANIC', 'CLAP_PANIC'].includes(chicken.state) && chicken.escapeDistanceRemaining > 0 && chicken.directionLockRemaining > 0;
  if (d <= chicken.panicRadius) {
    if (chicken.state !== 'PANIC' || chicken.directionLockRemaining <= 0) { chooseEscape(chicken, world.player, world, true, d, rng); world.stats.panicCount += 1; recordRoosterChase(chicken, world); }
    setState(chicken, 'PANIC'); chicken.speed = escapeSpeed(chicken, d, world, true); return;
  }
  if (continuing) { chicken.speed = chicken.state === 'CLAP_PANIC' ? settings.clapPanicSpeed : escapeSpeed(chicken, d, world, chicken.state === 'PANIC'); return; }
  if (d <= chicken.alertRadius) {
    if (chicken.state !== 'ESCAPE' || chicken.escapeDistanceRemaining <= 0 || chicken.directionLockRemaining <= 0) { chooseEscape(chicken, world.player, world, false, d, rng); recordRoosterChase(chicken, world); }
    setState(chicken, 'ESCAPE'); chicken.speed = escapeSpeed(chicken, d, world, false); return;
  }
  const food = chicken.type === 'hen' ? findFood(chicken, world) : undefined;
  if (food) {
    chicken.targetFoodId = food.id;
    if (distance(chicken, food) <= chicken.radius + 10) {
      setState(chicken, 'EAT'); chicken.speed = 0; food.consumeAccumulator += dt;
      while (food.consumeAccumulator >= settings.grainConsumeInterval && food.amount > 0) { food.amount -= 1; food.consumeAccumulator -= settings.grainConsumeInterval; }
      return;
    }
    const dir = normalize(food.x - chicken.x, food.y - chicken.y); chicken.directionX = dir.x; chicken.directionY = dir.y;
    chicken.speed = 35; setState(chicken, 'GO_TO_FOOD'); return;
  }
  chicken.targetFoodId = null;
  if (chicken.state === 'PECK') {
    chicken.peckTimer -= dt; chicken.speed = 0;
    if (chicken.peckTimer <= 0) { const dir = randomDirection(rng); chicken.directionX = dir.x; chicken.directionY = dir.y; chicken.wanderTimer = between(rng, 1, 3); setState(chicken, 'WANDER'); }
    return;
  }
  if (chicken.state !== 'WANDER') { setState(chicken, 'WANDER'); chicken.wanderTimer = between(rng, 0.7, 2.3); }
  chicken.speed = settings.chickenWanderSpeed; chicken.wanderTimer -= dt;
  if (chicken.wanderTimer <= 0) {
    if (rng() < 0.35) { setState(chicken, 'PECK'); chicken.peckTimer = between(rng, 0.5, 1.5); chicken.speed = 0; }
    else { const dir = randomDirection(rng); chicken.directionX = dir.x; chicken.directionY = dir.y; chicken.wanderTimer = between(rng, 1, 3); }
  }
}

function moveChicken(chicken: Chicken, world: LuaGaWorld, dt: number) {
  if (chicken.speed <= 0 || (chicken.secured && world.coop.closed)) return;
  const movement = chicken.speed * dt;
  chicken.x += chicken.directionX * movement; chicken.y += chicken.directionY * movement;
  if (['ESCAPE', 'PANIC', 'CLAP_PANIC'].includes(chicken.state)) chicken.escapeDistanceRemaining -= movement;
  if (chicken.state === 'ROOSTER_CHARGE') {
    chicken.attackDistanceRemaining -= movement;
    if (distance(chicken, world.player) <= chicken.radius + world.player.radius + 4) {
      world.playerLives = Math.max(0, world.playerLives - 1); world.stats.roosterHits += 1; world.events.push('collision');
      world.player.x += chicken.directionX * 70; world.player.y += chicken.directionY * 70;
      keepInside(world.player, world.settings); resolveObstacles(world.player, world); chicken.attackDistanceRemaining = 0;
      if (world.playerLives === 0) { world.failed = true; world.failureReason = 'lives'; world.paused = true; }
    }
  }
  const hit = keepInside(chicken, world.settings) || resolveObstacles(chicken, world);
  resolveCoop(chicken, world.coop);
  if (chicken.state === 'ROOSTER_CHARGE' && (hit || chicken.attackDistanceRemaining <= 0)) {
    setState(chicken, 'ROOSTER_RECOVER'); chicken.speed = 0; chicken.attackRecoverRemaining = world.settings.roosterAttackRecoverTime;
  } else if (hit && !ATTACK_STATES.has(chicken.state)) { chicken.escapeDistanceRemaining = 0; chicken.directionLockRemaining = 0; }
}

function updatePlayer(world: LuaGaWorld, input: LuaGaInputFrame, dt: number) {
  const player = world.player; const settings = world.settings;
  player.sprintActiveTime = Math.max(0, player.sprintActiveTime - dt);
  if (player.sprintActiveTime <= 0) player.sprintCooldownRemaining = Math.max(0, player.sprintCooldownRemaining - dt);
  player.dashCooldownRemaining = Math.max(0, player.dashCooldownRemaining - dt);
  player.dashEffectRemaining = Math.max(0, player.dashEffectRemaining - dt);
  const magnitude = Math.min(1, Math.hypot(input.moveX, input.moveY));
  const moving = magnitude > 0.08; const dir = moving ? normalize(input.moveX, input.moveY) : { x: player.directionX, y: player.directionY };
  if (moving) { player.directionX = dir.x; player.directionY = dir.y; }
  if (input.sprint && moving && player.sprintActiveTime <= 0 && player.sprintCooldownRemaining <= 0) {
    player.sprintActiveTime = settings.playerSprintDuration; player.sprintCooldownRemaining = settings.playerSprintCooldown;
  }
  if (input.dashHeld && player.dashCooldownRemaining <= 0) {
    player.dashAiming = true; player.dashAimDirectionX = dir.x; player.dashAimDirectionY = dir.y;
    player.dashPreviewX = player.x + dir.x * settings.playerDashDistance; player.dashPreviewY = player.y + dir.y * settings.playerDashDistance;
  }
  if (input.dashReleased) {
    if (player.dashAiming && player.dashCooldownRemaining <= 0) {
      player.dashStartX = player.x; player.dashStartY = player.y;
      player.x += player.dashAimDirectionX * settings.playerDashDistance; player.y += player.dashAimDirectionY * settings.playerDashDistance;
      keepInside(player, settings); resolveObstacles(player, world); resolveCoop(player, world.coop);
      player.dashEndX = player.x; player.dashEndY = player.y;
      player.dashEffectRemaining = settings.playerDashEffectDuration; player.dashCooldownRemaining = settings.playerDashCooldown;
    }
    player.dashAiming = false;
  } else if (!input.dashHeld) player.dashAiming = false;
  if (!player.dashAiming) {
    const speed = player.sprintActiveTime > 0 ? settings.playerSpeed * settings.playerSprintMultiplier : settings.playerSpeed;
    player.velocityX = moving ? dir.x * speed * magnitude : 0; player.velocityY = moving ? dir.y * speed * magnitude : 0;
    player.x += player.velocityX * dt; player.y += player.velocityY * dt;
    keepInside(player, settings); resolveObstacles(player, world); resolveCoop(player, world.coop);
  }
}

function dropGrain(world: LuaGaWorld) {
  if (world.grainCharges <= 0) return;
  world.grainSequence += 1; const settings = world.settings;
  const pile: GrainPile = { id: `grain-${world.grainSequence}`, x: world.player.x, y: world.player.y, radius: 6,
    amount: settings.grainAmountPerDrop, attractionRadius: settings.grainAttractionRadius,
    playerExclusionRadius: settings.grainPlayerExclusionRadius, coopGateExclusionRadius: settings.grainCoopGateExclusionRadius,
    tooCloseToCoopGate: false, consumeAccumulator: 0, age: 0, active: true };
  pile.tooCloseToCoopGate = distance(pile, { x: world.coop.x, y: world.coop.y + world.coop.height / 2 }) < settings.grainCoopGateExclusionRadius;
  world.grainPiles.push(pile); world.grainCharges -= 1; world.stats.grainDropsUsed += 1;
}

function createClap(world: LuaGaWorld) {
  world.clapSequence += 1; world.stats.clapsUsed += 1;
  world.clapWaves.push({ id: `clap-${world.clapSequence}`, x: world.player.x, y: world.player.y, radius: 0,
    maxRadius: world.settings.clapWaveRadius, speed: world.settings.clapWaveSpeed, width: world.settings.clapWaveWidth, hitChickenIds: new Set() });
}

function updateResources(world: LuaGaWorld, dt: number, rng: RandomSource) {
  const settings = world.settings;
  if (world.grainCharges < settings.grainDropCount) {
    world.grainRechargeTimer += dt;
    while (world.grainRechargeTimer >= settings.grainRechargeInterval && world.grainCharges < settings.grainDropCount) { world.grainCharges += 1; world.grainRechargeTimer -= settings.grainRechargeInterval; }
  } else world.grainRechargeTimer = 0;
  for (const pile of world.grainPiles) { pile.age += dt; if (pile.age >= settings.grainLifetime || pile.amount <= 0) pile.active = false; }
  world.grainPiles = world.grainPiles.filter(p => p.active);
  for (const wave of world.clapWaves) {
    wave.radius += wave.speed * dt;
    for (const chicken of world.chickens) {
      if (wave.hitChickenIds.has(chicken.id) || Math.abs(distance(wave, chicken) - wave.radius) > wave.width + chicken.radius) continue;
      wave.hitChickenIds.add(chicken.id); if (chicken.secured && world.coop.closed) continue;
      const dir = randomDirection(rng); chicken.secured = false; chicken.coopStayTime = 0; setState(chicken, 'CLAP_PANIC');
      chicken.directionX = dir.x; chicken.directionY = dir.y; chicken.lastEscapeBase = dir; chicken.speed = settings.clapPanicSpeed;
      chicken.escapeDistanceRemaining = settings.clapRunDistance; chicken.directionLockRemaining = settings.clapDirectionLockTime;
      world.stats.panicCount += 1; world.events.push('collision');
    }
  }
  world.clapWaves = world.clapWaves.filter(w => w.radius <= w.maxRadius + w.width);
}

function separateChickens(world: LuaGaWorld) {
  const active = world.chickens.filter(c => !c.secured);
  for (let i = 0; i < active.length; i += 1) for (let j = i + 1; j < active.length; j += 1) {
    const a = active[i]; const b = active[j]; const min = a.radius + b.radius + 2; const d = distance(a, b);
    if (d > 0 && d < min) { const n = normalize(a.x - b.x, a.y - b.y); const push = (min - d) / 2; a.x += n.x * push; a.y += n.y * push; b.x -= n.x * push; b.y -= n.y * push; }
  }
}

function updateCoop(world: LuaGaWorld, dt: number) {
  for (const chicken of world.chickens) {
    if (chicken.secured) {
      if (world.coop.closed) { setState(chicken, 'SECURED'); chicken.speed = 0; continue; }
      if (!insideCoop(chicken, world.coop)) { chicken.secured = false; chicken.coopStayTime = 0; setState(chicken, 'COOP_RELEASED'); world.stats.coopBailed += 1; }
      else if (!['ESCAPE', 'PANIC', 'CLAP_PANIC'].includes(chicken.state)) setState(chicken, 'COOP_OPEN');
      continue;
    }
    if (insideCoop(chicken, world.coop) && world.coop.closed) {
      chicken.coopStayTime += dt; if (!['ESCAPE', 'PANIC'].includes(chicken.state)) setState(chicken, 'ENTERING_COOP');
      if (chicken.coopStayTime >= world.coop.requiredStayTime) { chicken.secured = true; chicken.speed = 0; setState(chicken, 'SECURED'); world.events.push('success'); }
    } else if (chicken.coopStayTime > 0) { chicken.coopStayTime = 0; world.stats.coopBailed += 1; }
  }
  if (world.chickens.every(c => c.secured)) { world.completed = true; world.paused = true; world.coop.closed = true; }
}

export function stepLuaGaWorld(world: LuaGaWorld, input: LuaGaInputFrame, deltaTime: number, rng: RandomSource = Math.random) {
  if (world.paused || world.completed || world.failed) return;
  const dt = Math.min(0.05, Math.max(0, deltaTime)); world.elapsedTime += dt;
  if (input.toggleCoop) world.coop.closed = !world.coop.closed;
  if (input.dropGrain) dropGrain(world);
  if (input.clap) createClap(world);
  updatePlayer(world, input, dt); updateResources(world, dt, rng);
  for (const chicken of world.chickens) { if (chicken.secured && world.coop.closed) continue; updateChickenIntent(chicken, world, dt, rng); moveChicken(chicken, world, dt); }
  separateChickens(world); updateCoop(world, dt);
  if (!world.completed && world.elapsedTime >= world.settings.challengeDuration) { world.failed = true; world.failureReason = 'time'; world.paused = true; }
}

export function snapshotLuaGaWorld(world: LuaGaWorld): LuaGaSnapshot {
  return {
    elapsedTime: world.elapsedTime, timeRemaining: Math.max(0, world.settings.challengeDuration - world.elapsedTime),
    securedCount: world.chickens.filter(c => c.secured).length, chickenCount: world.chickens.length,
    completed: world.completed, failed: world.failed, failureReason: world.failureReason, paused: world.paused,
    playerLives: world.playerLives, maxPlayerLives: world.settings.playerLives, grainDropsRemaining: world.grainCharges,
    grainRechargeRemaining: world.grainCharges >= world.settings.grainDropCount ? 0 : Math.max(0, world.settings.grainRechargeInterval - world.grainRechargeTimer),
    coopClosed: world.coop.closed,
  };
}

export function consumeLuaGaEvents(world: LuaGaWorld): LuaGaEvent[] {
  return world.events.splice(0, world.events.length);
}

export function setLuaGaPaused(world: LuaGaWorld, paused: boolean) {
  if (!world.completed && !world.failed) world.paused = paused;
}
