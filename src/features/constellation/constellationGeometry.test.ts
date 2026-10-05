import {
  createAmbientStars,
  filterPointsOnAngle,
  fitConstellationGeometry,
  parseConstellationSvg,
  removeClosedEndpoint,
  simplifyConstellationPoints,
} from './constellationGeometry';
import { buildConstellationGeometry } from './constellationSkia';
import {
  ASTROLOGY_SYMBOL_LIST,
  getDailyAstrologySymbolId,
} from './constellationPresets';

describe('constellation SVG parser', () => {
  it('reads a non-zero viewBox and nested path elements', () => {
    const parsed = parseConstellationSvg(`
      <svg viewBox="10 20 300 200" xmlns="http://www.w3.org/2000/svg">
        <g><path d="M10 20 L310 220" /></g>
        <path fill="none" d='M20 30 C40 50 60 70 80 90'/>
      </svg>
    `);

    expect(parsed.viewBox).toEqual({ minX: 10, minY: 20, width: 300, height: 200 });
    expect(parsed.paths).toEqual([
      'M10 20 L310 220',
      'M20 30 C40 50 60 70 80 90',
    ]);
  });

  it.each([
    ['missing viewBox', '<svg><path d="M0 0 L1 1" /></svg>'],
    ['script', '<svg viewBox="0 0 10 10"><script>alert(1)</script><path d="M0 0 L1 1" /></svg>'],
    ['external image', '<svg viewBox="0 0 10 10"><image href="https://example.com/a.png"/><path d="M0 0 L1 1" /></svg>'],
    ['transform', '<svg viewBox="0 0 10 10"><g transform="scale(2)"><path d="M0 0 L1 1" /></g></svg>'],
  ])('rejects unsupported %s SVG content', (_, svg) => {
    expect(() => parseConstellationSvg(svg)).toThrow();
  });

  it('enforces the configured path limit', () => {
    const paths = Array.from({ length: 33 }, (_, index) => `<path d="M0 ${index} L10 ${index}"/>`).join('');
    expect(() => parseConstellationSvg(`<svg viewBox="0 0 10 40">${paths}</svg>`))
      .toThrow('tối đa 32 path');
  });
});

describe('constellation geometry', () => {
  it('collapses a straight sampled segment while keeping its endpoints', () => {
    const points = Array.from({ length: 9 }, (_, x) => ({ x, y: 0 }));
    expect(simplifyConstellationPoints(points, 20, 5)).toEqual([
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ]);
  });

  it('keeps a meaningful corner', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
    ];
    const filtered = simplifyConstellationPoints(points, 20, 5);
    expect(filtered).toContainEqual({ x: 10, y: 0 });
    expect(filtered[0]).toEqual({ x: 0, y: 0 });
    expect(filtered[filtered.length - 1]).toEqual({ x: 10, y: 10 });
  });

  it('does not mutate the source point list', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    const snapshot = points.map((point) => ({ ...point }));
    filterPointsOnAngle(points, 20);
    expect(points).toEqual(snapshot);
  });

  it('removes the repeated endpoint of a closed contour', () => {
    expect(removeClosedEndpoint([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
    ])).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it('fits a non-zero viewBox with contain scaling and centering', () => {
    const fitted = fitConstellationGeometry({
      viewBox: { minX: 10, minY: 20, width: 100, height: 50 },
      contours: [{
        closed: false,
        points: [{ x: 10, y: 20 }, { x: 110, y: 70 }],
      }],
    }, { x: 0, y: 0, width: 200, height: 200 });

    expect(fitted.contours[0].points).toEqual([
      { x: 0, y: 50 },
      { x: 200, y: 150 },
    ]);
  });

  it('creates deterministic ambient stars from a seed', () => {
    expect(createAmbientStars(42, 5)).toEqual(createAmbientStars(42, 5));
    expect(createAmbientStars(42, 5)).not.toEqual(createAmbientStars(43, 5));
  });

  it('samples real SVG line, curve, closed, and multiple paths without Skia JSI', () => {
    const geometry = buildConstellationGeometry(`
      <svg viewBox="0 0 120 120">
        <path d="M10 10 L110 10 L110 110 Z" />
        <path d="M10 60 C30 10 90 110 110 60" />
      </svg>
    `, { samplesPerPath: 12, straightToleranceDeg: 0, filterPasses: 0 });

    expect(geometry.contours).toHaveLength(2);
    expect(geometry.contours[0].closed).toBe(true);
    expect(geometry.contours[1].closed).toBe(false);
    expect(geometry.contours[0].points).toHaveLength(12);
    expect(geometry.contours[1].points).toHaveLength(13);
  });

  it('keeps multiple subpaths in one SVG path as separate contours', () => {
    const geometry = buildConstellationGeometry(`
      <svg viewBox="0 0 24 24">
        <path d="M2 2 L10 2 L10 10 Z M14 14 L22 14 L22 22 Z" />
      </svg>
    `, { samplesPerPath: 8, straightToleranceDeg: 0, filterPasses: 0 });

    expect(geometry.contours).toHaveLength(2);
    expect(geometry.contours.every((contour) => contour.closed)).toBe(true);
    expect(geometry.contours[0].points.every((point) => point.x <= 10)).toBe(true);
    expect(geometry.contours[1].points.every((point) => point.x >= 14)).toBe(true);
  });

  it('builds every bundled MDI shape within the star limit', () => {
    for (const preset of ASTROLOGY_SYMBOL_LIST) {
      const geometry = buildConstellationGeometry(preset.svgXml, preset.sampling);
      const starCount = geometry.contours.reduce(
        (total, contour) => total + contour.points.length,
        0
      );

      expect(starCount).toBeGreaterThan(1);
      expect(starCount).toBeLessThanOrEqual(300);
    }
  });

  it('selects one stable symbol per local day/profile and changes on the next day', () => {
    const firstDate = new Date(2026, 9, 5, 8, 0, 0);
    const sameDateLater = new Date(2026, 9, 5, 23, 59, 59);
    const nextDate = new Date(2026, 9, 6, 0, 0, 0);
    const profileKey = 'an nguyen|1998-10-20';

    expect(getDailyAstrologySymbolId(firstDate, profileKey))
      .toBe(getDailyAstrologySymbolId(sameDateLater, profileKey));
    expect(getDailyAstrologySymbolId(nextDate, profileKey))
      .not.toBe(getDailyAstrologySymbolId(firstDate, profileKey));
    expect(getDailyAstrologySymbolId(firstDate, 'binh tran|2000-01-02'))
      .not.toBe(getDailyAstrologySymbolId(firstDate, profileKey));
  });
});
