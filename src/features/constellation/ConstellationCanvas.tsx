import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  clampConstellationPoint,
  createConstellationRenderGraph,
} from './constellationGeometry';
import type {
  AmbientStar,
  ConstellationBounds,
  ConstellationGeometry,
  ConstellationPoint,
  ConstellationRenderEdge,
} from './types';

const STAR_TOUCH_RADIUS = 22;
const STAR_EDGE_MARGIN = 24;
const MOTION_DURATION_MS = 6000;

interface Props {
  width: number;
  height: number;
  geometry: ConstellationGeometry;
  ambientStars: AmbientStar[];
  interactionBounds: ConstellationBounds;
  resetKey: string;
  motionEnabled: boolean;
}

interface SegmentProps {
  edge: ConstellationRenderEdge;
  edgeIndex: number;
  edgeCount: number;
  positions: SharedValue<ConstellationPoint[]>;
  activeNodeIndex: SharedValue<number>;
  motionProgress: SharedValue<number>;
  motionEnabled: boolean;
}

interface StarProps {
  nodeIndex: number;
  nodeCount: number;
  positions: SharedValue<ConstellationPoint[]>;
  activeNodeIndex: SharedValue<number>;
  motionProgress: SharedValue<number>;
  motionEnabled: boolean;
}

function animatedLineGeometry(from: ConstellationPoint, to: ConstellationPoint, thickness: number) {
  'worklet';
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);

  return {
    left: (from.x + to.x - length) / 2,
    top: (from.y + to.y - thickness) / 2,
    width: length,
    transform: [{ rotate: `${angle}rad` }],
  };
}

const ConstellationSegment = memo(function ConstellationSegment({
  edge,
  edgeIndex,
  edgeCount,
  positions,
  activeNodeIndex,
  motionProgress,
  motionEnabled,
}: SegmentProps) {
  const glowStyle = useAnimatedStyle(() => {
    const from = positions.value[edge.fromIndex];
    const to = positions.value[edge.toIndex];
    if (!from || !to) return { opacity: 0 };

    const phase = edgeCount > 0 ? edgeIndex / edgeCount : 0;
    const distance = Math.abs(motionProgress.value - phase);
    const wrappedDistance = Math.min(distance, 1 - distance);
    const shimmer = motionEnabled
      ? Math.max(0, 1 - wrappedDistance / 0.14)
      : 0;
    const connected = activeNodeIndex.value === edge.fromIndex
      || activeNodeIndex.value === edge.toIndex;

    return {
      ...animatedLineGeometry(from, to, 2),
      opacity: Math.min(0.52, 0.11 + shimmer * 0.22 + (connected ? 0.19 : 0)),
    };
  }, [edge.fromIndex, edge.toIndex, edgeCount, edgeIndex, motionEnabled]);

  const coreStyle = useAnimatedStyle(() => {
    const from = positions.value[edge.fromIndex];
    const to = positions.value[edge.toIndex];
    if (!from || !to) return { opacity: 0 };

    const phase = edgeCount > 0 ? edgeIndex / edgeCount : 0;
    const distance = Math.abs(motionProgress.value - phase);
    const wrappedDistance = Math.min(distance, 1 - distance);
    const shimmer = motionEnabled
      ? Math.max(0, 1 - wrappedDistance / 0.11)
      : 0;
    const connected = activeNodeIndex.value === edge.fromIndex
      || activeNodeIndex.value === edge.toIndex;

    return {
      ...animatedLineGeometry(from, to, 0.8),
      opacity: Math.min(0.92, 0.43 + shimmer * 0.27 + (connected ? 0.2 : 0)),
    };
  }, [edge.fromIndex, edge.toIndex, edgeCount, edgeIndex, motionEnabled]);

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.lineGlow, glowStyle]} />
      <Animated.View pointerEvents="none" style={[styles.lineCore, coreStyle]} />
    </>
  );
});

const ConstellationStar = memo(function ConstellationStar({
  nodeIndex,
  nodeCount,
  positions,
  activeNodeIndex,
  motionProgress,
  motionEnabled,
}: StarProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const point = positions.value[nodeIndex];
    if (!point) return { opacity: 0 };

    const phase = nodeCount > 0 ? nodeIndex / nodeCount : 0;
    const wave = motionEnabled
      ? (Math.sin((motionProgress.value + phase) * Math.PI * 2) + 1) / 2
      : 0.5;
    const active = activeNodeIndex.value === nodeIndex;
    const scale = active ? 1.18 : 0.94 + wave * 0.08;

    return {
      opacity: active ? 1 : 0.72 + wave * 0.26,
      zIndex: active ? 3 : 2,
      transform: [
        { translateX: point.x - STAR_TOUCH_RADIUS },
        { translateY: point.y - STAR_TOUCH_RADIUS },
        { scale },
      ],
    };
  }, [motionEnabled, nodeCount, nodeIndex]);

  return (
    <Animated.View pointerEvents="none" style={[styles.starTouchTarget, animatedStyle]}>
      <View style={styles.starHalo} />
      <View style={styles.starMiddle} />
      <View style={styles.starCore} />
    </Animated.View>
  );
});

export const ConstellationCanvas = memo(function ConstellationCanvas({
  width,
  height,
  geometry,
  ambientStars,
  interactionBounds,
  resetKey,
  motionEnabled,
}: Props) {
  const graph = useMemo(() => createConstellationRenderGraph(geometry), [geometry]);
  const initialPositions = useMemo(
    () => graph.nodes.map(({ x, y }) => ({ x, y })),
    [graph]
  );
  const positions = useSharedValue<ConstellationPoint[]>(initialPositions);
  const activeNodeIndex = useSharedValue(-1);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const motionProgress = useSharedValue(0);

  const minX = interactionBounds.x + STAR_EDGE_MARGIN;
  const maxX = interactionBounds.x + interactionBounds.width - STAR_EDGE_MARGIN;
  const minY = interactionBounds.y + STAR_EDGE_MARGIN;
  const maxY = interactionBounds.y + interactionBounds.height - STAR_EDGE_MARGIN;

  useEffect(() => {
    positions.value = initialPositions.map((point) =>
      clampConstellationPoint(point, interactionBounds, STAR_EDGE_MARGIN)
    );
    activeNodeIndex.value = -1;
  }, [activeNodeIndex, initialPositions, positions, resetKey]);

  useEffect(() => {
    positions.value = positions.value.map((point) =>
      clampConstellationPoint(point, interactionBounds, STAR_EDGE_MARGIN)
    );
  }, [
    interactionBounds.height,
    interactionBounds.width,
    interactionBounds.x,
    interactionBounds.y,
    positions,
  ]);

  useEffect(() => {
    cancelAnimation(motionProgress);
    motionProgress.value = 0;

    if (motionEnabled) {
      motionProgress.value = withRepeat(
        withTiming(1, {
          duration: MOTION_DURATION_MS,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }

    return () => cancelAnimation(motionProgress);
  }, [motionEnabled, motionProgress]);

  const panGesture = useMemo(
    () => Gesture.Pan()
      .maxPointers(1)
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .activeCursor('grabbing')
      .onBegin((event) => {
        const current = positions.value;
        let nearestIndex = -1;
        let nearestDistanceSquared = STAR_TOUCH_RADIUS * STAR_TOUCH_RADIUS;

        for (let index = 0; index < current.length; index += 1) {
          const deltaX = current[index].x - event.x;
          const deltaY = current[index].y - event.y;
          const distanceSquared = deltaX * deltaX + deltaY * deltaY;
          if (distanceSquared <= nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared;
            nearestIndex = index;
          }
        }

        activeNodeIndex.value = nearestIndex;
        if (nearestIndex >= 0) {
          dragStartX.value = current[nearestIndex].x;
          dragStartY.value = current[nearestIndex].y;
        }
      })
      .onUpdate((event) => {
        const index = activeNodeIndex.value;
        if (index < 0) return;

        const left = Math.min(minX, maxX);
        const right = Math.max(minX, maxX);
        const top = Math.min(minY, maxY);
        const bottom = Math.max(minY, maxY);
        const nextX = Math.min(right, Math.max(left, dragStartX.value + event.translationX));
        const nextY = Math.min(bottom, Math.max(top, dragStartY.value + event.translationY));

        const nextPositions = positions.value.slice();
        nextPositions[index] = { x: nextX, y: nextY };
        positions.value = nextPositions;
      })
      .onFinalize(() => {
        activeNodeIndex.value = -1;
      }),
    [
      activeNodeIndex,
      dragStartX,
      dragStartY,
      maxX,
      maxY,
      minX,
      minY,
      positions,
    ]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
      </View>

      <GestureDetector gesture={panGesture}>
        <View
          accessible={false}
          collapsable={false}
          style={StyleSheet.absoluteFill}
        >
          {graph.edges.map((edge, edgeIndex) => (
            <ConstellationSegment
              key={edge.key}
              edge={edge}
              edgeIndex={edgeIndex}
              edgeCount={graph.edges.length}
              positions={positions}
              activeNodeIndex={activeNodeIndex}
              motionProgress={motionProgress}
              motionEnabled={motionEnabled}
            />
          ))}

          {graph.nodes.map((node, nodeIndex) => (
            <ConstellationStar
              key={node.key}
              nodeIndex={nodeIndex}
              nodeCount={graph.nodes.length}
              positions={positions}
              activeNodeIndex={activeNodeIndex}
              motionProgress={motionProgress}
              motionEnabled={motionEnabled}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  ambientStar: {
    position: 'absolute',
    backgroundColor: '#D7F5FF',
    shadowColor: '#45CFFF',
    shadowOpacity: 0.42,
    shadowRadius: 2,
  },
  lineGlow: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#37C7FF',
    shadowColor: '#25BFFF',
    shadowOpacity: 0.45,
    shadowRadius: 3,
  },
  lineCore: {
    position: 'absolute',
    height: 0.8,
    borderRadius: 0.4,
    backgroundColor: '#DDF8FF',
  },
  starTouchTarget: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: STAR_TOUCH_RADIUS * 2,
    height: STAR_TOUCH_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(50, 207, 255, 0.16)',
    shadowColor: '#30CCFF',
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  starMiddle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#72E4FF',
    shadowColor: '#B8F5FF',
    shadowOpacity: 0.9,
    shadowRadius: 3,
  },
  starCore: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    zIndex: 3,
  },
});
