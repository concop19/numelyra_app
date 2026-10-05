import { svgPathProperties } from 'svg-path-properties';

import {
  MAX_CONSTELLATION_STARS,
  parseConstellationSvg,
  removeClosedEndpoint,
  simplifyConstellationPoints,
} from './constellationGeometry';
import type { ConstellationGeometry, ConstellationSamplingOptions } from './types';

const DEFAULT_SAMPLES_PER_PATH = 50;
const DEFAULT_STRAIGHT_TOLERANCE = 20;
const DEFAULT_FILTER_PASSES = 5;

type MeasuredParts = ReturnType<InstanceType<typeof svgPathProperties>['getParts']>;

function samePoint(
  first: { x: number; y: number },
  second: { x: number; y: number }
): boolean {
  return Math.abs(first.x - second.x) < 0.0001 && Math.abs(first.y - second.y) < 0.0001;
}

function splitMeasuredContours(parts: MeasuredParts) {
  const result: Array<{ parts: MeasuredParts; closed: boolean }> = [];

  for (const part of parts) {
    const current = result[result.length - 1];
    if (
      !current
      || current.closed
      || !samePoint(current.parts[current.parts.length - 1].end, part.start)
    ) {
      result.push({ parts: [part], closed: part.details[0] === 'Z' });
    } else {
      current.parts.push(part);
      current.closed ||= part.details[0] === 'Z';
    }
  }

  return result;
}

function pointAtContourLength(parts: MeasuredParts, targetLength: number) {
  let traversed = 0;
  for (const part of parts) {
    if (targetLength <= traversed + part.length) {
      return part.getPointAtLength(Math.max(0, targetLength - traversed));
    }
    traversed += part.length;
  }
  return parts[parts.length - 1].end;
}

export function buildConstellationGeometry(
  svgXml: string,
  options: ConstellationSamplingOptions = {}
): ConstellationGeometry {
  const parsed = parseConstellationSvg(svgXml);
  const samplesPerPath = Math.max(2, Math.min(300, options.samplesPerPath ?? DEFAULT_SAMPLES_PER_PATH));
  const tolerance = Math.max(0, Math.min(89, options.straightToleranceDeg ?? DEFAULT_STRAIGHT_TOLERANCE));
  const passes = Math.max(0, Math.min(10, options.filterPasses ?? DEFAULT_FILTER_PASSES));

  const contours: ConstellationGeometry['contours'] = [];

  for (const pathData of parsed.paths) {
    let properties: InstanceType<typeof svgPathProperties>;
    try {
      properties = new svgPathProperties(pathData);
    } catch {
      throw new Error('Có path SVG không thể được phân tích.');
    }

    for (const measuredContour of splitMeasuredContours(properties.getParts())) {
      const length = measuredContour.parts.reduce((total, part) => total + part.length, 0);
      if (length > 0 && Number.isFinite(length)) {
        const sampled = Array.from({ length: samplesPerPath + 1 }, (_, index) => {
          const point = pointAtContourLength(
            measuredContour.parts,
            (index / samplesPerPath) * length
          );
          return { x: point.x, y: point.y };
        });

        const simplified = removeClosedEndpoint(
          simplifyConstellationPoints(sampled, tolerance, passes)
        );
        if (simplified.length >= 2) {
          contours.push({ points: simplified, closed: measuredContour.closed });
        }
      }
    }
  }

  const totalStars = contours.reduce((total, contour) => total + contour.points.length, 0);
  if (totalStars === 0) throw new Error('SVG không tạo ra đủ điểm chòm sao.');
  if (totalStars > MAX_CONSTELLATION_STARS) {
    throw new Error(`Chòm sao vượt quá giới hạn ${MAX_CONSTELLATION_STARS} điểm.`);
  }

  return { viewBox: parsed.viewBox, contours };
}
