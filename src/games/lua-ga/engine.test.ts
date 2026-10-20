import { LUA_GA_SETTINGS } from './config';
import { createLuaGaWorld, snapshotLuaGaWorld, stepLuaGaWorld } from './engine';
import { EMPTY_INPUT, type LuaGaInputFrame } from './types';

const rng = () => 0.5;
const input = (update: Partial<LuaGaInputFrame> = {}): LuaGaInputFrame => ({ ...EMPTY_INPUT, ...update });

describe('Lua Ga engine', () => {
  it('creates the source-of-truth challenge with seven hens and two roosters', () => {
    const world = createLuaGaWorld(rng);
    expect(world.chickens).toHaveLength(9);
    expect(world.chickens.filter(chicken => chicken.type === 'hen')).toHaveLength(7);
    expect(world.chickens.filter(chicken => chicken.type === 'rooster')).toHaveLength(2);
    expect(snapshotLuaGaWorld(world)).toMatchObject({ timeRemaining: 480, playerLives: 5, grainDropsRemaining: 3 });
  });

  it('moves with analog input, clamps to the field and activates sprint at the rim', () => {
    const world = createLuaGaWorld(rng);
    const start = world.player.x;
    stepLuaGaWorld(world, input({ moveX: 1, sprint: true }), 0.05, rng);
    expect(world.player.x).toBeGreaterThan(start);
    expect(world.player.sprintActiveTime).toBeGreaterThan(0);
    world.player.x = LUA_GA_SETTINGS.worldWidth - 1;
    stepLuaGaWorld(world, input({ moveX: 1 }), 0.05, rng);
    expect(world.player.x).toBeLessThanOrEqual(LUA_GA_SETTINGS.worldWidth - world.player.radius);
  });

  it('drops grain and restores a charge after the recharge interval', () => {
    const world = createLuaGaWorld(rng);
    stepLuaGaWorld(world, input({ dropGrain: true }), 0.01, rng);
    expect(world.grainPiles).toHaveLength(1);
    expect(world.grainCharges).toBe(2);
    for (let index = 0; index < 201; index += 1) stepLuaGaWorld(world, input(), 0.05, rng);
    expect(world.grainCharges).toBe(3);
  });

  it('applies each clap wave to a chicken only once', () => {
    const world = createLuaGaWorld(rng);
    const chicken = world.chickens[0];
    chicken.x = world.player.x + 40; chicken.y = world.player.y;
    stepLuaGaWorld(world, input({ clap: true }), 0.05, rng);
    const wave = world.clapWaves[0];
    for (let index = 0; index < 5; index += 1) stepLuaGaWorld(world, input(), 0.05, rng);
    expect(wave.hitChickenIds.has(chicken.id)).toBe(true);
    expect(Array.from(wave.hitChickenIds).filter(id => id === chicken.id)).toHaveLength(1);
  });

  it('secures all chickens only with a closed gate and completes the run', () => {
    const world = createLuaGaWorld(rng);
    world.chickens.forEach((chicken, index) => {
      chicken.x = world.coop.x + 25 + index * 10;
      chicken.y = world.coop.y + 45;
      chicken.speed = 0;
      chicken.alertRadius = 0;
    });
    for (let index = 0; index < 14; index += 1) stepLuaGaWorld(world, input(), 0.05, rng);
    expect(world.chickens.every(chicken => chicken.secured)).toBe(true);
    expect(world.completed).toBe(true);
  });

  it('releases a secured chicken after the gate opens and it leaves the coop', () => {
    const world = createLuaGaWorld(rng);
    const chicken = world.chickens[0]; chicken.secured = true; chicken.x = world.coop.x + 40; chicken.y = world.coop.y + 40;
    stepLuaGaWorld(world, input({ toggleCoop: true }), 0.01, rng);
    chicken.x = world.coop.x - 30;
    stepLuaGaWorld(world, input(), 0.01, rng);
    expect(chicken.secured).toBe(false);
  });

  it('aims and charges a rooster after the attack timer', () => {
    const world = createLuaGaWorld(rng); const rooster = world.chickens[7];
    rooster.x = world.player.x + 100; rooster.y = world.player.y; world.elapsedTime = 12;
    stepLuaGaWorld(world, input(), 0.05, rng);
    expect(rooster.state).toBe('ROOSTER_AIM');
    for (let index = 0; index < 61; index += 1) stepLuaGaWorld(world, input(), 0.05, rng);
    expect(['ROOSTER_CHARGE', 'ROOSTER_RECOVER']).toContain(rooster.state);
  });

  it('performs dash on release and enforces cooldown', () => {
    const world = createLuaGaWorld(rng); const start = world.player.x;
    stepLuaGaWorld(world, input({ moveX: 1, dashHeld: true }), 0.01, rng);
    stepLuaGaWorld(world, input({ moveX: 1, dashReleased: true }), 0.01, rng);
    expect(world.player.x).toBeGreaterThan(start + 90);
    expect(world.player.dashCooldownRemaining).toBeGreaterThan(0);
  });

  it('fails when time expires or lives reach zero', () => {
    const timed = createLuaGaWorld(rng); timed.elapsedTime = LUA_GA_SETTINGS.challengeDuration - 0.01;
    stepLuaGaWorld(timed, input(), 0.05, rng);
    expect(timed).toMatchObject({ failed: true, failureReason: 'time', paused: true });

    const lives = createLuaGaWorld(rng); const rooster = lives.chickens[7]; lives.playerLives = 1;
    rooster.state = 'ROOSTER_CHARGE'; rooster.attackStarted = true; rooster.attackDistanceRemaining = 30;
    rooster.x = lives.player.x - rooster.radius - lives.player.radius; rooster.y = lives.player.y; rooster.directionX = 1; rooster.directionY = 0;
    stepLuaGaWorld(lives, input(), 0.01, rng);
    expect(lives).toMatchObject({ playerLives: 0, failed: true, failureReason: 'lives' });
  });
});
