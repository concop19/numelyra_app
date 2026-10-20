import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  ClipOp,
  createPicture,
  PaintStyle,
  Picture,
  Skia,
  type SkCanvas,
} from '@shopify/react-native-skia';
import type { Chicken, LuaGaWorld, Player } from './types';

export type LuaGaCanvasProps = {
  world: LuaGaWorld;
  width: number;
  height: number;
  onFrame: (fixedDeltaTime: number) => void;
};

const FIXED_STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 3;

function paint(color: string, style: PaintStyle = PaintStyle.Fill, strokeWidth = 1) {
  const value = Skia.Paint();
  value.setColor(Skia.Color(color));
  value.setStyle(style);
  value.setStrokeWidth(strokeWidth);
  value.setAntiAlias(true);
  return value;
}

// Reuse paints and paths. A frame only records draw commands into one Skia picture.
const screenPaint = paint('#102819');
const fieldPaint = paint('#87b85d');
const fieldLightPaint = paint('#9ac86d');
const fieldDarkPaint = paint('#74a850');
const pathPaint = paint('#d8b46a');
const pathEdgePaint = paint('rgba(109,85,42,0.18)', PaintStyle.Stroke, 4);
const grassPaint = paint('#54883d', PaintStyle.Stroke, 2);
const speckPaint = paint('rgba(238,241,170,0.55)');
const shadowPaint = paint('rgba(22,42,24,0.18)');
const outlinePaint = paint('#263126', PaintStyle.Stroke, 2);
const fenceWoodPaint = paint('#6b4524', PaintStyle.Stroke, 9);
const fenceLightPaint = paint('#9a6730', PaintStyle.Stroke, 3);
const trunkPaint = paint('#7a4b28');
const trunkLightPaint = paint('#ad6a36', PaintStyle.Stroke, 4);
const leafPaint = paint('#4d9b42');
const leafLightPaint = paint('#8dca55', PaintStyle.Stroke, 3);
const bananaBudPaint = paint('#7b4066');
const rockPaint = paint('#3e4740');
const rockLightPaint = paint('#5a675d');
const hayPaint = paint('#d39a32');
const hayLightPaint = paint('#f1c75c', PaintStyle.Stroke, 3);
const coopFillPaint = paint('rgba(238,250,211,0.34)');
const coopWoodPaint = paint('#5d381d');
const coopLightPaint = paint('#8d5b2d');
const gateOpenPaint = paint('#f4ce63', PaintStyle.Stroke, 7);
const gateClosedPaint = paint('#372118');
const auraPaint = paint('rgba(255,145,30,0.22)', PaintStyle.Stroke, 4);
const ragePaint = paint('rgba(210,20,25,0.48)', PaintStyle.Stroke, 5);
const aimPaint = paint('rgba(210,20,25,0.78)', PaintStyle.Stroke, 5);
const securedPaint = paint('#a8ed91', PaintStyle.Stroke, 3);
const grainAuraPaint = paint('rgba(169,116,51,0.14)');
const badGrainAuraPaint = paint('rgba(150,75,55,0.11)');
const grainPaint = paint('#edc35d');
const badGrainPaint = paint('#8d6c56');
const clapPaint = paint('rgba(255,245,180,0.7)', PaintStyle.Stroke, 5);
const dashAimPaint = paint('rgba(255,245,180,0.84)', PaintStyle.Stroke, 7);
const dashPaint = paint('rgba(255,132,36,0.72)', PaintStyle.Stroke, 9);
const sprintPaint = paint('rgba(255,216,80,0.68)', PaintStyle.Stroke, 5);

const henBodyPaint = paint('#f3d487');
const henBellyPaint = paint('#fff0bc');
const henWingPaint = paint('#d7a94f');
const roosterBodyPaint = paint('#b94a32');
const roosterBellyPaint = paint('#e37a42');
const roosterWingPaint = paint('#78362d');
const combPaint = paint('#d93235');
const beakPaint = paint('#f2a72f');
const legPaint = paint('#a96525', PaintStyle.Stroke, 2.3);
const eyePaint = paint('#162019');
const eyeShinePaint = paint('#ffffff');
const panicPaint = paint('#ffffff', PaintStyle.Stroke, 2);
const tailRedPaint = paint('#9d302c');
const tailGreenPaint = paint('#296750');

const flameOuterPaint = paint('#f05a24');
const flameMiddlePaint = paint('#ff982b');
const flameInnerPaint = paint('#ffd34d');
const skinGlowPaint = paint('#ffe38b');
const overallPaint = paint('#3f7ea6');
const overallLightPaint = paint('#63a1c4');
const shirtPaint = paint('#f6e7b2');
const bootPaint = paint('#493323', PaintStyle.Stroke, 5);
const glovePaint = paint('#e7b65b');
const hatPaint = paint('#d8a64f');
const hatBandPaint = paint('#8a4a2b');
const smilePaint = paint('#73331e', PaintStyle.Stroke, 1.5);

const flameOuterPath = Skia.Path.Make();
flameOuterPath.moveTo(0, -31);
flameOuterPath.cubicTo(7, -25, 15, -22, 12, -12);
flameOuterPath.cubicTo(20, -9, 18, 5, 8, 10);
flameOuterPath.cubicTo(1, 14, -10, 10, -14, 3);
flameOuterPath.cubicTo(-20, -8, -11, -18, -4, -19);
flameOuterPath.cubicTo(-6, -25, -2, -28, 0, -31);
flameOuterPath.close();

const flameMiddlePath = Skia.Path.Make();
flameMiddlePath.moveTo(2, -23);
flameMiddlePath.cubicTo(7, -18, 11, -14, 8, -8);
flameMiddlePath.cubicTo(15, -3, 9, 7, 2, 8);
flameMiddlePath.cubicTo(-8, 9, -12, 1, -8, -7);
flameMiddlePath.cubicTo(-3, -12, -3, -18, 2, -23);
flameMiddlePath.close();

const flameInnerPath = Skia.Path.Make();
flameInnerPath.moveTo(2, -14);
flameInnerPath.cubicTo(8, -7, 7, 2, 1, 6);
flameInnerPath.cubicTo(-6, 4, -7, -2, -3, -7);
flameInnerPath.cubicTo(-1, -10, 0, -12, 2, -14);
flameInnerPath.close();

const tailPath = Skia.Path.Make();
tailPath.moveTo(-8, 7);
tailPath.cubicTo(-22, 3, -22, -9, -13, -13);
tailPath.cubicTo(-14, -4, -5, -3, -2, 2);
tailPath.close();

const beakPath = Skia.Path.Make();
beakPath.moveTo(-5, 9);
beakPath.lineTo(0, 16);
beakPath.lineTo(5, 9);
beakPath.close();

function drawStaticScene(canvas: SkCanvas, world: LuaGaWorld) {
  const { worldWidth, worldHeight } = world.settings;
  canvas.drawRect({ x: 0, y: 0, width: worldWidth, height: worldHeight }, fieldPaint);
  canvas.drawOval({ x: -80, y: 55, width: 620, height: 215 }, fieldLightPaint);
  canvas.drawOval({ x: 420, y: -55, width: 680, height: 245 }, fieldDarkPaint);
  canvas.drawOval({ x: 120, y: 370, width: 620, height: 260 }, fieldLightPaint);
  canvas.drawOval({ x: 610, y: 335, width: 520, height: 280 }, fieldDarkPaint);

  const lane = Skia.Path.Make();
  lane.moveTo(180, 650);
  lane.lineTo(420, 650);
  lane.lineTo(850, 205);
  lane.lineTo(815, 198);
  lane.close();
  canvas.drawPath(lane, pathPaint);
  canvas.drawPath(lane, pathEdgePaint);
  lane.dispose();

  for (let index = 0; index < 36; index += 1) {
    const x = 34 + ((index * 137) % 920);
    const y = 70 + ((index * 83) % 520);
    canvas.drawCircle(x, y, 1.6 + (index % 3) * 0.45, speckPaint);
    if (index % 4 === 0) {
      canvas.drawLine(x - 4, y + 4, x, y - 4, grassPaint);
      canvas.drawLine(x, y - 4, x + 5, y + 2, grassPaint);
    }
  }

  drawFence(canvas, 28, 34, 300);
  drawBananaTree(canvas, 70, 140, 1);
  drawBananaTree(canvas, 905, 555, 0.9);
  for (const obstacle of world.obstacles) {
    if (obstacle.kind === 'rock') drawRock(canvas, obstacle.x, obstacle.y, obstacle.radius);
    else drawHay(canvas, obstacle.x, obstacle.y, obstacle.radius);
  }

  const coop = world.coop;
  const t = coop.wallThickness;
  const gateTop = coop.y + coop.height / 2 - coop.gateWidth / 2;
  const gateBottom = gateTop + coop.gateWidth;
  canvas.drawRRect({ rect: { x: coop.x, y: coop.y, width: coop.width, height: coop.height }, rx: 10, ry: 10 }, coopFillPaint);
  drawWoodRect(canvas, coop.x, coop.y - t / 2, coop.width, t);
  drawWoodRect(canvas, coop.x, coop.y + coop.height - t / 2, coop.width, t);
  drawWoodRect(canvas, coop.x + coop.width - t / 2, coop.y, t, coop.height);
  drawWoodRect(canvas, coop.x - t / 2, coop.y, t, gateTop - coop.y);
  drawWoodRect(canvas, coop.x - t / 2, gateBottom, t, coop.y + coop.height - gateBottom);
}

function drawFence(canvas: SkCanvas, x: number, y: number, width: number) {
  for (let post = 0; post <= 4; post += 1) {
    const px = x + post * (width / 4);
    canvas.drawLine(px, y - 24, px, y + 45, fenceWoodPaint);
    canvas.drawLine(px - 2, y - 20, px - 2, y + 37, fenceLightPaint);
  }
  canvas.drawLine(x, y, x + width, y, fenceWoodPaint);
  canvas.drawLine(x, y + 30, x + width, y + 30, fenceWoodPaint);
  canvas.drawLine(x, y - 2, x + width, y - 2, fenceLightPaint);
}

function drawBananaTree(canvas: SkCanvas, x: number, y: number, scale: number) {
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(scale, scale);
  canvas.rotate(7, 0, 0);
  canvas.drawRRect({ rect: { x: -10, y: -80, width: 20, height: 100 }, rx: 10, ry: 10 }, trunkPaint);
  canvas.drawLine(-3, -73, -3, 10, trunkLightPaint);
  const leaves = [
    { x: -64, y: -105, w: 74, h: 18, r: -18 }, { x: -42, y: -130, w: 69, h: 18, r: -52 },
    { x: -5, y: -139, w: 72, h: 18, r: -92 }, { x: 4, y: -122, w: 78, h: 19, r: -24 },
    { x: -2, y: -101, w: 69, h: 18, r: 10 },
  ];
  for (const leaf of leaves) {
    canvas.save();
    canvas.rotate(leaf.r, 0, -92);
    canvas.drawOval({ x: leaf.x, y: leaf.y, width: leaf.w, height: leaf.h }, leafPaint);
    canvas.drawLine(leaf.x + 7, leaf.y + leaf.h / 2, leaf.x + leaf.w - 7, leaf.y + leaf.h / 2, leafLightPaint);
    canvas.restore();
  }
  canvas.drawCircle(-4, -78, 12, bananaBudPaint);
  canvas.restore();
}

function drawRock(canvas: SkCanvas, x: number, y: number, radius: number) {
  canvas.drawOval({ x: x - radius, y: y - radius * 0.72, width: radius * 2, height: radius * 1.55 }, rockPaint);
  canvas.drawOval({ x: x - radius * 0.48, y: y - radius * 0.54, width: radius * 0.72, height: radius * 0.38 }, rockLightPaint);
}

function drawHay(canvas: SkCanvas, x: number, y: number, radius: number) {
  canvas.drawOval({ x: x - radius * 1.2, y: y - radius * 0.65, width: radius * 2.4, height: radius * 1.3 }, shadowPaint);
  canvas.drawOval({ x: x - radius, y: y - radius * 0.72, width: radius * 2, height: radius * 1.35 }, hayPaint);
  for (let index = -2; index <= 2; index += 1) {
    canvas.drawLine(x + index * radius * 0.3, y - radius * 0.45, x + index * radius * 0.23, y + radius * 0.42, hayLightPaint);
  }
}

function drawWoodRect(canvas: SkCanvas, x: number, y: number, width: number, height: number) {
  canvas.drawRect({ x, y, width, height }, coopWoodPaint);
  if (width > height) canvas.drawRect({ x, y, width, height: Math.min(3, height) }, coopLightPaint);
  else canvas.drawRect({ x, y, width: Math.min(3, width), height }, coopLightPaint);
}

function drawChicken(canvas: SkCanvas, chicken: Chicken, player: Player, rageRadius: number, now: number) {
  const rooster = chicken.type === 'rooster';
  const active = chicken.speed > 0 && !chicken.secured;
  const phase = now / 1000 * (active ? 10 : 3) + Number(chicken.id.slice(-2));
  const bob = active ? Math.sin(phase * 2) * 1.7 : Math.sin(phase) * 0.7;
  const flap = Math.sin(phase * 2.4) * (['PANIC', 'CLAP_PANIC', 'ROOSTER_CHARGE'].includes(chicken.state) ? 7 : 3);
  const size = rooster ? 1.2 : 1;
  const angle = Math.atan2(chicken.directionY, chicken.directionX) * 180 / Math.PI - 90;
  const raging = rooster && ['ROOSTER_AIM', 'ROOSTER_CHARGE', 'ROOSTER_RECOVER'].includes(chicken.state);

  if (chicken.rageActive) canvas.drawCircle(chicken.x, chicken.y, rageRadius, auraPaint);
  if (raging) canvas.drawCircle(chicken.x, chicken.y, chicken.radius + 13, ragePaint);
  if (chicken.state === 'ROOSTER_AIM') canvas.drawLine(chicken.x, chicken.y, player.x, player.y, aimPaint);
  canvas.drawOval({ x: chicken.x - 15 * size, y: chicken.y + 11 * size, width: 30 * size, height: 10 * size }, shadowPaint);
  canvas.save();
  canvas.translate(chicken.x, chicken.y + bob);
  canvas.rotate(angle, 0, 0);
  canvas.scale(size, size);
  if (rooster) {
    canvas.drawPath(tailPath, tailGreenPaint);
    canvas.save();
    canvas.rotate(-13, -5, 4);
    canvas.drawPath(tailPath, tailRedPaint);
    canvas.restore();
  }
  canvas.drawLine(-6, 12, -9 + Math.sin(phase) * 3, 19, legPaint);
  canvas.drawLine(6, 12, 9 - Math.sin(phase) * 3, 19, legPaint);
  canvas.drawOval({ x: -13, y: -10, width: 26, height: 29 }, rooster ? roosterBodyPaint : henBodyPaint);
  canvas.drawOval({ x: -9, y: 0, width: 18, height: 15 }, rooster ? roosterBellyPaint : henBellyPaint);
  canvas.drawCircle(-12, 1 + flap * 0.45, 7, rooster ? roosterWingPaint : henWingPaint);
  canvas.drawCircle(12, 1 - flap * 0.45, 7, rooster ? roosterWingPaint : henWingPaint);
  canvas.drawOval({ x: -13, y: -10, width: 26, height: 29 }, outlinePaint);
  canvas.drawCircle(0, -11, 10.5, rooster ? roosterBodyPaint : henBodyPaint);
  canvas.drawCircle(0, -11, 10.5, outlinePaint);
  canvas.drawCircle(-5, -21, 4, combPaint);
  canvas.drawCircle(0, -23, 4.6, combPaint);
  canvas.drawCircle(5, -21, 4, combPaint);
  canvas.drawCircle(-4, -12, 1.8, eyePaint);
  canvas.drawCircle(4, -12, 1.8, eyePaint);
  canvas.drawCircle(-3.5, -12.7, 0.55, eyeShinePaint);
  canvas.drawCircle(4.5, -12.7, 0.55, eyeShinePaint);
  canvas.drawPath(beakPath, beakPaint);
  if (['PANIC', 'CLAP_PANIC'].includes(chicken.state)) {
    canvas.drawLine(-8, -27, -12, -31, panicPaint);
    canvas.drawLine(8, -27, 12, -31, panicPaint);
  }
  canvas.restore();
  if (chicken.secured) canvas.drawCircle(chicken.x, chicken.y, chicken.radius + 10, securedPaint);
}

function drawFlame(canvas: SkCanvas, player: Player, now: number) {
  const moving = Math.hypot(player.velocityX, player.velocityY) > 1;
  const running = player.sprintActiveTime > 0;
  const phase = now / 1000 * (running ? 14 : moving ? 9 : 3);
  const bob = moving ? -Math.abs(Math.sin(phase)) * 2.2 : Math.sin(phase) * 0.7;
  const stride = moving ? Math.sin(phase) * (running ? 7 : 4.5) : 0;
  const side = Math.abs(player.directionX) > Math.abs(player.directionY);
  const facingUp = !side && player.directionY < 0;
  const facingLeft = side && player.directionX < 0;

  if (player.dashAiming) canvas.drawLine(player.x, player.y, player.dashPreviewX, player.dashPreviewY, dashAimPaint);
  if (player.dashEffectRemaining > 0) canvas.drawLine(player.dashStartX, player.dashStartY, player.dashEndX, player.dashEndY, dashPaint);
  if (running) canvas.drawCircle(player.x, player.y, player.radius + 13, sprintPaint);
  canvas.drawOval({ x: player.x - 16, y: player.y + 17, width: 32, height: 10 }, shadowPaint);

  canvas.save();
  canvas.translate(player.x, player.y + bob);
  if (facingLeft) canvas.scale(-1, 1);
  if (side && running) canvas.rotate(7, 0, 8);
  canvas.drawLine(-8, 8, -13 - stride * 0.35, 20, shirtPaint);
  canvas.drawLine(8, 8, 13 + stride * 0.35, 20, shirtPaint);
  canvas.drawCircle(-13 - stride * 0.35, 20, 3.2, glovePaint);
  canvas.drawCircle(13 + stride * 0.35, 20, 3.2, glovePaint);
  canvas.drawLine(-6, 20, -7 - stride * 0.42, 33, overallPaint);
  canvas.drawLine(6, 20, 7 + stride * 0.42, 33, overallPaint);
  canvas.drawLine(-8 - stride * 0.42, 33, -2 - stride * 0.42, 33, bootPaint);
  canvas.drawLine(2 + stride * 0.42, 33, 9 + stride * 0.42, 33, bootPaint);
  canvas.drawRRect({ rect: { x: -11, y: 2, width: 22, height: 22 }, rx: 7, ry: 7 }, shirtPaint);
  canvas.drawRRect({ rect: { x: -9, y: 7, width: 18, height: 18 }, rx: 5, ry: 5 }, overallPaint);
  canvas.drawRect({ x: -7, y: 12, width: 14, height: 7 }, overallLightPaint);
  canvas.drawLine(-7, 7, -4, 15, overallLightPaint);
  canvas.drawLine(7, 7, 4, 15, overallLightPaint);
  canvas.drawPath(flameOuterPath, flameOuterPaint);
  canvas.drawPath(flameMiddlePath, flameMiddlePaint);
  canvas.drawPath(flameInnerPath, flameInnerPaint);
  canvas.drawOval({ x: -10, y: -15, width: 20, height: 18 }, skinGlowPaint);
  canvas.drawOval({ x: -18, y: -22, width: 36, height: 7 }, hatPaint);
  canvas.drawRRect({ rect: { x: -12, y: -29, width: 24, height: 10 }, rx: 5, ry: 5 }, hatPaint);
  canvas.drawRect({ x: -12, y: -23, width: 24, height: 4 }, hatBandPaint);
  if (facingUp) {
    canvas.drawRect({ x: -5, y: 13, width: 10, height: 5 }, overallLightPaint);
  } else if (side) {
    canvas.drawCircle(4, -8, 1.7, eyePaint);
    canvas.drawCircle(4.5, -8.6, 0.55, eyeShinePaint);
    canvas.drawLine(5, -3, 9, -2, smilePaint);
  } else {
    canvas.drawCircle(-4, -8, 1.7, eyePaint);
    canvas.drawCircle(4, -8, 1.7, eyePaint);
    canvas.drawCircle(-3.5, -8.6, 0.55, eyeShinePaint);
    canvas.drawCircle(4.5, -8.6, 0.55, eyeShinePaint);
    canvas.drawLine(-3, -2.5, 0, -1, smilePaint);
    canvas.drawLine(0, -1, 3, -2.5, smilePaint);
  }
  canvas.restore();
}

function drawDynamicScene(canvas: SkCanvas, world: LuaGaWorld, now: number) {
  const coop = world.coop;
  const t = coop.wallThickness;
  const gateTop = coop.y + coop.height / 2 - coop.gateWidth / 2;
  if (coop.closed) canvas.drawRect({ x: coop.x - t / 2, y: gateTop, width: t, height: coop.gateWidth }, gateClosedPaint);
  else canvas.drawLine(coop.x - 34, coop.y + coop.height / 2, coop.x + 22, coop.y + coop.height / 2, gateOpenPaint);
  for (const pile of world.grainPiles) {
    canvas.drawCircle(pile.x, pile.y, pile.attractionRadius, pile.tooCloseToCoopGate ? badGrainAuraPaint : grainAuraPaint);
    const count = Math.max(3, Math.ceil(pile.amount));
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2;
      const radius = 3 + index % 4 * 2.2;
      canvas.drawCircle(pile.x + Math.cos(angle) * radius, pile.y + Math.sin(angle) * radius, 2.5, pile.tooCloseToCoopGate ? badGrainPaint : grainPaint);
    }
  }
  for (const wave of world.clapWaves) {
    clapPaint.setAlphaf(Math.max(0, 0.7 * (1 - wave.radius / wave.maxRadius)));
    clapPaint.setStrokeWidth(wave.width);
    canvas.drawCircle(wave.x, wave.y, wave.radius, clapPaint);
  }
  clapPaint.setAlphaf(1);
  for (const chicken of world.chickens) drawChicken(canvas, chicken, world.player, world.settings.roosterRageRadius, now);
  drawFlame(canvas, world.player, now);
}

function LuaGaCanvasSkia({ world, width, height, onFrame }: LuaGaCanvasProps) {
  const [frameTime, setFrameTime] = useState(0);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const staticPicture = useMemo(() => createPicture(
    canvas => drawStaticScene(canvas, world),
    { x: 0, y: 0, width: world.settings.worldWidth, height: world.settings.worldHeight },
  ), [world]);

  useEffect(() => () => staticPicture.dispose(), [staticPicture]);

  useEffect(() => {
    let active = true;
    let animationFrame = 0;
    const animate = (now: number) => {
      if (!active) return;
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const elapsed = Math.min(0.05, Math.max(0, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;
      if (!world.paused && !world.completed && !world.failed) {
        accumulatorRef.current += elapsed;
        let steps = 0;
        while (accumulatorRef.current >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
          onFrameRef.current(FIXED_STEP);
          accumulatorRef.current -= FIXED_STEP;
          steps += 1;
        }
        if (steps === MAX_STEPS_PER_FRAME) accumulatorRef.current = 0;
        setFrameTime(now);
      } else {
        accumulatorRef.current = 0;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
    };
  }, [world]);

  const scale = Math.min(width / world.settings.worldWidth, height / world.settings.worldHeight);
  const offsetX = (width - world.settings.worldWidth * scale) / 2;
  const offsetY = (height - world.settings.worldHeight * scale) / 2;
  const framePicture = createPicture(canvas => {
    canvas.drawRect({ x: 0, y: 0, width, height }, screenPaint);
    canvas.save();
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale, scale);
    canvas.clipRect({ x: 0, y: 0, width: world.settings.worldWidth, height: world.settings.worldHeight }, ClipOp.Intersect, false);
    canvas.drawPicture(staticPicture);
    drawDynamicScene(canvas, world, frameTime);
    canvas.restore();
  }, { x: 0, y: 0, width, height });

  return <Canvas style={styles.canvas}><Picture picture={framePicture} /></Canvas>;
}

export default React.memo(LuaGaCanvasSkia);

const styles = StyleSheet.create({ canvas: { flex: 1 } });
