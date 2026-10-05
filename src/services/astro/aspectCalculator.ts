/**
 * aspectCalculator.ts
 * Module tính toán góc chiếu (Aspects) giữa Transit Chart và Natal Chart.
 * Định lượng các chỉ số: Tension (Căng thẳng), Harmony (Hài hòa), Conjunction (Hợp nhất).
 */
import { PlanetaryChart, PlanetPosition } from './astroEngine';

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface AspectDefinition {
  type: AspectType;
  symbol: string;
  nameVi: string;
  targetAngle: number;
  maxOrb: number;
  nature: 'tension' | 'harmony' | 'neutral';
  baseWeight: number;
}

export const MAJOR_ASPECTS: AspectDefinition[] = [
  { type: 'conjunction', symbol: '☌', nameVi: 'Trùng tụ', targetAngle: 0, maxOrb: 8.0, nature: 'neutral', baseWeight: 1.0 },
  { type: 'sextile', symbol: '⚹', nameVi: 'Lục hợp', targetAngle: 60, maxOrb: 5.0, nature: 'harmony', baseWeight: 0.7 },
  { type: 'square', symbol: '□', nameVi: 'Vuông góc', targetAngle: 90, maxOrb: 7.0, nature: 'tension', baseWeight: 1.0 },
  { type: 'trine', symbol: '△', nameVi: 'Tam hợp', targetAngle: 120, maxOrb: 7.0, nature: 'harmony', baseWeight: 0.9 },
  { type: 'opposition', symbol: '☍', nameVi: 'Đối đỉnh', targetAngle: 180, maxOrb: 8.0, nature: 'tension', baseWeight: 1.0 },
];

export interface DetectedAspect {
  transitPlanet: string;
  natalPlanet: string;
  type: AspectType;
  symbol: string;
  nameVi: string;
  targetAngle: number;
  actualAngle: number;
  orb: number;
  weight: number;
  nature: 'tension' | 'harmony' | 'neutral';
}

export interface AspectAnalysisResult {
  aspects: DetectedAspect[];
  topAspect: DetectedAspect | null;
  tensionScore: number;          // 0.0 - 1.0
  harmonyScore: number;          // 0.0 - 1.0
  conjunctionIntensity: number;  // 0.0 - 1.0
  fastPlanetActivity: number;    // 0.0 - 1.0
}

const FAST_PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']);

export const TRANSIT_ACTIVITY_WEIGHTS: Record<string, number> = {
  Moon: 1,
  Sun: 0.85,
  Mercury: 0.85,
  Venus: 0.85,
  Mars: 0.85,
  Jupiter: 0.45,
  Saturn: 0.45,
  Uranus: 0.25,
  Neptune: 0.25,
  Pluto: 0.25,
};

function roundScore(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

export function calculateAspectScores(aspects: DetectedAspect[]): Omit<
  AspectAnalysisResult,
  'aspects' | 'topAspect'
> {
  let weightedTension = 0;
  let weightedHarmony = 0;
  let weightedConjunction = 0;
  let weightedFastActivity = 0;
  let totalWeightedActivity = 0;

  for (const aspect of aspects) {
    const transitWeight = TRANSIT_ACTIVITY_WEIGHTS[aspect.transitPlanet] ?? 0.25;
    const dailyWeight = aspect.weight * transitWeight;
    totalWeightedActivity += dailyWeight;

    if (aspect.nature === 'tension') weightedTension += dailyWeight;
    else if (aspect.nature === 'harmony') weightedHarmony += dailyWeight;
    else if (aspect.type === 'conjunction') weightedConjunction += dailyWeight;

    if (FAST_PLANETS.has(aspect.transitPlanet)) {
      weightedFastActivity += dailyWeight;
    }
  }

  const directionalTotal = weightedTension + weightedHarmony;
  return {
    tensionScore: directionalTotal > 0 ? roundScore(weightedTension / directionalTotal) : 0,
    harmonyScore: directionalTotal > 0 ? roundScore(weightedHarmony / directionalTotal) : 0,
    conjunctionIntensity: totalWeightedActivity > 0
      ? roundScore(weightedConjunction / totalWeightedActivity)
      : 0,
    fastPlanetActivity: totalWeightedActivity > 0
      ? roundScore(weightedFastActivity / totalWeightedActivity)
      : 0,
  };
}

/**
 * Tính khoảng cách góc nhỏ nhất giữa 2 tọa độ hoàng đạo (0° - 180°)
 */
export function getShortestAngleDiff(deg1: number, deg2: number): number {
  let diff = Math.abs(deg1 - deg2) % 360;
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Phân tích toàn bộ các góc hợp giữa Bầu trời hiện tại (Transit) và Bản đồ sao gốc (Natal)
 */
export function analyzeTransitToNatalAspects(
  transitChart: PlanetaryChart,
  natalChart: PlanetaryChart
): AspectAnalysisResult {
  const detected: DetectedAspect[] = [];

  for (const tPlanet of transitChart.planetList) {
    for (const nPlanet of natalChart.planetList) {
      const angle = getShortestAngleDiff(tPlanet.longitude, nPlanet.longitude);

      for (const def of MAJOR_ASPECTS) {
        const orb = Math.abs(angle - def.targetAngle);

        if (orb <= def.maxOrb) {
          // Trọng số tỷ lệ nghịch với Orb: Orb càng nhỏ (càng sát góc chuẩn) thì trọng số càng cao
          const orbFactor = Math.max(0, 1 - orb / def.maxOrb);
          const effectiveWeight = Number((def.baseWeight * orbFactor).toFixed(4));

          const aspectItem: DetectedAspect = {
            transitPlanet: tPlanet.name,
            natalPlanet: nPlanet.name,
            type: def.type,
            symbol: def.symbol,
            nameVi: def.nameVi,
            targetAngle: def.targetAngle,
            actualAngle: Number(angle.toFixed(2)),
            orb: Number(orb.toFixed(2)),
            weight: effectiveWeight,
            nature: def.nature,
          };

          detected.push(aspectItem);

        }
      }
    }
  }

  // Ưu tiên góc vừa chặt vừa đến từ hành tinh transit chuyển động nhanh.
  detected.sort((a, b) => {
    const aDailyWeight = a.weight * (TRANSIT_ACTIVITY_WEIGHTS[a.transitPlanet] ?? 0.25);
    const bDailyWeight = b.weight * (TRANSIT_ACTIVITY_WEIGHTS[b.transitPlanet] ?? 0.25);
    return bDailyWeight - aDailyWeight || a.orb - b.orb;
  });
  const topAspect = detected.length > 0 ? detected[0] : null;
  const scores = calculateAspectScores(detected);

  return {
    aspects: detected,
    topAspect,
    ...scores,
  };
}
