import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AmbientStar, ConstellationGeometry, ConstellationPoint } from './types';

interface Props {
  width: number;
  height: number;
  geometry: ConstellationGeometry;
  ambientStars: AmbientStar[];
}

interface Segment {
  key: string;
  from: ConstellationPoint;
  to: ConstellationPoint;
}

function lineStyle(from: ConstellationPoint, to: ConstellationPoint, thickness: number) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  return {
    left: (from.x + to.x - length) / 2,
    top: (from.y + to.y - thickness) / 2,
    width: length,
    height: thickness,
    transform: [{ rotate: `${angle}rad` }],
  };
}

export const ConstellationCanvas = memo(function ConstellationCanvas({
  width,
  height,
  geometry,
  ambientStars,
}: Props) {
  const segments = useMemo(() => {
    const result: Segment[] = [];
    geometry.contours.forEach((contour, contourIndex) => {
      for (let pointIndex = 1; pointIndex < contour.points.length; pointIndex += 1) {
        result.push({
          key: `${contourIndex}-${pointIndex}`,
          from: contour.points[pointIndex - 1],
          to: contour.points[pointIndex],
        });
      }
      if (contour.closed && contour.points.length > 2) {
        result.push({
          key: `${contourIndex}-closed`,
          from: contour.points[contour.points.length - 1],
          to: contour.points[0],
        });
      }
    });
    return result;
  }, [geometry]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ambientStars.map((star, index) => {
        const diameter = star.radius * 2;
        return (
          <View
            key={`ambient-${index}`}
            style={[
              styles.ambientStar,
              {
                left: star.x * width - star.radius,
                top: star.y * height - star.radius,
                width: diameter,
                height: diameter,
                borderRadius: star.radius,
                opacity: star.opacity,
              },
            ]}
          />
        );
      })}

      {segments.map((segment) => (
        <View key={segment.key} pointerEvents="none">
          <View style={[styles.lineGlow, lineStyle(segment.from, segment.to, 4)]} />
          <View style={[styles.lineCore, lineStyle(segment.from, segment.to, 1.25)]} />
        </View>
      ))}

      {geometry.contours.flatMap((contour, contourIndex) =>
        contour.points.map((point, pointIndex) => (
          <View
            key={`star-${contourIndex}-${pointIndex}`}
            style={[styles.starRoot, { left: point.x - 15, top: point.y - 18 }]}
          >
            <View style={styles.starHalo} />
            <View style={styles.starMiddle} />
            <View style={styles.starCore} />
            <View style={styles.starRayHorizontal} />
            <View style={styles.starRayVertical} />
          </View>
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  ambientStar: {
    position: 'absolute',
    backgroundColor: '#D7F5FF',
    shadowColor: '#45CFFF',
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  lineGlow: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: 'rgba(37, 191, 255, 0.28)',
    shadowColor: '#25BFFF',
    shadowOpacity: 0.85,
    shadowRadius: 6,
  },
  lineCore: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: 'rgba(227, 250, 255, 0.96)',
  },
  starRoot: {
    position: 'absolute',
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(19, 191, 255, 0.22)',
    shadowColor: '#17C5FF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  starMiddle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#58DDFF',
    shadowColor: '#A8F1FF',
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  starCore: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    zIndex: 3,
  },
  starRayHorizontal: {
    position: 'absolute',
    width: 24,
    height: 1,
    backgroundColor: 'rgba(231, 251, 255, 0.9)',
  },
  starRayVertical: {
    position: 'absolute',
    width: 1,
    height: 30,
    backgroundColor: 'rgba(231, 251, 255, 0.9)',
  },
});
