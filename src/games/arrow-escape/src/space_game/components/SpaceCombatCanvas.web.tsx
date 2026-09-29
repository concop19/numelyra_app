import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SpaceEngine } from '../engine/spaceEngine';
import { Chicken, EggBomb, Bullet, Particle, FloatingText } from '../types';

interface Props {
  engine: SpaceEngine;
  width: number;
  height: number;
}

export function SpaceCombatCanvas({ engine, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    playerX: number;
    playerY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Update engine physics & logic
      engine.update(dt);

      // Clear & Draw
      ctx.clearRect(0, 0, width, height);

      // Background Space Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#040714');
      grad.addColorStop(1, '#0b132b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw Stars
      const isOverdrive = engine.state.overdriveTimer > 0;
      for (const s of engine.stars) {
        ctx.fillStyle = isOverdrive ? '#00e5ff' : `rgba(255, 255, 255, ${s.alpha})`;
        if (isOverdrive) {
          // Light streak in overdrive
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x, s.y + s.size * 6);
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Chickens
      for (const c of engine.chickens) {
        drawChicken(ctx, c);
      }

      // Draw Egg Bombs
      for (const egg of engine.eggBombs) {
        drawEgg(ctx, egg);
      }

      // Draw Bullets
      for (const b of engine.bullets) {
        drawBullet(ctx, b);
      }

      // Draw Particles
      for (const p of engine.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Player Ship
      drawPlayer(ctx, engine);

      // Draw Floating Texts
      for (const ft of engine.floatingTexts) {
        ctx.save();
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Overdrive Screen Vignette / Glow
      if (isOverdrive) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 + Math.sin(now * 0.01) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine, width, height]);

  // Touch and Mouse handlers for smooth spaceship dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      playerX: engine.playerX,
      playerY: engine.playerY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const anchor = dragRef.current;
    if (!anchor || anchor.pointerId !== e.pointerId) return;
    engine.setPlayerPosition(
      anchor.playerX + e.clientX - anchor.clientX,
      anchor.playerY + e.clientY - anchor.clientY
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  // Keyboard controls for desktop browser
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 18;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engine.setPlayerPosition(engine.playerX - step, engine.playerY);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engine.setPlayerPosition(engine.playerX + step, engine.playerY);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        engine.setPlayerPosition(engine.playerX, engine.playerY - step);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        engine.setPlayerPosition(engine.playerX, engine.playerY + step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  return (
    <View style={[styles.container, { width, height }]}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width,
          height,
          display: 'block',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </View>
  );
}

function drawPlayer(ctx: CanvasRenderingContext2D, engine: SpaceEngine) {
  const { playerX: x, playerY: y, shipRadius: r, invulnerableTimer } = engine;
  const isOverdrive = engine.state.overdriveTimer > 0;
  const shieldActive = engine.state.shieldTimer > 0;

  // Invulnerable blink
  if (invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  // Thruster flames
  ctx.fillStyle = isOverdrive ? '#00e5ff' : '#ff9100';
  ctx.beginPath();
  const flameLen = 8 + Math.random() * 8 + (isOverdrive ? 6 : 0);
  ctx.moveTo(-6, r - 3);
  ctx.lineTo(0, r - 3 + flameLen);
  ctx.lineTo(6, r - 3);
  ctx.closePath();
  ctx.fill();

  // Ship Body (Sci-fi Fighter)
  ctx.fillStyle = isOverdrive ? '#e0f7fa' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -r); // Nose
  ctx.lineTo(r * 0.85, r * 0.7); // Right wing tip
  ctx.lineTo(r * 0.4, r * 0.4);
  ctx.lineTo(0, r * 0.6); // Engine center
  ctx.lineTo(-r * 0.4, r * 0.4);
  ctx.lineTo(-r * 0.85, r * 0.7); // Left wing tip
  ctx.closePath();
  ctx.fill();

  // Wing borders / accents
  ctx.strokeStyle = isOverdrive ? '#00e5ff' : '#00b4d8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cockpit canopy
  ctx.fillStyle = '#0077b6';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shield Bubble
  if (shieldActive) {
    ctx.strokeStyle = '#d500f9';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#d500f9';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawChicken(ctx: CanvasRenderingContext2D, c: Chicken) {
  ctx.save();
  ctx.translate(c.x, c.y);

  const flap = Math.sin(c.phase * 8) * 4;
  const r = c.radius;

  // Wings (Behind body)
  ctx.fillStyle = c.type === 'ARMORED' ? '#ffb74d' : '#f5f5f5';
  // Left wing
  ctx.beginPath();
  ctx.ellipse(-r * 0.9, flap, r * 0.5, r * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.ellipse(r * 0.9, flap, r * 0.5, r * 0.35, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Chicken Body (Egg shaped round)
  ctx.fillStyle = c.type === 'BOSS' ? '#ff3d00' : c.type === 'ARMORED' ? '#ffd54f' : '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Red Comb on Top
  ctx.fillStyle = '#d50000';
  ctx.beginPath();
  if (c.type === 'BOSS') {
    // Golden Crown for Boss
    ctx.fillStyle = '#ffd700';
    ctx.moveTo(-14, -r + 2);
    ctx.lineTo(-7, -r - 12);
    ctx.lineTo(0, -r - 5);
    ctx.lineTo(7, -r - 12);
    ctx.lineTo(14, -r + 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // 3 bumps for regular rooster comb
    ctx.arc(-4, -r * 0.85, 4, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.95, 5, 0, Math.PI * 2);
    ctx.arc(4, -r * 0.85, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cute Big Eyes looking down
  ctx.fillStyle = '#000000';
  const eyeR = Math.max(2, r * 0.18);
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.1, eyeR, 0, Math.PI * 2);
  ctx.arc(r * 0.35, -r * 0.1, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Eye shines
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-r * 0.35 + 1, -r * 0.1 - 1, eyeR * 0.4, 0, Math.PI * 2);
  ctx.arc(r * 0.35 + 1, -r * 0.1 - 1, eyeR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Orange Beak
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, r * 0.1);
  ctx.lineTo(0, r * 0.55);
  ctx.lineTo(r * 0.25, r * 0.1);
  ctx.closePath();
  ctx.fill();

  // Boss Health Bar
  if (c.type === 'BOSS' || c.maxHealth > 1) {
    const barW = r * 1.8;
    const barH = 4;
    const hpRatio = Math.max(0, c.health / c.maxHealth);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, -r - 16, barW, barH);
    ctx.fillStyle = c.type === 'BOSS' ? '#f50057' : '#00e676';
    ctx.fillRect(-barW / 2, -r - 16, barW * hpRatio, barH);
  }

  ctx.restore();
}

function drawEgg(ctx: CanvasRenderingContext2D, egg: EggBomb) {
  ctx.save();
  ctx.translate(egg.x, egg.y);
  ctx.fillStyle = '#fffde7';
  ctx.beginPath();
  ctx.ellipse(0, 0, egg.radius, egg.radius * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.type === 'MISSILE') {
    // Red rocket
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(4, 7);
    ctx.lineTo(-4, 7);
    ctx.closePath();
    ctx.fill();

    // Rocket exhaust flame
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.moveTo(-2, 7);
    ctx.lineTo(0, 14 + Math.random() * 4);
    ctx.lineTo(2, 7);
    ctx.closePath();
    ctx.fill();
  } else if (b.type === 'SCATTER') {
    // Orange plasma ball
    ctx.fillStyle = '#ff9100';
    ctx.shadowColor = '#ff9100';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Normal green laser capsule
    ctx.fillStyle = '#00e676';
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-2, -8, 4, 16, 2);
    ctx.fill();
  }

  ctx.restore();
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#040714',
  },
});
