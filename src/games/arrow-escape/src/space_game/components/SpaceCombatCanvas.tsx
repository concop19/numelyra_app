import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  createPicture,
  PaintStyle,
  Picture,
  Skia,
} from '@shopify/react-native-skia';
import { SpaceEngine } from '../engine/spaceEngine';

interface Props {
  engine: SpaceEngine;
  width: number;
  height: number;
}

// Pre-allocated static paints (zero allocations per frame)
const bgPaint = Skia.Paint();
bgPaint.setColor(Skia.Color('#040714'));

const starPaint = Skia.Paint();
starPaint.setColor(Skia.Color('#ffffff'));

const starStreakPaint = Skia.Paint();
starStreakPaint.setColor(Skia.Color('#00e5ff'));
starStreakPaint.setStyle(PaintStyle.Stroke);
starStreakPaint.setStrokeWidth(1.5);

const wingPaint = Skia.Paint();
const bodyPaint = Skia.Paint();

const chickenStrokePaint = Skia.Paint();
chickenStrokePaint.setColor(Skia.Color('#e0e0e0'));
chickenStrokePaint.setStyle(PaintStyle.Stroke);
chickenStrokePaint.setStrokeWidth(1.5);

const combPaint = Skia.Paint();

const eyeBlackPaint = Skia.Paint();
eyeBlackPaint.setColor(Skia.Color('#000000'));

const eyeWhitePaint = Skia.Paint();
eyeWhitePaint.setColor(Skia.Color('#ffffff'));

const beakPaint = Skia.Paint();
beakPaint.setColor(Skia.Color('#ff9800'));

const hpBgPaint = Skia.Paint();
hpBgPaint.setColor(Skia.Color('rgba(0,0,0,0.6)'));

const hpFillPaint = Skia.Paint();

const eggPaint = Skia.Paint();
eggPaint.setColor(Skia.Color('#fffde7'));

const eggStrokePaint = Skia.Paint();
eggStrokePaint.setColor(Skia.Color('#ffd54f'));
eggStrokePaint.setStyle(PaintStyle.Stroke);
eggStrokePaint.setStrokeWidth(1);

const bulletPaint = Skia.Paint();
const particlePaint = Skia.Paint();

const shipBodyPaint = Skia.Paint();

const shipStrokePaint = Skia.Paint();
shipStrokePaint.setStyle(PaintStyle.Stroke);
shipStrokePaint.setStrokeWidth(2);

const cockpitPaint = Skia.Paint();
cockpitPaint.setColor(Skia.Color('#0077b6'));

const flamePaint = Skia.Paint();

const shieldPaint = Skia.Paint();
shieldPaint.setColor(Skia.Color('#d500f9'));
shieldPaint.setStyle(PaintStyle.Stroke);
shieldPaint.setStrokeWidth(2.5);

const overdriveBorderPaint = Skia.Paint();
overdriveBorderPaint.setColor(Skia.Color('rgba(0, 229, 255, 0.5)'));
overdriveBorderPaint.setStyle(PaintStyle.Stroke);
overdriveBorderPaint.setStrokeWidth(3);

// Pre-allocated static geometry paths (zero allocations per frame)
const baseBeakPath = Skia.Path.Make();
baseBeakPath.moveTo(-4, 2);
baseBeakPath.lineTo(0, 9);
baseBeakPath.lineTo(4, 2);
baseBeakPath.close();

const baseMissilePath = Skia.Path.Make();
baseMissilePath.moveTo(0, -9);
baseMissilePath.lineTo(4, 7);
baseMissilePath.lineTo(-4, 7);
baseMissilePath.close();

const baseFlamePath = Skia.Path.Make();
baseFlamePath.moveTo(-2, 7);
baseFlamePath.lineTo(0, 15);
baseFlamePath.lineTo(2, 7);
baseFlamePath.close();

const shipR = 18;
const playerShipPath = Skia.Path.Make();
playerShipPath.moveTo(0, -shipR);
playerShipPath.lineTo(shipR * 0.85, shipR * 0.7);
playerShipPath.lineTo(shipR * 0.4, shipR * 0.4);
playerShipPath.lineTo(0, shipR * 0.6);
playerShipPath.lineTo(-shipR * 0.4, shipR * 0.4);
playerShipPath.lineTo(-shipR * 0.85, shipR * 0.7);
playerShipPath.close();

const playerFlamePath = Skia.Path.Make();
playerFlamePath.moveTo(-6, shipR - 3);
playerFlamePath.lineTo(0, shipR + 11);
playerFlamePath.lineTo(6, shipR - 3);
playerFlamePath.close();

export const SpaceCombatCanvas = React.memo(function SpaceCombatCanvas({
  engine,
  width,
  height,
}: Props) {
  const [, setTick] = useState(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    let active = true;
    lastTimeRef.current = Date.now();

    const loop = () => {
      if (!active) return;
      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      engine.update(dt);
      setTick((t) => (t + 1) % 1000000);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [engine]);

  const onTouch = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    if (typeof locationX === 'number' && typeof locationY === 'number') {
      engine.setPlayerPosition(locationX, locationY);
    }
  };

  const isOverdrive = engine.state.overdriveTimer > 0;
  const shieldActive = engine.state.shieldTimer > 0;
  const showPlayer = !engine.invulnerableTimer || Math.floor(Date.now() / 80) % 2 !== 0;

  // Single C++ picture recording per frame: zero React Fiber diffing, zero GC overhead
  const picture = createPicture(
    (canvas) => {
      // 1. Background
      canvas.drawRect({ x: 0, y: 0, width, height }, bgPaint);

      // 2. Stars
      if (isOverdrive) {
        for (let i = 0; i < engine.stars.length; i++) {
          const s = engine.stars[i]!;
          canvas.drawLine(s.x, s.y, s.x, s.y + s.size * 6, starStreakPaint);
        }
      } else {
        for (let i = 0; i < engine.stars.length; i++) {
          const s = engine.stars[i]!;
          starPaint.setAlphaf(s.alpha);
          canvas.drawCircle(s.x, s.y, s.size, starPaint);
        }
      }

      // 3. Chickens
      for (let i = 0; i < engine.chickens.length; i++) {
        const c = engine.chickens[i]!;
        const flap = Math.sin(c.phase * 8) * 4;
        const r = c.radius;
        const bodyColor =
          c.type === 'BOSS' ? '#ff3d00' : c.type === 'ARMORED' ? '#ffd54f' : '#ffffff';
        const wingColor = c.type === 'ARMORED' ? '#ffb74d' : '#f5f5f5';
        const combColor = c.type === 'BOSS' ? '#ffd700' : '#d50000';
        const eyeR = Math.max(2, r * 0.18);

        canvas.save();
        canvas.translate(c.x, c.y);

        // Wings
        wingPaint.setColor(Skia.Color(wingColor));
        canvas.drawCircle(-r * 0.9, flap, r * 0.45, wingPaint);
        canvas.drawCircle(r * 0.9, flap, r * 0.45, wingPaint);

        // Body & Outline
        bodyPaint.setColor(Skia.Color(bodyColor));
        canvas.drawCircle(0, 0, r, bodyPaint);
        canvas.drawCircle(0, 0, r, chickenStrokePaint);

        // Comb
        combPaint.setColor(Skia.Color(combColor));
        canvas.drawCircle(-4, -r * 0.85, 4, combPaint);
        canvas.drawCircle(0, -r * 0.95, 5, combPaint);
        canvas.drawCircle(4, -r * 0.85, 4, combPaint);

        // Eyes & Pupils
        canvas.drawCircle(-r * 0.35, -r * 0.1, eyeR, eyeBlackPaint);
        canvas.drawCircle(r * 0.35, -r * 0.1, eyeR, eyeBlackPaint);
        const pupilR = Math.max(1, eyeR * 0.4);
        canvas.drawCircle(-r * 0.35 + 1, -r * 0.1 - 1, pupilR, eyeWhitePaint);
        canvas.drawCircle(r * 0.35 + 1, -r * 0.1 - 1, pupilR, eyeWhitePaint);

        // Beak (scaled)
        canvas.save();
        canvas.scale(r / 16, r / 16);
        canvas.drawPath(baseBeakPath, beakPaint);
        canvas.restore();

        // HP bar for Boss / Armored
        if (c.type === 'BOSS' || c.maxHealth > 1) {
          canvas.drawRect({ x: -r * 0.9, y: -r - 14, width: r * 1.8, height: 4 }, hpBgPaint);
          hpFillPaint.setColor(Skia.Color(c.type === 'BOSS' ? '#f50057' : '#00e676'));
          canvas.drawRect(
            {
              x: -r * 0.9,
              y: -r - 14,
              width: r * 1.8 * Math.max(0, c.health / c.maxHealth),
              height: 4,
            },
            hpFillPaint
          );
        }

        canvas.restore();
      }

      // 4. Egg Bombs
      for (let i = 0; i < engine.eggBombs.length; i++) {
        const egg = engine.eggBombs[i]!;
        canvas.drawCircle(egg.x, egg.y, egg.radius, eggPaint);
        canvas.drawCircle(egg.x, egg.y, egg.radius, eggStrokePaint);
      }

      // 5. Bullets
      for (let i = 0; i < engine.bullets.length; i++) {
        const b = engine.bullets[i]!;
        if (b.type === 'MISSILE') {
          canvas.save();
          canvas.translate(b.x, b.y);
          bulletPaint.setColor(Skia.Color('#ff1744'));
          canvas.drawPath(baseMissilePath, bulletPaint);
          flamePaint.setColor(Skia.Color('#ffea00'));
          canvas.drawPath(baseFlamePath, flamePaint);
          canvas.restore();
        } else if (b.type === 'SCATTER') {
          bulletPaint.setColor(Skia.Color('#ff9100'));
          canvas.drawCircle(b.x, b.y, 5, bulletPaint);
        } else {
          bulletPaint.setColor(Skia.Color('#00e676'));
          canvas.drawRRect(
            {
              rect: { x: b.x - 2, y: b.y - 8, width: 4, height: 16 },
              rx: 2,
              ry: 2,
            },
            bulletPaint
          );
        }
      }

      // 6. Particles
      for (let i = 0; i < engine.particles.length; i++) {
        const p = engine.particles[i]!;
        particlePaint.setColor(Skia.Color(p.color));
        particlePaint.setAlphaf(Math.max(0, p.life / p.maxLife));
        canvas.drawCircle(p.x, p.y, p.size, particlePaint);
      }

      // 7. Player Ship
      if (showPlayer) {
        canvas.save();
        canvas.translate(engine.playerX, engine.playerY);

        // Thruster Flame
        flamePaint.setColor(Skia.Color(isOverdrive ? '#00e5ff' : '#ff9100'));
        canvas.drawPath(playerFlamePath, flamePaint);

        // Ship Body
        shipBodyPaint.setColor(Skia.Color(isOverdrive ? '#e0f7fa' : '#ffffff'));
        canvas.drawPath(playerShipPath, shipBodyPaint);

        shipStrokePaint.setColor(Skia.Color(isOverdrive ? '#00e5ff' : '#00b4d8'));
        canvas.drawPath(playerShipPath, shipStrokePaint);

        // Cockpit
        canvas.drawCircle(0, -engine.shipRadius * 0.2, 5, cockpitPaint);

        // Shield Bubble
        if (shieldActive) {
          canvas.drawCircle(0, 0, engine.shipRadius + 8, shieldPaint);
        }

        canvas.restore();
      }

      // 8. Overdrive Screen Border
      if (isOverdrive) {
        canvas.drawRect(
          { x: 2, y: 2, width: width - 4, height: height - 4 },
          overdriveBorderPaint
        );
      }
    },
    { x: 0, y: 0, width, height }
  );

  return (
    <View
      style={[styles.container, { width, height }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>

      {/* Floating text messages (capped to at most 3 to avoid layout overhead) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {engine.floatingTexts.map((ft) => (
          <Text
            key={ft.id}
            style={[
              styles.floatingText,
              {
                left: ft.x - 70,
                top: ft.y - 10,
                color: ft.color,
                opacity: Math.min(1, Math.max(0, ft.life)),
              },
            ]}
          >
            {ft.text}
          </Text>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#040714',
  },
  floatingText: {
    position: 'absolute',
    width: 140,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
