import React, { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { getZodiacConstellation } from './zodiacConstellations';

interface Point {
  x: number;
  y: number;
}

function Segment({ from, to }: { from: Point; to: Point }) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.line,
        {
          left: (from.x + to.x - length) / 2,
          top: (from.y + to.y - 1.5) / 2,
          width: length,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
    />
  );
}

export function ZodiacConstellation({ sign }: { sign: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const preset = getZodiacConstellation(sign);
  const points = useMemo(
    () => preset.points.map(([x, y]) => ({
      x: 14 + x * Math.max(0, size.width - 28),
      y: 14 + y * Math.max(0, size.height - 28),
    })),
    [preset.points, size]
  );
  const onLayout = (event: LayoutChangeEvent) => {
    const next = {
      width: Math.round(event.nativeEvent.layout.width),
      height: Math.round(event.nativeEvent.layout.height),
    };
    setSize((current) => current.width === next.width && current.height === next.height ? current : next);
  };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Minh họa chòm sao ${sign}`}
      onLayout={onLayout}
      style={styles.root}
    >
      {preset.edges.map(([fromIndex, toIndex], index) => {
        const from = points[fromIndex];
        const to = points[toIndex];
        return from && to ? <Segment key={`${fromIndex}-${toIndex}-${index}`} from={from} to={to} /> : null;
      })}
      {points.map((point, index) => (
        <View key={index} style={[styles.starGlow, { left: point.x - 8, top: point.y - 8 }]}>
          <View style={styles.starCore} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: 180, position: 'relative' },
  line: {
    position: 'absolute',
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#C9E8FF',
    shadowColor: '#72C7FF',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  starGlow: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113,194,255,0.18)',
    shadowColor: '#8FE8FF',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  starCore: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
