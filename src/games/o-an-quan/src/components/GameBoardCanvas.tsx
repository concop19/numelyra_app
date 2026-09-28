// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  Rect,
  RoundedRect,
  Skia,
  useImage,
  vec,
} from '@shopify/react-native-skia';

import {
  BOTTOM_SIDE,
  TOP_SIDE,
  canSelectCell,
  totalInCell,
} from '../game/gameEngine';

const VIEW_W = 1000;
const VIEW_H = 760;
const SCENE_Y_OFFSET = 108;

const playerAvatar = require('../../assets/source/Screenshot_2026-06-18_151556-removebg-preview.png');
const computerAvatar = require('../../assets/source/Screenshot_2026-06-18_151510-removebg-preview.png');

type Point = { x: number; y: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pointAt = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const hashNoise = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const polygonCenter = (points: Point[]) => points.reduce((sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }), { x: 0, y: 0 });
const pointInPolygon = (point: Point, polygon: Point[]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};
const makePath = (points: Point[]) => {
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => path.lineTo(point.x, point.y));
  path.close();
  return path;
};

function makeGeometry() {
  const topLeft = { x: 230, y: 238 }; const topRight = { x: 760, y: 218 };
  const bottomRight = { x: 835, y: 444 }; const bottomLeft = { x: 160, y: 465 };
  const leftInnerTop = { x: 285, y: 244 }; const rightInnerTop = { x: 715, y: 224 };
  const leftInnerBottom = { x: 250, y: 456 }; const rightInnerBottom = { x: 770, y: 438 };
  const midLeft = pointAt(leftInnerTop, leftInnerBottom, 0.52);
  const midRight = pointAt(rightInnerTop, rightInnerBottom, 0.52);
  const cells: Point[][] = [];
  cells[0] = [topLeft, leftInnerTop, leftInnerBottom, bottomLeft, { x: 115, y: 385 }, { x: 145, y: 285 }];
  cells[6] = [rightInnerTop, topRight, { x: 880, y: 300 }, { x: 870, y: 392 }, bottomRight, rightInnerBottom];
  for (let col = 0; col < 5; col += 1) {
    const topA = pointAt(leftInnerTop, rightInnerTop, col / 5); const topB = pointAt(leftInnerTop, rightInnerTop, (col + 1) / 5);
    const midA = pointAt(midLeft, midRight, col / 5); const midB = pointAt(midLeft, midRight, (col + 1) / 5);
    const bottomA = pointAt(leftInnerBottom, rightInnerBottom, col / 5); const bottomB = pointAt(leftInnerBottom, rightInnerBottom, (col + 1) / 5);
    cells[1 + col] = [topA, topB, midB, midA];
    cells[11 - col] = [midA, midB, bottomB, bottomA];
  }
  const shift = (point: Point) => ({ ...point, y: point.y + SCENE_Y_OFFSET });
  return {
    cells: cells.map((cell) => cell.map(shift)),
    board: [topLeft, topRight, { x: 890, y: 300 }, { x: 875, y: 400 }, bottomRight, bottomLeft, { x: 112, y: 380 }, { x: 142, y: 288 }].map(shift),
  };
}

const GEOMETRY = makeGeometry();

function Stone({ x, y, radius, quan = false, seed = 0 }: { x: number; y: number; radius: number; quan?: boolean; seed?: number }) {
  const shade = quan ? '#777572' : '#2d6fc8';
  return <>
    <Circle cx={x} cy={y} r={radius * (1 + hashNoise(seed) * 0.08)} color={shade} />
    <Circle cx={x - radius * 0.28} cy={y - radius * 0.3} r={Math.max(1, radius * 0.27)} color={quan ? '#e8e5dc' : '#9dc4ff'} opacity={0.72} />
    <Circle cx={x} cy={y} r={radius} color={quan ? '#3d3b38' : '#102f67'} style="stroke" strokeWidth={quan ? 2.2 : 1.1} />
  </>;
}

function CellStones({ cell, index, polygon }: any) {
  const center = polygonCenter(polygon);
  const isQuan = polygon.length > 4;
  const citizens = [];
  for (let i = 0; i < cell.citizens; i += 1) {
    const angle = (Math.PI * 2 * i) / Math.max(cell.citizens, 6) + hashNoise(index * 101 + i) * 0.6;
    const distance = cell.citizens < 4 ? 12 + i * 7 : (isQuan ? 52 : 42) * (0.2 + hashNoise(index * 17 + i) * 0.58);
    citizens.push(<Stone key={i} x={center.x + Math.cos(angle) * distance} y={center.y + Math.sin(angle) * distance * 0.55} radius={isQuan ? 8.2 : 7.6} seed={index * 200 + i} />);
  }
  return <>{cell.mandarins > 0 && <Stone x={center.x} y={center.y + 8} radius={isQuan ? 46 : 13} quan seed={index * 31 + 9} />}{citizens}</>;
}

function Sky({ state, skyEffects }: any) {
  const stars = useMemo(() => Array.from({ length: 92 }, (_, i) => ({ x: hashNoise(i + 901) * VIEW_W, y: 8 + hashNoise(i + 127) * 286, r: 0.7 + hashNoise(i + 61) * 1.35 })), []);
  const visited = state.lastMove?.visited ?? [];
  const constellation = visited.slice(-12).map((index: number) => polygonCenter(GEOMETRY.cells[index]));
  return <>
    <Rect x={0} y={0} width={VIEW_W} height={322} color="#0b1c35" />
    <Rect x={0} y={322} width={VIEW_W} height={VIEW_H - 322} color="#392315" />
    {stars.map((star, index) => <Circle key={index} cx={star.x} cy={star.y} r={star.r} color="#e8f4ff" opacity={0.65} />)}
    <Circle cx={845} cy={62} r={14} color="#fff7d0" opacity={0.9} />
    {Array.from({ length: 80 }, (_, i) => {
      const y = 322 + hashNoise(i + 3) * 430; const x = hashNoise(i + 99) * VIEW_W;
      return <Line key={i} p1={vec(x, y)} p2={vec(x + 35 + hashNoise(i + 37) * 120, y + hashNoise(i) * 18 - 9)} color={i % 3 === 0 ? '#b97945' : '#1f1510'} strokeWidth={0.8 + hashNoise(i + 5) * 1.8} opacity={0.35} />;
    })}
    {constellation.slice(1).map((point: Point, index: number) => <Line key={index} p1={vec(constellation[index].x, constellation[index].y - 310)} p2={vec(point.x, point.y - 310)} color="#a5dcff" strokeWidth={2} opacity={0.65} />)}
    {constellation.map((point: Point, index: number) => <Circle key={index} cx={point.x} cy={Math.max(20, point.y - 310)} r={3.2} color="#fff7bd" />)}
    {skyEffects?.charge && <Circle cx={500} cy={120} r={22 + skyEffects.charge.clicks * 3} color="#ffd580" style="stroke" strokeWidth={2.5} opacity={0.8} />}
    {(skyEffects?.bursts ?? []).map((_: any, index: number) => <Circle key={index} cx={500} cy={120} r={60} color="#ffd276" style="stroke" strokeWidth={3} opacity={0.9} />)}
  </>;
}

export function GameBoard({ state, direction, onCellSelect, onDirectionSelect, onCaptureConfirm, canInteract, activeIndex, selectedCell, capturePrompt, skyEffects }: any) {
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const computer = useImage(computerAvatar); const player = useImage(playerAvatar);
  const scale = Math.min(layout.width / VIEW_W, layout.height / VIEW_H);
  const offsetX = (layout.width - VIEW_W * scale) / 2; const offsetY = (layout.height - VIEW_H * scale) / 2;
  const selectedCenter = selectedCell == null ? null : polygonCenter(GEOMETRY.cells[selectedCell]);
  const controls = selectedCenter && canInteract ? [
    { direction: 1, x: selectedCenter.x - 42, y: selectedCenter.y + 72 },
    { direction: -1, x: selectedCenter.x + 42, y: selectedCenter.y + 72 },
  ] : [];
  const onLayout = (event: LayoutChangeEvent) => setLayout(event.nativeEvent.layout);
  const resolveTouch = (event: any) => {
    const point = { x: (event.nativeEvent.locationX - offsetX) / scale, y: (event.nativeEvent.locationY - offsetY) / scale };
    if (capturePrompt) {
      if (pointInPolygon(point, GEOMETRY.cells[capturePrompt.emptyIndex])) onCaptureConfirm(capturePrompt.emptyIndex);
      return;
    }
    if (!canInteract) return;
    const control = controls.find((item) => Math.hypot(point.x - item.x, point.y - item.y) <= 28);
    if (control) return onDirectionSelect(control.direction);
    const index = GEOMETRY.cells.findIndex((polygon) => pointInPolygon(point, polygon));
    if (index >= 0) onCellSelect(index);
  };
  return <View style={styles.host} onLayout={onLayout} onStartShouldSetResponder={() => true} onResponderRelease={resolveTouch} accessible accessibilityLabel="Bàn chơi ô ăn quan">
    <Canvas style={StyleSheet.absoluteFill}>
      <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}>
        <Sky state={state} skyEffects={skyEffects} />
        {computer && <SkiaImage image={computer} x={350} y={92} width={300} height={196} opacity={0.94} fit="contain" />}
        {player && <SkiaImage image={player} x={180} y={576} width={650} height={172} opacity={0.95} fit="contain" />}
        <Path path={makePath(GEOMETRY.board)} color="#7a4b25" opacity={0.7} />
        <Path path={makePath(GEOMETRY.board)} color="#15110d" style="stroke" strokeWidth={5} />
        {GEOMETRY.cells.map((polygon, index) => {
          const selectable = canInteract && canSelectCell(state, index);
          const empty = capturePrompt?.emptyIndex === index; const target = capturePrompt?.targetIndex === index;
          const highlighted = index === activeIndex || index === selectedCell || empty || target;
          return <React.Fragment key={index}>
            <Path path={makePath(polygon)} color={empty ? '#f5c45f' : highlighted ? '#8ec9ff' : selectable ? '#d7a953' : '#442916'} opacity={empty ? 0.35 : highlighted ? 0.28 : selectable ? 0.18 : 0.15} />
            <Path path={makePath(polygon)} color={empty ? '#f5c45f' : highlighted ? '#8ec9ff' : '#15110d'} style="stroke" strokeWidth={highlighted ? 4.4 : 3} />
            <CellStones cell={state.cells[index]} index={index} polygon={polygon} />
          </React.Fragment>;
        })}
        {controls.map((control) => <React.Fragment key={control.direction}><Circle cx={control.x} cy={control.y} r={25} color="#f8e8c9" /><Line p1={vec(control.x + (control.direction === 1 ? 9 : -9), control.y)} p2={vec(control.x + (control.direction === 1 ? -8 : 8), control.y)} color="#20150f" strokeWidth={4} /></React.Fragment>)}
      </Group>
    </Canvas>
  </View>;
}

const styles = StyleSheet.create({ host: { width: '100%', aspectRatio: VIEW_W / VIEW_H, maxHeight: '100%', overflow: 'hidden', borderRadius: 10, backgroundColor: '#392315' } });
