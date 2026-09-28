import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getArrowCells, getArrowHead, getExitDirection, isFrontClear } from '../../game/engine';
import { Direction, GridPosition } from '../../game/types';
import { loadSpaceLevel, SpaceArrowNode, SpaceBoardState } from '../engine/levelLoader';
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
  progress: number;
  dir: Direction;
}

interface BlockedAnim {
  id: string;
  progress: number;
}

export function ReloadPuzzleCanvas({
  width,
  height,
  onArrowCleared,
  onBoardCleared,
  onBlocked,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Current Level ID (1, 2, 3, 4 from level.json)
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [board, setBoard] = useState<SpaceBoardState>(() => loadSpaceLevel(1));

  const exitingRef = useRef<ExitingAnim[]>([]);
  const blockedRef = useRef<BlockedAnim[]>([]);
  const boardRef = useRef(board);
  boardRef.current = board;

  const headerHeight = 32;
  const canvasHeight = height - headerHeight;

  const cols = board.columns;
  const rows = board.rows;
  const cellSize = Math.min((width - 16) / cols, (canvasHeight - 16) / rows);
  const offsetX = (width - cellSize * cols) / 2;
  const offsetY = (canvasHeight - cellSize * rows) / 2;

  // Switch or reload level
  const changeLevel = useCallback((newLevelId: number) => {
    const next = loadSpaceLevel(newLevelId);
    setCurrentLevelId(next.levelId);
    setBoard(next);
    boardRef.current = next;
    exitingRef.current = [];
    blockedRef.current = [];
  }, []);

  // Animation render loop
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

      // Update exiting animations
      for (let i = exitingRef.current.length - 1; i >= 0; i--) {
        const ea = exitingRef.current[i]!;
        ea.progress += dt * 3.0; // Fast launch (0.33s)
        if (ea.progress >= 1) {
          exitingRef.current.splice(i, 1);
        }
      }

      // Update blocked shake animations
      for (let i = blockedRef.current.length - 1; i >= 0; i--) {
        const ba = blockedRef.current[i]!;
        ba.progress += dt * 5.0;
        if (ba.progress >= 1) {
          blockedRef.current.splice(i, 1);
        }
      }

      // Clear & Draw
      ctx.clearRect(0, 0, width, canvasHeight);

      // Background board area
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, canvasHeight);

      // Inner maze backdrop
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(offsetX - 4, offsetY - 4, cols * cellSize + 8, rows * cellSize + 8);

      // Grid Dots (like classic game)
      ctx.fillStyle = '#334155';
      const curBoard = boardRef.current;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = offsetX + c * cellSize + cellSize / 2;
          const cy = offsetY + r * cellSize + cellSize / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.5, cellSize * 0.08), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Static Labyrinth Arrows
      for (const arrow of curBoard.arrows) {
        const isBlocked = blockedRef.current.find((b) => b.id === arrow.id);
        const shakeX = isBlocked ? Math.sin(isBlocked.progress * Math.PI * 6) * 5 : 0;
        drawLabyrinthArrow(
          ctx,
          arrow,
          cellSize,
          offsetX + shakeX,
          offsetY,
          isBlocked ? '#ff1744' : undefined
        );
      }

      // Draw Exiting Arrows (launching towards top screen)
      for (const ea of exitingRef.current) {
        const dir = ea.dir;
        let slideX = 0;
        let slideY = 0;
        const dist = ea.progress * (canvasHeight * 1.2);
        if (dir === 'UP') slideY = -dist;
        else if (dir === 'DOWN') slideY = dist;
        else if (dir === 'LEFT') slideX = -dist;
        else if (dir === 'RIGHT') slideX = dist;

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - ea.progress * 0.85);
        drawLabyrinthArrow(ctx, ea.arrow, cellSize, offsetX + slideX, offsetY + slideY, ea.arrow.color, true);
        ctx.restore();
      }

      // Maze Border Frame
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX - 4, offsetY - 4, cols * cellSize + 8, rows * cellSize + 8);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, canvasHeight, cols, rows, cellSize, offsetX, offsetY]);

  // Touch / Click Handler
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const curBoard = boardRef.current;
    const clickedArrow = findArrowAtPoint(curBoard.arrows, x, y, cellSize, offsetX, offsetY);
    if (!clickedArrow) return;

    // Use authentic engine rule: isFrontClear
    if (isFrontClear(clickedArrow, curBoard.rawBoard)) {
      const exitDir = getExitDirection(clickedArrow);

      // Add to exit animations
      exitingRef.current.push({
        arrow: clickedArrow,
        progress: 0,
        dir: exitDir,
      });

      // Update remaining arrows
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

      onArrowCleared(clickedArrow);

      // Check if board fully cleared!
      if (remaining.length === 0) {
        onBoardCleared(curBoard.levelId);
        setTimeout(() => {
          // Advance to next authentic level (1 -> 2 -> 3 -> 4 -> 1)
          const nextId = curBoard.levelId >= curBoard.totalLevels ? 1 : curBoard.levelId + 1;
          changeLevel(nextId);
        }, 600);
      }
    } else {
      // Blocked!
      onBlocked();
      blockedRef.current = blockedRef.current.filter((b) => b.id !== clickedArrow.id);
      blockedRef.current.push({ id: clickedArrow.id, progress: 0 });
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Mini Level Navigation Header */}
      <View style={[styles.header, { width }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => changeLevel(currentLevelId > 1 ? currentLevelId - 1 : board.totalLevels)}
        >
          <Text style={styles.navBtnText}>◀</Text>
        </Pressable>

        <View style={styles.levelInfo}>
          <Text style={styles.levelTitleText}>
            {board.levelTitle.toUpperCase()} ({board.arrows.length} MŨI TÊN)
          </Text>
        </View>

        <Pressable
          style={styles.navBtn}
          onPress={() => changeLevel(currentLevelId < board.totalLevels ? currentLevelId + 1 : 1)}
        >
          <Text style={styles.navBtnText}>▶</Text>
        </Pressable>

        <Pressable style={styles.resetBtn} onPress={() => changeLevel(currentLevelId)}>
          <Text style={styles.resetBtnText}>↺ ĐẶT LẠI</Text>
        </Pressable>
      </View>

      {/* Main Canvas rendering authentic labyrinth */}
      <canvas
        ref={canvasRef}
        width={width}
        height={canvasHeight}
        style={{
          width,
          height: canvasHeight,
          display: 'block',
          touchAction: 'none',
          cursor: 'pointer',
        }}
        onPointerDown={handlePointerDown}
      />
    </View>
  );
}

function drawLabyrinthArrow(
  ctx: CanvasRenderingContext2D,
  arrow: SpaceArrowNode,
  cellSize: number,
  offsetX: number,
  offsetY: number,
  overrideColor?: string,
  isExiting = false
) {
  const fp = arrow.fullPath;
  if (fp.length === 0) return;

  const color = overrideColor || arrow.color;
  const strokeW = Math.max(4, cellSize * 0.18);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = isExiting ? 14 : 7;

  // Draw arrow path (connecting all cells)
  ctx.beginPath();
  const startPt = centerOf(fp[0]!, cellSize, offsetX, offsetY);
  ctx.moveTo(startPt.x, startPt.y);

  for (let i = 1; i < fp.length; i++) {
    const pt = centerOf(fp[i]!, cellSize, offsetX, offsetY);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  // Draw Arrow Head at the tip (last cell in fullPath)
  const head = getArrowHead(arrow);
  const end = centerOf(head, cellSize, offsetX, offsetY);
  const exitDir = getExitDirection(arrow);
  const headSize = Math.max(10, cellSize * 0.36);

  let angle = 0;
  if (exitDir === 'RIGHT') angle = 0;
  else if (exitDir === 'DOWN') angle = Math.PI / 2;
  else if (exitDir === 'LEFT') angle = Math.PI;
  else if (exitDir === 'UP') angle = -Math.PI / 2;

  ctx.beginPath();
  ctx.moveTo(
    end.x + Math.cos(angle) * headSize,
    end.y + Math.sin(angle) * headSize
  );
  ctx.lineTo(
    end.x + Math.cos(angle + (Math.PI * 3.5) / 4) * headSize,
    end.y + Math.sin(angle + (Math.PI * 3.5) / 4) * headSize
  );
  ctx.lineTo(
    end.x + Math.cos(angle - (Math.PI * 3.5) / 4) * headSize,
    end.y + Math.sin(angle - (Math.PI * 3.5) / 4) * headSize
  );
  ctx.closePath();
  ctx.fill();

  // Draw Ammo Badge / Icon in middle of arrow
  const midIdx = Math.floor(fp.length / 2);
  const midCell = fp[midIdx]!;
  const midCenter = centerOf(midCell, cellSize, offsetX, offsetY);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  const badgeR = Math.max(7, cellSize * 0.28);
  ctx.arc(midCenter.x, midCenter.y, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ammo Icon Symbol inside badge
  const iconSize = Math.round(badgeR * 1.2);
  ctx.font = `bold ${iconSize}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  const cfg = AMMO_CONFIGS[arrow.ammoType];
  ctx.fillText(cfg.icon, midCenter.x, midCenter.y);

  ctx.restore();
}

function centerOf(pos: GridPosition, cellSize: number, offsetX: number, offsetY: number) {
  return {
    x: offsetX + pos.x * cellSize + cellSize / 2,
    y: offsetY + pos.y * cellSize + cellSize / 2,
  };
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

  for (const arrow of arrows) {
    for (const pt of getArrowCells(arrow)) {
      const c = centerOf(pt, cellSize, offsetX, offsetY);
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
