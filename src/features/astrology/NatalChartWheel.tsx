import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { useLocalization } from '../../i18n/LocalizationContext';

import type { NatalAspect } from '../../services/astro/aspectCalculator';
import type { AstroPlanetSnapshot, PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { ASTRO_COLORS } from './AstrologyUi';
import { PLANET_SVG } from './astrologyArtwork';
import {
  PLANET_INFO,
  ZODIAC_IDS,
  ZODIAC_INFO,
  isPlanetId,
  isZodiacId,
  type AstrologyDetailTarget,
} from './astrologyPresentation';

interface Point {
  x: number;
  y: number;
}

export interface PlanetMarkerLayout extends Point {
  planet: AstroPlanetSnapshot;
  lane: number;
}

function polarPoint(center: number, radius: number, longitude: number): Point {
  const radians = (longitude - 90) * Math.PI / 180;
  return {
    x: center + Math.cos(radians) * radius,
    y: center + Math.sin(radians) * radius,
  };
}

function circularDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 360;
  return difference > 180 ? 360 - difference : difference;
}

export function buildPlanetMarkerLayout(
  planets: AstroPlanetSnapshot[],
  size: number
): PlanetMarkerLayout[] {
  const center = size / 2;
  const sorted = [...planets].sort((left, right) => left.longitude - right.longitude);
  return sorted.map((planet, index) => {
    let lane = 0;
    for (let previous = index - 1; previous >= 0; previous -= 1) {
      if (circularDifference(planet.longitude, sorted[previous].longitude) >= 8) break;
      lane += 1;
    }
    const radius = size * 0.31 - (lane % 3) * 27;
    return { ...polarPoint(center, radius, planet.longitude), planet, lane: lane % 3 };
  });
}

function Segment({
  from,
  to,
  color,
  thickness = 1,
  opacity = 1,
}: {
  from: Point;
  to: Point;
  color: string;
  thickness?: number;
  opacity?: number;
}) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (from.x + to.x - length) / 2,
        top: (from.y + to.y - thickness) / 2,
        width: length,
        height: thickness,
        borderRadius: thickness / 2,
        backgroundColor: color,
        opacity,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

function aspectColor(aspect: NatalAspect): string {
  if (aspect.nature === 'harmony') return '#52E2D0';
  if (aspect.nature === 'tension') return '#FF7B9C';
  return '#FFD166';
}

export function NatalChartWheel({
  metadata,
  onOpenDetail,
}: {
  metadata: PureAstroFeatureMetadata;
  onOpenDetail(target: AstrologyDetailTarget): void;
}) {
  const { locale, l } = useLocalization();
  const [availableWidth, setAvailableWidth] = useState(0);
  const size = Math.min(460, Math.max(294, availableWidth || 360));
  const center = size / 2;
  const markers = useMemo(
    () => buildPlanetMarkerLayout(metadata.natalPlanets, size),
    [metadata.natalPlanets, size]
  );
  const markerByPlanet = useMemo(
    () => new Map(markers.map((marker) => [marker.planet.name, marker])),
    [markers]
  );
  const onLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setAvailableWidth((current) => current === width ? current : width);
  };
  const chartLabel = metadata.natalPlanets
    .map((planet) => locale === 'en'
      ? `${isPlanetId(planet.name) ? PLANET_INFO[planet.name].id : planet.name} in ${isZodiacId(planet.sign) ? ZODIAC_INFO[planet.sign].id : planet.sign} at ${planet.degreeInSign.toFixed(1)} degrees`
      : `${isPlanetId(planet.name) ? PLANET_INFO[planet.name].nameVi : planet.name} ở ${isZodiacId(planet.sign) ? ZODIAC_INFO[planet.sign].nameVi : planet.sign} ${planet.degreeInSign.toFixed(1)} độ`)
    .join(', ');

  return (
    <View onLayout={onLayout} style={styles.measure}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={l(`Biểu đồ lá số. ${chartLabel}`, `Natal chart. ${chartLabel}`)}
        style={[styles.chart, { width: size, height: size }]}
      >
        <View style={[styles.chartGlow, { width: size * 0.82, height: size * 0.82, borderRadius: size * 0.41, left: size * 0.09, top: size * 0.09 }]} />
        <View style={[styles.ring, styles.outerRing, { width: size * 0.96, height: size * 0.96, borderRadius: size * 0.48, left: size * 0.02, top: size * 0.02 }]} />
        <View style={[styles.ring, { width: size * 0.74, height: size * 0.74, borderRadius: size * 0.37, left: size * 0.13, top: size * 0.13 }]} />
        <View style={[styles.ring, { width: size * 0.51, height: size * 0.51, borderRadius: size * 0.255, left: size * 0.245, top: size * 0.245 }]} />

        {Array.from({ length: 12 }, (_, index) => {
          const longitude = index * 30 - 15;
          return (
            <Segment
              key={`sign-divider-${index}`}
              from={polarPoint(center, size * 0.37, longitude)}
              to={polarPoint(center, size * 0.48, longitude)}
              color="rgba(231,211,255,0.45)"
              thickness={1}
            />
          );
        })}

        {ZODIAC_IDS.map((signId, index) => {
          const sign = ZODIAC_INFO[signId];
          const point = polarPoint(center, size * 0.425, index * 30);
          return (
            <TouchableOpacity
              accessibilityLabel={l(`Mở chi tiết ${sign.nameVi}`, `Open ${sign.id} details`)}
              accessibilityRole="button"
              hitSlop={5}
              key={sign.id}
              onPress={() => onOpenDetail({ kind: 'sign', id: signId })}
              style={[styles.signLabel, { left: point.x - 14, top: point.y - 14 }]}
            >
              <Text style={styles.signLabelText}>{sign.symbol}</Text>
            </TouchableOpacity>
          );
        })}

        {metadata.natalContext?.houseCusps.map((cusp) => (
          <Segment
            key={`house-${cusp.house}`}
            from={polarPoint(center, size * 0.15, cusp.longitude)}
            to={polarPoint(center, size * 0.365, cusp.longitude)}
            color="rgba(255,214,124,0.42)"
            thickness={cusp.house === 1 || cusp.house === 10 ? 1.8 : 0.8}
          />
        ))}

        {metadata.natalContext?.houseCusps.map((cusp, index, cusps) => {
          const next = cusps[(index + 1) % cusps.length];
          const span = (next.longitude - cusp.longitude + 360) % 360;
          const point = polarPoint(center, size * 0.19, cusp.longitude + span / 2);
          return (
            <Text key={`house-label-${cusp.house}`} style={[styles.houseLabel, { left: point.x - 10, top: point.y - 8 }]}>
              {cusp.house}
            </Text>
          );
        })}

        {metadata.natalAspects.slice(0, 20).map((aspect) => {
          const from = markerByPlanet.get(aspect.planetA);
          const to = markerByPlanet.get(aspect.planetB);
          if (!from || !to) return null;
          return (
            <Segment
              key={`${aspect.planetA}-${aspect.planetB}-${aspect.type}`}
              from={from}
              to={to}
              color={aspectColor(aspect)}
              thickness={aspect.weight >= 0.6 ? 1.4 : 0.8}
              opacity={0.36 + aspect.weight * 0.48}
            />
          );
        })}

        {markers.map((marker) => {
          if (!isPlanetId(marker.planet.name)) return null;
          const planetId = marker.planet.name;
          return (
            <TouchableOpacity
              accessibilityLabel={l(`Mở chi tiết ${PLANET_INFO[planetId].nameVi}`, `Open ${PLANET_INFO[planetId].id} details`)}
              accessibilityRole="button"
              hitSlop={5}
              key={planetId}
              onPress={() => onOpenDetail({ kind: 'planet', id: planetId })}
              style={[styles.planetMarker, { left: marker.x - 17, top: marker.y - 17 }]}
            >
              <Image contentFit="contain" source={PLANET_SVG[planetId]} style={styles.planetIcon} />
            </TouchableOpacity>
          );
        })}

        <View style={[styles.centerGlow, { left: center - 20, top: center - 20 }]}>
          <Text style={styles.centerSymbol}>✦</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  measure: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  chart: { position: 'relative', alignSelf: 'center' },
  chartGlow: { position: 'absolute', backgroundColor: 'rgba(52,46,135,0.2)', shadowColor: '#675BFF', shadowOpacity: 0.65, shadowRadius: 28 },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(170,157,255,0.36)', backgroundColor: 'rgba(12,13,58,0.08)' },
  outerRing: { borderWidth: 1.8, borderColor: 'rgba(255,222,143,0.92)', backgroundColor: 'rgba(17,12,70,0.3)', shadowColor: '#E4C477', shadowOpacity: 0.34, shadowRadius: 8 },
  signLabel: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  signLabelText: { color: '#E8C8FF', fontSize: 22, lineHeight: 28, textShadowColor: '#7B54FF', textShadowRadius: 8 },
  houseLabel: { position: 'absolute', width: 20, textAlign: 'center', color: '#E8D5A0', fontSize: 9, fontWeight: '800' },
  planetMarker: { position: 'absolute', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(33,35,112,0.96)', borderWidth: 1, borderColor: '#8CDFFF', shadowColor: '#56CBFF', shadowOpacity: 0.72, shadowRadius: 8, elevation: 4 },
  planetIcon: { width: 27, height: 27 },
  centerGlow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(132,94,255,0.32)', borderWidth: 1, borderColor: ASTRO_COLORS.gold },
  centerSymbol: { color: '#FFF4B8', fontSize: 24, textShadowColor: '#FFD166', textShadowRadius: 8 },
});
