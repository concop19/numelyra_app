import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { DotBoxGameState, Player } from '../types';

interface DotBoxBoardCanvasProps {
  state: DotBoxGameState;
  onLineClick: (lineId: string) => void;
  canInteract: boolean;
  size?: number;
}

export function DotBoxBoardCanvas({
  state,
  onLineClick,
  canInteract,
  size = 420,
}: DotBoxBoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

  const boardSize = state.boardSize;
  const dotCount = state.dotCount;
  const padding = 34;
  const usableSize = size - padding * 2;
  const step = usableSize / boardSize;

  // Convert grid dot (x, y) to pixel coordinates
  const getDotPos = useCallback((x: number, y: number) => {
    return {
      px: padding + x * step,
      py: padding + y * step,
    };
  }, [padding, step]);

  // Distance from point (px, py) to line segment (ax, ay) -> (bx, by)
  const distToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
    if (l2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
  };

  // Find line closest to pixel (cx, cy)
  const findClosestOpenLine = useCallback((cx: number, cy: number) => {
    let closestId: string | null = null;
    let minDistance = step * 0.44; // Hit tolerance

    for (const line of Object.values(state.lines)) {
      if (line.owner !== null) continue; // Skip already connected

      const p1 = getDotPos(line.d1.x, line.d1.y);
      const p2 = getDotPos(line.d2.x, line.d2.y);
      const d = distToSegment(cx, cy, p1.px, p1.py, p2.px, p2.py);

      if (d < minDistance) {
        minDistance = d;
        closestId = line.id;
      }
    }

    return closestId;
  }, [getDotPos, state.lines, step]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, size, size);

    // 1. Draw Board Background plate
    const platePadding = 12;
    ctx.fillStyle = '#1c1726';
    ctx.beginPath();
    ctx.roundRect(
      platePadding,
      platePadding,
      size - platePadding * 2,
      size - platePadding * 2,
      18
    );
    ctx.fill();

    // Board inner grid glow border
    ctx.strokeStyle = '#322744';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Draw Boxes (Background + Owner badge)
    for (const box of state.boxes) {
      const pTopLeft = getDotPos(box.x, box.y);
      const boxSize = step;

      if (box.owner !== null) {
        const isP1 = box.owner === 0;
        const fillColor = isP1
          ? 'rgba(0, 212, 255, 0.16)'
          : 'rgba(255, 77, 109, 0.16)';
        const badgeColor = isP1 ? '#00E5FF' : '#FF5277';
        const badgeBg = isP1 ? '#0e3a53' : '#4d1627';

        // Box fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(pTopLeft.px + 2, pTopLeft.py + 2, boxSize - 4, boxSize - 4);

        // Box center avatar / monogram
        const cx = pTopLeft.px + boxSize / 2;
        const cy = pTopLeft.py + boxSize / 2;
        const badgeRadius = Math.min(boxSize * 0.28, 20);

        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = badgeColor;
        ctx.font = `bold ${Math.max(11, Math.floor(badgeRadius * 0.95))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isP1 ? 'P1' : 'P2', cx, cy + 1);
      }
    }

    // 3. Draw Unconnected Guide Lines (faint dashed lines)
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1.5;

    for (const line of Object.values(state.lines)) {
      if (line.owner === null && line.id !== hoveredLineId) {
        const p1 = getDotPos(line.d1.x, line.d1.y);
        const p2 = getDotPos(line.d2.x, line.d2.y);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]); // Reset dash

    // 4. Draw Hovered Line Preview
    if (hoveredLineId && canInteract && !state.isGameOver) {
      const line = state.lines[hoveredLineId];
      if (line && line.owner === null) {
        const p1 = getDotPos(line.d1.x, line.d1.y);
        const p2 = getDotPos(line.d2.x, line.d2.y);
        const isP1 = state.currentPlayer === 0;

        ctx.strokeStyle = isP1 ? 'rgba(0, 229, 255, 0.65)' : 'rgba(255, 82, 119, 0.65)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    // 5. Draw Connected Lines (Thick neon solid)
    ctx.lineCap = 'round';
    for (const line of Object.values(state.lines)) {
      if (line.owner !== null) {
        const p1 = getDotPos(line.d1.x, line.d1.y);
        const p2 = getDotPos(line.d2.x, line.d2.y);
        const isP1 = line.owner === 0;
        const color = isP1 ? '#00D4FF' : '#FF4D6D';
        const isLatest = line.id === state.lastLineId;

        // Glow layer if latest
        if (isLatest) {
          ctx.strokeStyle = isP1 ? 'rgba(0, 212, 255, 0.45)' : 'rgba(255, 77, 109, 0.45)';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isLatest ? 5.5 : 4.5;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    // 6. Draw Dots
    for (let y = 0; y < dotCount; y++) {
      for (let x = 0; x < dotCount; x++) {
        const { px, py } = getDotPos(x, y);

        // Dot Outer halo
        ctx.fillStyle = 'rgba(255, 225, 168, 0.22)';
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Dot Solid core
        ctx.fillStyle = '#FFE1A8';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [
    canInteract,
    dotCount,
    getDotPos,
    hoveredLineId,
    size,
    state.currentPlayer,
    state.isGameOver,
    state.lastLineId,
    state.lines,
    state.boxes,
    step,
  ]);

  // Pointer event handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canInteract || state.isGameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const closest = findClosestOpenLine(cx, cy);
    if (closest !== hoveredLineId) {
      setHoveredLineId(closest);
    }
  };

  const handlePointerLeave = () => {
    if (hoveredLineId) setHoveredLineId(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canInteract || state.isGameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const closest = findClosestOpenLine(cx, cy);
    if (closest) {
      onLineClick(closest);
      setHoveredLineId(null);
    }
  };

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          cursor: canInteract && !state.isGameOver ? 'pointer' : 'default',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#15111d',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#3c2e4f',
  },
});
