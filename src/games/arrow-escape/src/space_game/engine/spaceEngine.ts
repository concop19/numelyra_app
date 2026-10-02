import {
  AMMO_CONFIGS,
  AmmoType,
  Bullet,
  Chicken,
  EggBomb,
  FloatingText,
  Particle,
  SpaceGameState,
} from '../types';

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

export class SpaceEngine {
  width: number = 360;
  height: number = 360;

  // Player ship
  playerX: number = 180;
  playerY: number = 300;
  shipRadius: number = 18;
  invulnerableTimer: number = 0;
  shootCooldown: number = 0;
  isShooting: boolean = true; // Auto-fire as long as ammo available

  // Game state
  state: SpaceGameState = {
    score: 0,
    wave: 1,
    ammo: 10,
    maxAmmo: 30,
    health: 3,
    maxHealth: 3,
    overdriveTimer: 0,
    shieldTimer: 0,
    chickensDefeated: 0,
    status: 'PLAYING',
  };

  currentAmmoType: AmmoType = 'NORMAL';

  // Game entities
  chickens: Chicken[] = [];
  bullets: Bullet[] = [];
  eggBombs: EggBomb[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  stars: Star[] = [];

  // Wave transition
  waveTransitionTimer: number = 0;

  // Sound callback
  onSound?: (name: 'shoot' | 'laser' | 'missile' | 'hit' | 'explode' | 'egg' | 'reload' | 'overdrive' | 'hurt' | 'shotOne' | 'shotTwo' | 'shotMany') => void;

  constructor(width = 360, height = 360) {
    this.init(width, height);
  }

  init(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.playerX = width / 2;
    this.playerY = height - 45;

    this.state = {
      score: 0,
      wave: 1,
      // Ammo is intentionally scarce: the reload puzzle should be part of the
      // combat loop, not a one-time formality at the beginning of a run.
      ammo: 10,
      maxAmmo: 30,
      health: 3,
      maxHealth: 3,
      overdriveTimer: 0,
      shieldTimer: 0,
      chickensDefeated: 0,
      status: 'PLAYING',
    };

    this.currentAmmoType = 'NORMAL';
    this.chickens = [];
    this.bullets = [];
    this.eggBombs = [];
    this.particles = [];
    this.floatingTexts = [];
    this.invulnerableTimer = 0;
    this.shootCooldown = 0;
    this.isShooting = true;

    // Init background stars
    this.stars = [];
    for (let i = 0; i < 20; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }

    this.spawnWave(1);
  }

  setPlayerPosition(x: number, y: number) {
    this.playerX = Math.max(this.shipRadius + 5, Math.min(this.width - this.shipRadius - 5, x));
    this.playerY = Math.max(this.height * 0.45, Math.min(this.height - this.shipRadius - 10, y));
  }

  addAmmo(type: AmmoType, customCount?: number) {
    const config = AMMO_CONFIGS[type];
    let ammoCount = customCount ?? 0;

    if (customCount === undefined) {
      if (type === 'NORMAL') {
        ammoCount = 5;
      } else if (type === 'SCATTER') {
        ammoCount = 4;
      } else if (type === 'MISSILE') {
        ammoCount = 2;
      } else if (type === 'SHIELD') {
        ammoCount = 0;
      }
    }

    // Level data used to grant up to 18 rounds for a single tap. Keep old
    // boards compatible, but cap their rewards at the tuned values.
    const reloadCap: Record<AmmoType, number> = {
      NORMAL: 5,
      SCATTER: 4,
      MISSILE: 2,
      SHIELD: 0,
    };
    ammoCount = Math.max(0, Math.min(ammoCount, reloadCap[type]));

    if (type === 'SHIELD') {
      this.state.shieldTimer = Math.min(12, this.state.shieldTimer + 7);
    } else {
      this.currentAmmoType = type;
    }

    this.state.ammo = Math.min(this.state.maxAmmo, this.state.ammo + ammoCount);

    const rewardText = type === 'SHIELD' ? 'KHIÊN +7s' : `+${ammoCount} ${config.icon}`;
    this.addFloatingText(this.playerX, this.playerY - 25, rewardText, config.color);
    // Create sparks around player ship
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        id: `p_reload_${Date.now()}_${i}`,
        x: this.playerX,
        y: this.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: config.color,
        size: 3 + Math.random() * 2,
        life: 0.5,
        maxLife: 0.5,
      });
    }
  }

  triggerOverdrive(seconds = 5) {
    this.state.overdriveTimer = seconds;
    this.addFloatingText(this.width / 2, this.height * 0.35, '⚡ OVERDRIVE! UNLIMITED AMMO! ⚡', '#00E5FF');
    this.onSound?.('overdrive');

    // Burst of particles
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        id: `p_od_${Date.now()}_${i}`,
        x: this.width / 2,
        y: this.height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? '#00E5FF' : '#FFD600',
        size: 3 + Math.random() * 3,
        life: 0.8,
        maxLife: 0.8,
      });
    }
  }

  spawnWave(waveNum: number) {
    this.chickens = [];
    const isBossWave = waveNum % 3 === 0;

    if (isBossWave) {
      // Spawn Boss Rooster
      this.chickens.push({
        id: `boss_${waveNum}`,
        x: this.width / 2,
        y: 60,
        baseX: this.width / 2,
        baseY: 60,
        vx: 1.2,
        vy: 0,
        health: 25 + waveNum * 5,
        maxHealth: 25 + waveNum * 5,
        type: 'BOSS',
        shootCooldown: 1.2,
        shootTimer: 0.5,
        radius: 32,
        phase: 0,
      });

      // Flanking minions
      for (let i = 0; i < 4; i++) {
        const x = this.width * (0.15 + i * 0.23);
        this.chickens.push({
          id: `c_${waveNum}_escort_${i}`,
          x,
          y: 110,
          baseX: x,
          baseY: 110,
          vx: 1,
          vy: 0,
          health: 2,
          maxHealth: 2,
          type: 'ARMORED',
          shootCooldown: 2.2,
          shootTimer: Math.random() * 2,
          radius: 16,
          phase: i * 0.5,
        });
      }
    } else {
      // Grid of regular & armored chickens
      const rows = 2 + Math.min(2, Math.floor(waveNum / 2));
      const cols = 5;
      const startX = this.width * 0.12;
      const spacingX = (this.width * 0.76) / (cols - 1);
      const startY = 40;
      const spacingY = 36;

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isArmored = (r === 0 && waveNum > 1) || Math.random() < 0.25;
          const x = startX + c * spacingX;
          const y = startY + r * spacingY;
          this.chickens.push({
            id: `c_${waveNum}_${idx++}`,
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 1,
            vy: 0,
            health: isArmored ? 3 : 1,
            maxHealth: isArmored ? 3 : 1,
            type: isArmored ? 'ARMORED' : 'MINION',
            shootCooldown: 3.0 + Math.random() * 2.5,
            shootTimer: 1.0 + Math.random() * 3.0,
            radius: isArmored ? 16 : 13,
            phase: c * 0.4 + r * 0.8,
          });
        }
      }
    }

    this.addFloatingText(this.width / 2, 70, `WAVE ${waveNum}`, '#FFD700');
  }

  addFloatingText(x: number, y: number, text: string, color = '#FFFFFF') {
    if (this.floatingTexts.length >= 3) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      life: 0.9,
    });
  }

  update(dt: number) {
    if (this.state.status === 'GAMEOVER') return;

    // Cap particle array to keep memory and loop tight
    if (this.particles.length > 25) {
      this.particles.splice(0, this.particles.length - 25);
    }

    // Cap delta time to avoid large physics steps
    const delta = Math.min(0.05, dt);

    // Overdrive & Shield timers
    if (this.state.overdriveTimer > 0) {
      this.state.overdriveTimer -= delta;
      if (this.state.overdriveTimer < 0) this.state.overdriveTimer = 0;
    }

    if (this.state.shieldTimer > 0) {
      this.state.shieldTimer -= delta;
      if (this.state.shieldTimer < 0) this.state.shieldTimer = 0;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer < 0) this.invulnerableTimer = 0;
    }

    // Stars scrolling
    const starSpeedMult = this.state.overdriveTimer > 0 ? 3.5 : 1.0;
    for (const star of this.stars) {
      star.y += star.speed * starSpeedMult * 40 * delta;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // Shooting logic
    this.shootCooldown -= delta;
    const isOverdrive = this.state.overdriveTimer > 0;
    const fireInterval = isOverdrive ? 0.08 : 0.16;

    if (this.isShooting && this.shootCooldown <= 0) {
      if (isOverdrive || this.state.ammo > 0) {
        this.fireShot(isOverdrive);
        this.shootCooldown = fireInterval;
        if (!isOverdrive) {
          this.state.ammo--;
        }
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;

      // Homing missile behavior
      if (b.type === 'MISSILE') {
        const target = this.findNearestChicken(b.x, b.y);
        if (target) {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const angle = Math.atan2(dy, dx);
          const currentSpeed = Math.hypot(b.vx, b.vy) || 350;
          b.vx += Math.cos(angle) * 800 * delta;
          b.vy += Math.sin(angle) * 800 * delta;
          // Normalise to speed
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = (b.vx / speed) * currentSpeed;
          b.vy = (b.vy / speed) * currentSpeed;
        }
      }

      b.x += b.vx * delta;
      b.y += b.vy * delta;

      // Remove offscreen
      if (b.y < -20 || b.x < -20 || b.x > this.width + 20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision against chickens
      let hit = false;
      for (let j = this.chickens.length - 1; j >= 0; j--) {
        const c = this.chickens[j]!;
        const dist = Math.hypot(c.x - b.x, c.y - b.y);
        if (dist <= c.radius + 6) {
          c.health -= b.damage;
          hit = true;
          this.onSound?.('hit');

          // Hit spark particles
          for (let p = 0; p < 4; p++) {
            this.particles.push({
              id: `p_hit_${Date.now()}_${p}`,
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              color: b.type === 'MISSILE' ? '#FF1744' : '#FFFF00',
              size: 2 + Math.random() * 2,
              life: 0.25,
              maxLife: 0.25,
            });
          }

          // Chicken dead?
          if (c.health <= 0) {
            const points = c.type === 'BOSS' ? 1000 : c.type === 'ARMORED' ? 250 : 100;
            this.state.score += points;
            this.state.chickensDefeated++;
            this.addFloatingText(c.x, c.y - 10, `+${points}`, '#FFD700');
            this.onSound?.('explode');

            // Explosion particles
            const count = c.type === 'BOSS' ? 35 : 14;
            for (let p = 0; p < count; p++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 40 + Math.random() * 160;
              this.particles.push({
                id: `p_exp_${Date.now()}_${p}`,
                x: c.x,
                y: c.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: p % 3 === 0 ? '#FF5722' : p % 3 === 1 ? '#FFEB3B' : '#FFFFFF',
                size: 3 + Math.random() * 4,
                life: 0.6,
                maxLife: 0.6,
              });
            }

            this.chickens.splice(j, 1);
          }
          break;
        }
      }

      if (hit) {
        this.bullets.splice(i, 1);
      }
    }

    // Update Chickens
    for (const c of this.chickens) {
      c.phase += delta * 2;
      // Formation sway
      c.x = c.baseX + Math.sin(c.phase) * (c.type === 'BOSS' ? 60 : 35);
      c.y = c.baseY + Math.sin(c.phase * 1.5) * 10;

      // Shooting eggs
      c.shootTimer -= delta;
      if (c.shootTimer <= 0) {
        c.shootTimer = c.shootCooldown * (0.8 + Math.random() * 0.4);
        this.dropEgg(c);
      }
    }

    // Wave Cleared Check
    if (this.chickens.length === 0) {
      this.waveTransitionTimer += delta;
      if (this.waveTransitionTimer > 1.2) {
        this.waveTransitionTimer = 0;
        this.state.wave++;
        this.state.score += 500;
        this.spawnWave(this.state.wave);
      }
    }

    // Update Egg Bombs
    for (let i = this.eggBombs.length - 1; i >= 0; i--) {
      const egg = this.eggBombs[i]!;
      egg.x += egg.vx * delta;
      egg.y += egg.vy * delta;

      // Offscreen bottom
      if (egg.y > this.height + 20) {
        this.eggBombs.splice(i, 1);
        continue;
      }

      // Check collision with player ship
      const dist = Math.hypot(egg.x - this.playerX, egg.y - this.playerY);
      if (dist <= egg.radius + this.shipRadius) {
        this.eggBombs.splice(i, 1);

        if (this.state.shieldTimer > 0) {
          // Shield absorbs!
          this.onSound?.('hit');
          this.addFloatingText(this.playerX, this.playerY - 20, 'BLOCKED 🛡️', '#D500F9');
          for (let p = 0; p < 8; p++) {
            this.particles.push({
              id: `p_sh_${Date.now()}_${p}`,
              x: egg.x,
              y: egg.y,
              vx: (Math.random() - 0.5) * 100,
              vy: (Math.random() - 0.5) * 100,
              color: '#D500F9',
              size: 3,
              life: 0.3,
              maxLife: 0.3,
            });
          }
        } else if (this.invulnerableTimer <= 0) {
          // Player hit!
          this.state.health--;
          this.invulnerableTimer = 1.6;
          this.onSound?.('hurt');
          this.addFloatingText(this.playerX, this.playerY - 25, 'HIT! -1 ❤️', '#FF1744');

          // Ship damage explosion
          for (let p = 0; p < 12; p++) {
            this.particles.push({
              id: `p_dmg_${Date.now()}_${p}`,
              x: this.playerX,
              y: this.playerY,
              vx: (Math.random() - 0.5) * 150,
              vy: (Math.random() - 0.5) * 150,
              color: '#FF1744',
              size: 3 + Math.random() * 3,
              life: 0.5,
              maxLife: 0.5,
            });
          }

          if (this.state.health <= 0) {
            this.state.status = 'GAMEOVER';
          }
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]!;
      ft.y -= 30 * delta;
      ft.life -= delta;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private fireShot(isOverdrive: boolean) {
    const ammoType = isOverdrive ? 'SCATTER' : this.currentAmmoType;

    if (isOverdrive) {
      // 5-way plasma spread in Overdrive!
      this.onSound?.('shotMany');
      const angles = [-0.25, -0.12, 0, 0.12, 0.25];
      for (const a of angles) {
        this.bullets.push({
          id: `b_od_${Date.now()}_${Math.random()}`,
          x: this.playerX,
          y: this.playerY - 15,
          vx: Math.sin(a) * 550,
          vy: -Math.cos(a) * 550,
          type: 'NORMAL',
          damage: 2,
        });
      }
      return;
    }

    if (ammoType === 'NORMAL') {
      this.onSound?.('shotTwo');
      // Twin lasers
      this.bullets.push({
        id: `b_l_${Date.now()}_1`,
        x: this.playerX - 9,
        y: this.playerY - 12,
        vx: 0,
        vy: -520,
        type: 'NORMAL',
        damage: 1,
      });
      this.bullets.push({
        id: `b_l_${Date.now()}_2`,
        x: this.playerX + 9,
        y: this.playerY - 12,
        vx: 0,
        vy: -520,
        type: 'NORMAL',
        damage: 1,
      });
    } else if (ammoType === 'SCATTER') {
      this.onSound?.('shotMany');
      // 3-way spread
      const angles = [-0.18, 0, 0.18];
      for (const a of angles) {
        this.bullets.push({
          id: `b_sc_${Date.now()}_${Math.random()}`,
          x: this.playerX,
          y: this.playerY - 14,
          vx: Math.sin(a) * 480,
          vy: -Math.cos(a) * 480,
          type: 'SCATTER',
          damage: 1.5,
        });
      }
    } else if (ammoType === 'MISSILE') {
      this.onSound?.('shotOne');
      // Homing rocket
      this.bullets.push({
        id: `b_ms_${Date.now()}_${Math.random()}`,
        x: this.playerX,
        y: this.playerY - 16,
        vx: (Math.random() - 0.5) * 80,
        vy: -320,
        type: 'MISSILE',
        damage: 4,
      });
    }
  }

  private dropEgg(c: Chicken) {
    this.onSound?.('egg');
    if (c.type === 'BOSS') {
      // 3-way egg bombs from Boss
      this.eggBombs.push({
        id: `egg_${Date.now()}_1`,
        x: c.x,
        y: c.y + c.radius,
        vx: -40,
        vy: 160,
        radius: 6,
      });
      this.eggBombs.push({
        id: `egg_${Date.now()}_2`,
        x: c.x,
        y: c.y + c.radius,
        vx: 0,
        vy: 180,
        radius: 7,
      });
      this.eggBombs.push({
        id: `egg_${Date.now()}_3`,
        x: c.x,
        y: c.y + c.radius,
        vx: 40,
        vy: 160,
        radius: 6,
      });
    } else {
      this.eggBombs.push({
        id: `egg_${Date.now()}_${Math.random()}`,
        x: c.x,
        y: c.y + c.radius,
        vx: (Math.random() - 0.5) * 30,
        vy: 140 + Math.random() * 40,
        radius: 5,
      });
    }
  }

  private findNearestChicken(x: number, y: number): Chicken | null {
    let nearest: Chicken | null = null;
    let minDist = Infinity;
    for (const c of this.chickens) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    }
    return nearest;
  }
}
