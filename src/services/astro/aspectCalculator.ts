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

  let rawTension = 0;
  let rawHarmony = 0;
  let rawConjunction = 0;
  let rawFastActivity = 0;

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

          // Cộng dồn vào các chỉ số năng lượng
          if (def.nature === 'tension') {
            rawTension += effectiveWeight;
          } else if (def.nature === 'harmony') {
            rawHarmony += effectiveWeight;
          } else if (def.type === 'conjunction') {
            rawConjunction += effectiveWeight;
          }

          if (FAST_PLANETS.has(tPlanet.name) || FAST_PLANETS.has(nPlanet.name)) {
            rawFastActivity += effectiveWeight;
          }
        }
      }
    }
  }

  // Sắp xếp các góc chiếu theo độ chặt của orb (orb nhỏ nhất xếp trước)
  detected.sort((a, b) => a.orb - b.orb);
  const topAspect = detected.length > 0 ? detected[0] : null;

  // Chuẩn hóa điểm về khoảng [0.0, 1.0] bằng hàm sigmoid làm mềm (soft-clamping)
  // Điểm raw trung bình của 1 lá số dao động từ 0 đến 5
  const normalizeScore = (val: number, divisor: number = 4): number => {
    const clamped = Math.min(1.0, val / divisor);
    return Number(clamped.toFixed(4));
  };

  return {
    aspects: detected,
    topAspect,
    tensionScore: normalizeScore(rawTension, 4.0),
    harmonyScore: normalizeScore(rawHarmony, 4.0),
    conjunctionIntensity: normalizeScore(rawConjunction, 3.0),
    fastPlanetActivity: normalizeScore(rawFastActivity, 5.0),
  };
}
