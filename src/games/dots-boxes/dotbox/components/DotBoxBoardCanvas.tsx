import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, GestureResponderEvent } from 'react-native';
import { DotBoxGameState } from '../types';

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
  size = 380,
}: DotBoxBoardCanvasProps) {
  const boardSize = state.boardSize;
  const dotCount = state.dotCount;
  const padding = 28;
  const usableSize = size - padding * 2;
  const step = usableSize / boardSize;

  const getDotPos = (x: number, y: number) => ({
    px: padding + x * step,
    py: padding + y * step,
  });

  const distToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
    if (l2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
  };

  const handleTouch = (e: GestureResponderEvent) => {
    if (!canInteract || state.isGameOver) return;
    const { locationX, locationY } = e.nativeEvent;

    let closestId: string | null = null;
    let minDistance = step * 0.44;

    for (const line of Object.values(state.lines)) {
      if (line.owner !== null) continue;
      const p1 = getDotPos(line.d1.x, line.d1.y);
      const p2 = getDotPos(line.d2.x, line.d2.y);
      const d = distToSegment(locationX, locationY, p1.px, p1.py, p2.px, p2.py);
      if (d < minDistance) {
        minDistance = d;
        closestId = line.id;
      }
    }

    if (closestId) {
      onLineClick(closestId);
    }
  };

  return (
    <Pressable
      onPress={handleTouch}
      style={[styles.container, { width: size, height: size }]}
    >
      {/* 1. Boxes */}
      {state.boxes.map((box) => {
        if (box.owner === null) return null;
        const pTopLeft = getDotPos(box.x, box.y);
        const isP1 = box.owner === 0;
        return (
          <View
            key={`box-${box.index}`}
            style={[
              styles.boxFill,
              {
                left: pTopLeft.px + 2,
                top: pTopLeft.py + 2,
                width: step - 4,
                height: step - 4,
                backgroundColor: isP1
                  ? 'rgba(0, 212, 255, 0.16)'
                  : 'rgba(255, 77, 109, 0.16)',
              },
            ]}
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isP1 ? '#0e3a53' : '#4d1627',
                  borderColor: isP1 ? '#00E5FF' : '#FF5277',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isP1 ? '#00E5FF' : '#FF5277' },
                ]}
              >
                {isP1 ? 'P1' : 'P2'}
              </Text>
            </View>
          </View>
        );
      })}

      {/* 2. Connected Lines */}
      {Object.values(state.lines).map((line) => {
        if (line.owner === null) return null;
        const p1 = getDotPos(line.d1.x, line.d1.y);
        const p2 = getDotPos(line.d2.x, line.d2.y);
        const isH = line.orientation === 'H';
        const isP1 = line.owner === 0;
        const isLatest = line.id === state.lastLineId;

        return (
          <View
            key={line.id}
            style={[
              styles.line,
              isH
                ? {
                    left: p1.px,
                    top: p1.py - 2.5,
                    width: step,
                    height: isLatest ? 5.5 : 4.5,
                  }
                : {
                    left: p1.px - 2.5,
                    top: p1.py,
                    width: isLatest ? 5.5 : 4.5,
                    height: step,
                  },
              {
                backgroundColor: isP1 ? '#00D4FF' : '#FF4D6D',
              },
            ]}
          />
        );
      })}

      {/* 3. Grid Dots */}
      {Array.from({ length: dotCount }).map((_, y) =>
        Array.from({ length: dotCount }).map((_, x) => {
          const { px, py } = getDotPos(x, y);
          return (
            <View
              key={`dot-${x}-${y}`}
              style={[
                styles.dotHalo,
                { left: px - 6, top: py - 6 },
              ]}
            >
              <View style={styles.dotCore} />
            </View>
          );
        })
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1c1726',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#322744',
    position: 'relative',
    overflow: 'hidden',
  },
  boxFill: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  line: {
    position: 'absolute',
    borderRadius: 3,
  },
  dotHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 225, 168, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFE1A8',
  },
});
