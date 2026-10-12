export type ZodiacPoint = readonly [x: number, y: number];
export type ZodiacEdge = readonly [from: number, to: number];

export interface ZodiacConstellationPreset {
  sign: string;
  points: readonly ZodiacPoint[];
  edges: readonly ZodiacEdge[];
}

function chain(pointCount: number): ZodiacEdge[] {
  return Array.from({ length: Math.max(0, pointCount - 1) }, (_, index) => [index, index + 1] as const);
}

function preset(sign: string, points: ZodiacPoint[], extraEdges: ZodiacEdge[] = []): ZodiacConstellationPreset {
  return { sign, points, edges: [...chain(points.length), ...extraEdges] };
}

export const ZODIAC_CONSTELLATIONS: Record<string, ZodiacConstellationPreset> = {
  Aries: preset('Aries', [[0.1, 0.7], [0.28, 0.5], [0.43, 0.2], [0.58, 0.42], [0.84, 0.26]]),
  Taurus: preset('Taurus', [[0.1, 0.2], [0.34, 0.38], [0.5, 0.7], [0.66, 0.38], [0.9, 0.18]], [[1, 3]]),
  Gemini: preset('Gemini', [[0.2, 0.12], [0.24, 0.38], [0.28, 0.82], [0.72, 0.82], [0.76, 0.38], [0.8, 0.12]], [[0, 5], [1, 4], [2, 3]]),
  Cancer: preset('Cancer', [[0.12, 0.16], [0.32, 0.38], [0.5, 0.6], [0.7, 0.78], [0.9, 0.58]], [[1, 3]]),
  Leo: preset('Leo', [[0.08, 0.65], [0.28, 0.5], [0.48, 0.58], [0.68, 0.42], [0.82, 0.15], [0.94, 0.34]], [[2, 4]]),
  Virgo: preset('Virgo', [[0.08, 0.25], [0.25, 0.5], [0.44, 0.3], [0.58, 0.58], [0.78, 0.42], [0.92, 0.76]], [[1, 3], [3, 5]]),
  Libra: preset('Libra', [[0.08, 0.7], [0.3, 0.45], [0.5, 0.2], [0.7, 0.45], [0.92, 0.7]], [[0, 4], [1, 3]]),
  Scorpio: preset('Scorpio', [[0.08, 0.2], [0.2, 0.55], [0.42, 0.42], [0.58, 0.72], [0.78, 0.5], [0.94, 0.78]], [[1, 3], [3, 5]]),
  Sagittarius: preset('Sagittarius', [[0.08, 0.78], [0.34, 0.52], [0.58, 0.28], [0.88, 0.12]], [[1, 3], [2, 0]]),
  Capricorn: preset('Capricorn', [[0.08, 0.34], [0.3, 0.18], [0.5, 0.48], [0.72, 0.28], [0.9, 0.62], [0.66, 0.82]], [[2, 5]]),
  Aquarius: preset('Aquarius', [[0.08, 0.35], [0.26, 0.18], [0.43, 0.42], [0.62, 0.24], [0.92, 0.48]], [[0, 2], [2, 4]]),
  Pisces: preset('Pisces', [[0.08, 0.2], [0.28, 0.42], [0.5, 0.5], [0.72, 0.58], [0.92, 0.8]], [[0, 4], [1, 3]]),
};

export function getZodiacConstellation(sign: string): ZodiacConstellationPreset {
  return ZODIAC_CONSTELLATIONS[sign] ?? ZODIAC_CONSTELLATIONS.Pisces;
}
