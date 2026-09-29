import { SpaceEngine } from './spaceEngine';

describe('SpaceEngine tuning', () => {
  it('starts with a constrained ammo reserve', () => {
    const engine = new SpaceEngine(360, 300);

    expect(engine.state.ammo).toBe(10);
    expect(engine.state.maxAmmo).toBe(30);
  });

  it('caps legacy reload rewards and treats shield as defense only', () => {
    const engine = new SpaceEngine(360, 300);
    engine.state.ammo = 0;

    engine.addAmmo('NORMAL', 18);
    expect(engine.state.ammo).toBe(5);

    engine.addAmmo('MISSILE', 5);
    expect(engine.state.ammo).toBe(7);

    engine.addAmmo('SHIELD', 8);
    expect(engine.state.ammo).toBe(7);
    expect(engine.state.shieldTimer).toBe(7);
  });

  it('keeps the ship inside the playable lower combat area', () => {
    const engine = new SpaceEngine(360, 300);

    engine.setPlayerPosition(-100, -100);
    expect(engine.playerX).toBe(engine.shipRadius + 5);
    expect(engine.playerY).toBe(300 * 0.45);

    engine.setPlayerPosition(1000, 1000);
    expect(engine.playerX).toBe(360 - engine.shipRadius - 5);
    expect(engine.playerY).toBe(300 - engine.shipRadius - 10);
  });
});
