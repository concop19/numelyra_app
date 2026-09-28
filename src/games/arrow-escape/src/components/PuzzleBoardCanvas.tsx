import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { getArrowCells, getArrowHead, getExitDirection } from '../game/engine';
import type { ArrowNode, BoardState, Direction } from '../game/types';
import { theme } from '../theme/theme';

type Props = {
  board: BoardState;
  exitingArrows: ArrowNode[];
  width: number;
  onArrowPress: (arrowId: string) => void;
  onExitDone: (arrowId: string) => void;
};

const arrowHeadSize = 12;

const dirVec: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 }
};

export function PuzzleBoardCanvas({ board, exitingArrows, width, onArrowPress, onExitDone }: Props) {
  const cellSize = width / board.level.gridSize.columns;
  const height = cellSize * board.level.gridSize.rows;
  const strokeW = Math.max(3, cellSize * 0.13);

  const initialDots = useMemo(() => {
    const dots: { r: number; c: number }[] = [];
    const occupied = new Set<string>();

    const arrows = board.level?.arrows || [];
    arrows.forEach((arrow) => {
      const fullPath = arrow.fullPath || [];
      fullPath.forEach((cell) => {
        occupied.add(`${cell.x},${cell.y}`);
      });
    });

    const rows = board.level?.gridSize?.rows || 0;
    const columns = board.level?.gridSize?.columns || 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        if (occupied.has(`${c},${r}`)) {
          dots.push({ r, c });
        }
      }
    }
    return dots;
  }, [board.level]);

  const arrowPaths = useMemo(
    () => board.arrows.map((arrow) => {
      return {
        id: arrow.id,
        path: makeArrowPath(arrow, cellSize),
        color: theme.colors.arrowStroke
      };
    }),
    [board.arrows, cellSize]
  );

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Static arrows via Skia */}
      <Canvas style={StyleSheet.absoluteFill}>
        {initialDots.map(({ r, c }) => (
          <Circle
            key={`dot-${r}-${c}`}
            cx={c * cellSize + cellSize / 2}
            cy={r * cellSize + cellSize / 2}
            r={Math.max(2, cellSize * 0.05)}
            color={theme.colors.borderSoft}
          />
        ))}
        {arrowPaths.map(({ id, path, color }) => (
          <Path
            key={id}
            path={path}
            color={color}
            style="stroke"
            strokeCap="round"
            strokeJoin="round"
            strokeWidth={strokeW}
          />
        ))}
      </Canvas>

      {/* Exiting arrow overlays with slide animation */}
      {exitingArrows.map((arrow) => (
        <ExitingArrow
          key={`exit-${arrow.id}`}
          arrow={arrow}
          cellSize={cellSize}
          strokeWidth={strokeW}
          onDone={() => onExitDone(arrow.id)}
        />
      ))}

      {/* Touch layer */}
      <Pressable
        style={[StyleSheet.absoluteFill, { zIndex: 100, cursor: 'pointer' as any }]}
        onPress={(event) => {
          const nativeEvent = event.nativeEvent as any;
          let x = nativeEvent?.locationX;
          let y = nativeEvent?.locationY;

          // React Native Web fix: locationX/locationY is undefined on DOM Mouse/Pointer/Touch events
          if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
            const currentTarget = event.currentTarget as any;
            const touch = nativeEvent?.touches?.[0] || nativeEvent?.changedTouches?.[0];
            const clientX = nativeEvent?.clientX ?? touch?.clientX;
            const clientY = nativeEvent?.clientY ?? touch?.clientY;

            if (currentTarget?.getBoundingClientRect && typeof clientX === 'number' && typeof clientY === 'number') {
              const rect = currentTarget.getBoundingClientRect();
              x = clientX - rect.left;
              y = clientY - rect.top;
            } else if (typeof nativeEvent?.offsetX === 'number' && typeof nativeEvent?.offsetY === 'number') {
              x = nativeEvent.offsetX;
              y = nativeEvent.offsetY;
            }
          }

          if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
            const arrow = findArrowAtPoint(board.arrows, x, y, cellSize);
            if (arrow) {
              onArrowPress(arrow.id);
            }
          }
        }}
      />
    </View>
  );
}

function ExitingArrow({
  arrow, cellSize, strokeWidth: sw, onDone
}: {
  arrow: ArrowNode; cellSize: number; strokeWidth: number; onDone: () => void;
}) {
  const animProgress = useSharedValue(0);
  const opacity = useSharedValue(1);

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    const cells = arrow.fullPath;
    if (cells.length === 0) return path;

    const first = cells[0]!;
    const start = centerOf(first, cellSize);
    path.moveTo(start.x, start.y);

    for (let i = 1; i < cells.length; i++) {
      const pt = centerOf(cells[i]!, cellSize);
      path.lineTo(pt.x, pt.y);
    }

    const head = cells[cells.length - 1]!;
    const exitDir = getExitDirection(arrow);
    const v = dirVec[exitDir];
    const lastCenter = centerOf(head, cellSize);
    
    // Extend the path by 12 cells in the exit direction so it goes fully off-screen
    const extensionLength = cellSize * 12;
    const exitEnd = {
      x: lastCenter.x + v.x * extensionLength,
      y: lastCenter.y + v.y * extensionLength,
    };
    path.lineTo(exitEnd.x, exitEnd.y);

    return path;
  }, [arrow, cellSize]);

  const { totalLength, arrowLength, contour } = useMemo(() => {
    const it = Skia.ContourMeasureIter(trackPath, false, 1);
    const contourVal = it.next();
    const trackLen = contourVal ? contourVal.length() : 0;
    const arrowLen = Math.max(0, trackLen - cellSize * 12);
    return { totalLength: trackLen, arrowLength: arrowLen, contour: contourVal };
  }, [trackPath, cellSize]);

  useEffect(() => {
    animProgress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    opacity.value = withTiming(0, {
      duration: 1200,
      easing: Easing.bezier(0.7, 0, 0.84, 0)
    }, (fin) => {
      if (fin) runOnJS(onDone)();
    });
  }, []);

  const startVal = useDerivedValue(() => {
    const t = animProgress.value;
    return (t * (totalLength - arrowLength)) / totalLength;
  });

  const endVal = useDerivedValue(() => {
    const t = animProgress.value;
    return (arrowLength + t * (totalLength - arrowLength)) / totalLength;
  });

  const arrowheadPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!contour) return path;

    const t = animProgress.value;
    const posHead = arrowLength + t * (totalLength - arrowLength);

    const posTan = contour.getPosTan(posHead);
    if (!posTan) return path;

    const [pos, tangent] = posTan;
    const sz = Math.min(arrowHeadSize, cellSize * 0.32);
    const tx = tangent.x;
    const ty = tangent.y;

    const leftX = pos.x - sz * tx - sz * ty;
    const leftY = pos.y - sz * ty + sz * tx;
    const rightX = pos.x - sz * tx + sz * ty;
    const rightY = pos.y - sz * ty - sz * tx;

    path.moveTo(leftX, leftY);
    path.lineTo(pos.x, pos.y);
    path.lineTo(rightX, rightY);

    return path;
  });

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle, { zIndex: 10 }]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Draw the moving body of the arrow */}
        <Path
          path={trackPath}
          start={startVal}
          end={endVal}
          color={theme.colors.arrowStroke}
          style="stroke"
          strokeCap="round"
          strokeJoin="round"
          strokeWidth={sw}
        />
        {/* Draw the moving arrowhead */}
        <Path
          path={arrowheadPath}
          color={theme.colors.arrowStroke}
          style="stroke"
          strokeCap="round"
          strokeJoin="round"
          strokeWidth={sw}
        />
      </Canvas>
    </Animated.View>
  );
}

/**
 * Build a Skia path that traces through all fullPath cells and draws an arrowhead at the tip.
 */
function makeArrowPath(arrow: ArrowNode, cellSize: number) {
  const path = Skia.Path.Make();
  const cells = arrow.fullPath;

  if (cells.length === 0) return path;

  const first = cells[0]!;
  const start = centerOf(first, cellSize);
  path.moveTo(start.x, start.y);

  // Draw polyline through every cell
  for (let i = 1; i < cells.length; i++) {
    const pt = centerOf(cells[i]!, cellSize);
    path.lineTo(pt.x, pt.y);
  }

  // Draw arrowhead at the tip
  const head = getArrowHead(arrow);
  const end = centerOf(head, cellSize);
  const exitDir = getExitDirection(arrow);
  const headPoints = getHeadPoints(end, exitDir, cellSize);

  path.moveTo(headPoints.left.x, headPoints.left.y);
  path.lineTo(end.x, end.y);
  path.lineTo(headPoints.right.x, headPoints.right.y);

  return path;
}

function centerOf(pos: { x: number; y: number }, cellSize: number) {
  return { x: pos.x * cellSize + cellSize / 2, y: pos.y * cellSize + cellSize / 2 };
}

function getHeadPoints(pt: { x: number; y: number }, dir: Direction, cellSize: number) {
  const sz = Math.min(arrowHeadSize, cellSize * 0.32);
  switch (dir) {
    case 'UP':    return { left: { x: pt.x - sz, y: pt.y + sz }, right: { x: pt.x + sz, y: pt.y + sz } };
    case 'DOWN':  return { left: { x: pt.x - sz, y: pt.y - sz }, right: { x: pt.x + sz, y: pt.y - sz } };
    case 'LEFT':  return { left: { x: pt.x + sz, y: pt.y - sz }, right: { x: pt.x + sz, y: pt.y + sz } };
    case 'RIGHT': return { left: { x: pt.x - sz, y: pt.y - sz }, right: { x: pt.x - sz, y: pt.y + sz } };
  }
}

function findArrowAtPoint(arrows: ArrowNode[], x: number, y: number, cellSize: number) {
  let closestArrow: ArrowNode | null = null;
  let minDistance = Infinity;

  for (const arrow of arrows) {
    for (const cell of getArrowCells(arrow)) {
      const c = centerOf(cell, cellSize);
      const dist = Math.hypot(c.x - x, c.y - y);
      if (dist < minDistance) {
        minDistance = dist;
        closestArrow = arrow;
      }
    }
  }

  // Generous hit tolerance up to 0.85 of a cell size
  if (closestArrow && minDistance <= cellSize * 0.85) {
    return closestArrow;
  }
  return undefined;
}

const styles = StyleSheet.create({
  container: { overflow: 'visible' }
});
