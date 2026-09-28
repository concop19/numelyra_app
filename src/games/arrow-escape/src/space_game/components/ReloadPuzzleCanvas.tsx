import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  Skia,
  SkPath,
} from '@shopify/react-native-skia';
import {
  getArrowCells,
  getArrowHead,
  getExitDirection,
  isFrontClear,
} from '../../game/engine';
import { Direction, GridPosition } from '../../game/types';
import {
  loadSpaceLevel,
  SpaceArrowNode,
  SpaceBoardState,
} from '../engine/levelLoader';
import { AMMO_CONFIGS } from '../types';

interface Props {
  width: number;
  height: number;
  onArrowCleared: (arrow: SpaceArrowNode) => void;
  onBoardCleared: (clearedLevelId: number) => void;
  onBlocked: () => void;
}

interface ExitingAnim {
  arrow: SpaceArrowNode;
  bodyPath: SkPath;
  headPath: SkPath;
  progress: number;
  dir: Direction;
}

interface BlockedAnim {
  id: string;
  progress: number;
}

function centerOf(pos: GridPosition, cellSize: number, offsetX: number, offsetY: number) {
  return {
    x: offsetX + pos.x * cellSize + cellSize / 2,
    y: offsetY + pos.y * cellSize + cellSize / 2,
  };
}

function makeArrowBodyPath(
  arrow: SpaceArrowNode,
  cellSize: number,
  offsetX: number,
  offsetY: number
) {
  const path = Skia.Path.Make();
  const fp = arrow.fullPath;
  if (!fp || fp.length === 0) return path;

  const startPt = centerOf(fp[0]!, cellSize, offsetX, offsetY);
  path.moveTo(startPt.x, startPt.y);

  for (let i = 1; i < fp.length; i++) {
    const pt = centerOf(fp[i]!, cellSize, offsetX, offsetY);
    path.lineTo(pt.x, pt.y);
  }
  return path;
}

function makeArrowHeadPath(
  arrow: SpaceArrowNode,
  cellSize: number,
  offsetX: number,
  offsetY: number
) {
  const path = Skia.Path.Make();
  const head = getArrowHead(arrow);
  const end = centerOf(head, cellSize, offsetX, offsetY);
  const exitDir = getExitDirection(arrow);
  const headSize = Math.max(10, cellSize * 0.36);

  let angle = 0;
  if (exitDir === 'RIGHT') angle = 0;
  else if (exitDir === 'DOWN') angle = Math.PI / 2;
  else if (exitDir === 'LEFT') angle = Math.PI;
  else if (exitDir === 'UP') angle = -Math.PI / 2;

  path.moveTo(
    end.x + Math.cos(angle) * headSize,
    end.y + Math.sin(angle) * headSize
  );
  path.lineTo(
    end.x + Math.cos(angle + (Math.PI * 3.5) / 4) * headSize,
    end.y + Math.sin(angle + (Math.PI * 3.5) / 4) * headSize
  );
  path.lineTo(
    end.x + Math.cos(angle - (Math.PI * 3.5) / 4) * headSize,
    end.y + Math.sin(angle - (Math.PI * 3.5) / 4) * headSize
  );
  path.close();
  return path;
}

function findArrowAtPoint(
  arrows: SpaceArrowNode[],
  px: number,
  py: number,
  cellSize: number,
  offsetX: number,
  offsetY: number
): SpaceArrowNode | null {
  const hitRadius = cellSize * 0.85;
  let closest: SpaceArrowNode | null = null;
  let minDist = Infinity;

  for (let i = 0; i < arrows.length; i++) {
    const arrow = arrows[i]!;
    const cells = getArrowCells(arrow);
    for (let j = 0; j < cells.length; j++) {
      const c = centerOf(cells[j]!, cellSize, offsetX, offsetY);
      const dist = Math.hypot(c.x - px, c.y - py);
      if (dist < minDist) {
        minDist = dist;
        closest = arrow;
      }
    }
  }

  if (closest && minDist <= hitRadius) {
    return closest;
  }
  return null;
}

export const ReloadPuzzleCanvas = React.memo(function ReloadPuzzleCanvas({
  width,
  height,
  onArrowCleared,
  onBoardCleared,
  onBlocked,
}: Props) {
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [board, setBoard] = useState<SpaceBoardState>(() => loadSpaceLevel(1));

  const exitingRef = useRef<ExitingAnim[]>([]);
  const blockedRef = useRef<BlockedAnim[]>([]);
  const boardRef = useRef(board);
  boardRef.current = board;

  const [, setTick] = useState(0);

  const headerHeight = 32;
  const canvasHeight = Math.max(100, height - headerHeight);

  const cols = board.columns;
  const rows = board.rows;
  const cellSize = Math.min((width - 16) / cols, (canvasHeight - 16) / rows);
  const offsetX = (width - cellSize * cols) / 2;
  const offsetY = (canvasHeight - cellSize * rows) / 2;

  // Pre-calculate Skia paths for static board arrows: computed ONLY when board changes
  const arrowPaths = useMemo(() => {
    const map = new Map<
      string,
      {
        bodyPath: SkPath;
        headPath: SkPath;
        midCenter: { x: number; y: number };
      }
    >();

    for (let i = 0; i < board.arrows.length; i++) {
      const arrow = board.arrows[i]!;
      const bodyPath = makeArrowBodyPath(arrow, cellSize, offsetX, offsetY);
      const headPath = makeArrowHeadPath(arrow, cellSize, offsetX, offsetY);
      const midIdx = Math.floor(arrow.fullPath.length / 2);
      const midCell = arrow.fullPath[midIdx]!;
      const midCenter = centerOf(midCell, cellSize, offsetX, offsetY);
      map.set(arrow.id, { bodyPath, headPath, midCenter });
    }

    return map;
  }, [board.arrows, cellSize, offsetX, offsetY]);

  // Pre-calculate background dots (static array)
  const dots = useMemo(() => {
    const list: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          x: offsetX + c * cellSize + cellSize / 2,
          y: offsetY + r * cellSize + cellSize / 2,
        });
      }
    }
    return list;
  }, [rows, cols, cellSize, offsetX, offsetY]);

  // On-demand animation loop: runs ONLY while animating, consumes 0% CPU at idle
  const isAnimatingRef = useRef(false);
  const animIdRef = useRef<number | null>(null);

  const startAnimLoop = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      let hasActiveAnims = false;

      // Update exiting arrows
      for (let i = exitingRef.current.length - 1; i >= 0; i--) {
        const ea = exitingRef.current[i]!;
        ea.progress += dt * 3.5;
        if (ea.progress >= 1) {
          exitingRef.current.splice(i, 1);
        } else {
          hasActiveAnims = true;
        }
      }

      // Update blocked shake animations
      for (let i = blockedRef.current.length - 1; i >= 0; i--) {
        const ba = blockedRef.current[i]!;
        ba.progress += dt * 6.0;
        if (ba.progress >= 1) {
          blockedRef.current.splice(i, 1);
        } else {
          hasActiveAnims = true;
        }
      }

      if (hasActiveAnims) {
        setTick((t) => (t + 1) % 1000000);
        animIdRef.current = requestAnimationFrame(loop);
      } else {
        isAnimatingRef.current = false;
        animIdRef.current = null;
        setTick((t) => (t + 1) % 1000000);
      }
    };

    animIdRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, []);

  const changeLevel = useCallback((newLevelId: number) => {
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
    }
    isAnimatingRef.current = false;
    exitingRef.current = [];
    blockedRef.current = [];

    const next = loadSpaceLevel(newLevelId);
    setCurrentLevelId(next.levelId);
    setBoard(next);
    boardRef.current = next;
  }, []);

  const handleTouch = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    if (typeof locationX !== 'number' || typeof locationY !== 'number') return;

    const curBoard = boardRef.current;
    const clickedArrow = findArrowAtPoint(
      curBoard.arrows,
      locationX,
      locationY,
      cellSize,
      offsetX,
      offsetY
    );
    if (!clickedArrow) return;

    if (isFrontClear(clickedArrow, curBoard.rawBoard)) {
      const exitDir = getExitDirection(clickedArrow);
      const cached = arrowPaths.get(clickedArrow.id);

      if (cached) {
        exitingRef.current.push({
          arrow: clickedArrow,
          bodyPath: cached.bodyPath,
          headPath: cached.headPath,
          progress: 0,
          dir: exitDir,
        });
      }

      const remaining = curBoard.arrows.filter((a) => a.id !== clickedArrow.id);
      const nextBoard: SpaceBoardState = {
        ...curBoard,
        arrows: remaining,
        rawBoard: {
          ...curBoard.rawBoard,
          arrows: remaining,
          removedIds: [...curBoard.rawBoard.removedIds, clickedArrow.id],
        },
      };

      setBoard(nextBoard);
      boardRef.current = nextBoard;
      startAnimLoop();

      onArrowCleared(clickedArrow);

      if (remaining.length === 0) {
        onBoardCleared(curBoard.levelId);
        setTimeout(() => {
          const nextId =
            curBoard.levelId >= curBoard.totalLevels ? 1 : curBoard.levelId + 1;
          changeLevel(nextId);
        }, 500);
      }
    } else {
      onBlocked();
      blockedRef.current = blockedRef.current.filter((b) => b.id !== clickedArrow.id);
      blockedRef.current.push({ id: clickedArrow.id, progress: 0 });
      startAnimLoop();
    }
  };

  const strokeW = Math.max(4, cellSize * 0.18);
  const badgeR = Math.max(7, cellSize * 0.28);

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Header Controls */}
      <View style={[styles.header, { width }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() =>
            changeLevel(currentLevelId > 1 ? currentLevelId - 1 : board.totalLevels)
          }
        >
          <Text style={styles.navBtnText}>◀</Text>
        </Pressable>

        <View style={styles.levelInfo}>
          <Text style={styles.levelTitleText}>
            {(board.levelTitle || `MÊ CUNG ${board.levelId}`).toUpperCase()} ({board.arrows.length} MŨI TÊN)
          </Text>
        </View>

        <Pressable
          style={styles.navBtn}
          onPress={() =>
            changeLevel(currentLevelId < board.totalLevels ? currentLevelId + 1 : 1)
          }
        >
          <Text style={styles.navBtnText}>▶</Text>
        </Pressable>

        <Pressable style={styles.resetBtn} onPress={() => changeLevel(currentLevelId)}>
          <Text style={styles.resetBtnText}>↺ ĐẶT LẠI</Text>
        </Pressable>
      </View>

      {/* Skia Puzzle Canvas */}
      <View style={{ width, height: canvasHeight }}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Outer & Inner Backdrop */}
          <Rect x={0} y={0} width={width} height={canvasHeight} color="#0f172a" />
          <Rect
            x={offsetX - 4}
            y={offsetY - 4}
            width={cols * cellSize + 8}
            height={rows * cellSize + 8}
            color="#1e293b"
          />

          {/* Dots */}
          {dots.map((d, i) => (
            <Circle
              key={`dot-${i}`}
              cx={d.x}
              cy={d.y}
              r={Math.max(1.5, cellSize * 0.08)}
              color="#334155"
            />
          ))}

          {/* Static Board Arrows (using cached paths) */}
          {board.arrows.map((arrow) => {
            const isBlocked = blockedRef.current.find((b) => b.id === arrow.id);
            const shakeX = isBlocked
              ? Math.sin(isBlocked.progress * Math.PI * 6) * 5
              : 0;
            const color = isBlocked ? '#ff1744' : arrow.color;

            const cached = arrowPaths.get(arrow.id);
            if (!cached) return null;

            return (
              <Group
                key={`arr-${arrow.id}`}
                transform={shakeX !== 0 ? [{ translateX: shakeX }] : undefined}
              >
                <Path
                  path={cached.bodyPath}
                  color={color}
                  style="stroke"
                  strokeWidth={strokeW}
                  strokeCap="round"
                  strokeJoin="round"
                />
                <Path path={cached.headPath} color={color} />
                {/* Badge background circle */}
                <Circle cx={cached.midCenter.x} cy={cached.midCenter.y} r={badgeR} color="#0f172a" />
                <Circle
                  cx={cached.midCenter.x}
                  cy={cached.midCenter.y}
                  r={badgeR}
                  color={color}
                  style="stroke"
                  strokeWidth={1.5}
                />
              </Group>
            );
          })}

          {/* Exiting Arrows (using cached paths) */}
          {exitingRef.current.map((ea, i) => {
            let slideX = 0;
            let slideY = 0;
            const dist = ea.progress * (canvasHeight * 1.2);
            if (ea.dir === 'UP') slideY = -dist;
            else if (ea.dir === 'DOWN') slideY = dist;
            else if (ea.dir === 'LEFT') slideX = -dist;
            else if (ea.dir === 'RIGHT') slideX = dist;

            return (
              <Group
                key={`exit-${ea.arrow.id}-${i}`}
                transform={[{ translateX: slideX }, { translateY: slideY }]}
                opacity={Math.max(0, 1 - ea.progress * 0.85)}
              >
                <Path
                  path={ea.bodyPath}
                  color={ea.arrow.color}
                  style="stroke"
                  strokeWidth={strokeW}
                  strokeCap="round"
                  strokeJoin="round"
                />
                <Path path={ea.headPath} color={ea.arrow.color} />
              </Group>
            );
          })}

          {/* Border Frame */}
          <Rect
            x={offsetX - 4}
            y={offsetY - 4}
            width={cols * cellSize + 8}
            height={rows * cellSize + 8}
            color="#475569"
            style="stroke"
            strokeWidth={2}
          />
        </Canvas>

        {/* Text Badges Overlay for Ammo Icons */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {board.arrows.map((arrow) => {
            const cached = arrowPaths.get(arrow.id);
            if (!cached) return null;

            const isBlocked = blockedRef.current.find((b) => b.id === arrow.id);
            const shakeX = isBlocked
              ? Math.sin(isBlocked.progress * Math.PI * 6) * 5
              : 0;
            const midCenter = cached.midCenter;
            const cfg = AMMO_CONFIGS[arrow.ammoType];

            return (
              <Text
                key={`badge-txt-${arrow.id}`}
                style={{
                  position: 'absolute',
                  left: midCenter.x + shakeX - badgeR,
                  top: midCenter.y - badgeR,
                  width: badgeR * 2,
                  height: badgeR * 2,
                  textAlign: 'center',
                  lineHeight: badgeR * 2,
                  fontSize: Math.round(badgeR * 1.1),
                }}
              >
                {cfg?.icon || '•'}
              </Text>
            );
          })}
        </View>

        {/* Touch Overlay */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={handleTouch}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  header: {
    height: 32,
    backgroundColor: '#090d1f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  navBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
  navBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelInfo: {
    flex: 1,
    alignItems: 'center',
  },
  levelTitleText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#334155',
    borderRadius: 4,
  },
  resetBtnText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
