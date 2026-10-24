import { Body } from 'astronomy-engine';

import {
  MAJOR_ASPECTS,
  analyzeTransitToNatalAspects,
  getShortestAngleDiff,
} from '../aspectCalculator';
import {
  ZODIAC_SIGNS,
  assignPlanetsToHouses,
  calculateAngles,
  calculatePlanetaryChart,
  calculatePorphyryCusps,
  houseForLongitude,
  longitudeToZodiac,
  resolveBirthDate,
  type PlanetPosition,
  type PlanetaryChart,
} from '../astroEngine';
import type { ResolvedBirthLocation } from '../../../store/userProfile';

const ONE_DAY_MS = 86_400_000;

function makePlanet(name: string, longitude: number): PlanetPosition {
  const zodiac = longitudeToZodiac(longitude);
  const normalizedLongitude = ((longitude % 360) + 360) % 360;
  return {
    name,
    body: Body.Sun,
    longitude: normalizedLongitude,
    ...zodiac,
  };
}

function makeSinglePlanetChart(name: string, longitude: number): PlanetaryChart {
  const planet = makePlanet(name, longitude);
  return {
    targetDate: new Date('2000-01-01T12:00:00.000Z'),
    isTimeEstimated: false,
    planets: { [name]: planet },
    planetList: [planet],
  };
}

function location(
  timeZoneIdentifier: string,
  latitude = 0,
  longitude = 0
): ResolvedBirthLocation {
  return {
    placeId: timeZoneIdentifier,
    userLabel: timeZoneIdentifier,
    latitude,
    longitude,
    timeZoneIdentifier,
    resolvedAt: '2026-10-22T00:00:00.000Z',
  };
}

function expectUtc(
  birthDate: string,
  birthTime: string,
  timeZoneIdentifier: string,
  expectedUtc: string
): void {
  const resolved = resolveBirthDate(
    birthDate,
    birthTime,
    'exact',
    location(timeZoneIdentifier)
  );
  expect(resolved.date.toISOString()).toBe(expectedUtc);
  expect(resolved.isTimeEstimated).toBe(false);
  expect(resolved.precision).toBe('complete');
}

/** Deterministic pseudo-random generator so failures are exactly reproducible. */
function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('Major aspect boundary audit', () => {
  it.each(MAJOR_ASPECTS)(
    'detects $type at exactitude and on its inclusive max-orb boundary',
    (definition) => {
      const direction = definition.targetAngle === 180 ? -1 : 1;
      const exact = analyzeTransitToNatalAspects(
        makeSinglePlanetChart('Transit', definition.targetAngle),
        makeSinglePlanetChart('Natal', 0)
      ).aspects.find((aspect) => aspect.type === definition.type);
      const boundary = analyzeTransitToNatalAspects(
        makeSinglePlanetChart(
          'Transit',
          definition.targetAngle + direction * definition.maxOrb
        ),
        makeSinglePlanetChart('Natal', 0)
      ).aspects.find((aspect) => aspect.type === definition.type);

      expect(exact).toMatchObject({ orb: 0, weight: definition.baseWeight });
      expect(boundary).toMatchObject({ orb: definition.maxOrb, weight: 0 });
    }
  );

  it.each(MAJOR_ASPECTS)(
    'rejects $type immediately outside its max-orb boundary',
    (definition) => {
      const direction = definition.targetAngle === 180 ? -1 : 1;
      const outsideLongitude = definition.targetAngle
        + direction * (definition.maxOrb + 0.001);
      const result = analyzeTransitToNatalAspects(
        makeSinglePlanetChart('Transit', outsideLongitude),
        makeSinglePlanetChart('Natal', 0)
      );

      expect(result.aspects.some((aspect) => aspect.type === definition.type)).toBe(false);
    }
  );

  it('handles conjunction and shortest-angle boundaries across 0°/360°', () => {
    const wrapped = analyzeTransitToNatalAspects(
      makeSinglePlanetChart('Transit', 359.999),
      makeSinglePlanetChart('Natal', 0.001)
    );

    expect(getShortestAngleDiff(359.999, 0.001)).toBeCloseTo(0.002, 9);
    expect(wrapped.aspects[0]).toMatchObject({
      type: 'conjunction',
      actualAngle: 0,
      orb: 0,
    });
    expect(wrapped.aspects[0].weight).toBeGreaterThan(0.999);
  });
});

describe('Astrology deterministic property audit', () => {
  it('keeps zodiac conversion stable at every sign and wrap boundary', () => {
    for (let signIndex = 0; signIndex < ZODIAC_SIGNS.length; signIndex += 1) {
      const start = signIndex * 30;
      const justInside = longitudeToZodiac(start + 29.999999);
      const atNextBoundary = longitudeToZodiac(start + 30);

      expect(longitudeToZodiac(start)).toMatchObject({
        sign: ZODIAC_SIGNS[signIndex],
        signIndex,
        degreeInSign: 0,
      });
      expect(justInside.signIndex).toBe(signIndex);
      expect(justInside.degreeInSign).toBeGreaterThanOrEqual(0);
      expect(justInside.degreeInSign).toBeLessThan(30);
      expect(atNextBoundary.signIndex).toBe((signIndex + 1) % 12);
      expect(atNextBoundary.degreeInSign).toBe(0);
    }

    expect(longitudeToZodiac(-0.001).sign).toBe('Pisces');
    expect(longitudeToZodiac(360).sign).toBe('Aries');
    expect(longitudeToZodiac(720.001).sign).toBe('Aries');
  });

  it('preserves chart, angle, cusp and house invariants over 2,560 placements', () => {
    const random = createDeterministicRandom(0x4e554d45);
    const startMs = Date.parse('1900-01-01T00:00:00.000Z');
    const endMs = Date.parse('2100-12-31T23:59:59.999Z');

    for (let sample = 0; sample < 256; sample += 1) {
      const date = new Date(startMs + random() * (endMs - startMs));
      const latitude = -75 + random() * 150;
      const longitude = -180 + random() * 360;
      const chart = calculatePlanetaryChart(date);
      const angles = calculateAngles(date, latitude, longitude);
      const cusps = calculatePorphyryCusps(angles);
      const planetHouses = assignPlanetsToHouses(chart.planetList, cusps);

      expect(chart.planetList).toHaveLength(10);
      expect(Object.keys(chart.planets)).toHaveLength(10);
      expect(cusps).toHaveLength(12);
      expect(Object.keys(planetHouses)).toHaveLength(10);

      for (const planet of chart.planetList) {
        expect(Number.isFinite(planet.longitude)).toBe(true);
        expect(planet.longitude).toBeGreaterThanOrEqual(0);
        expect(planet.longitude).toBeLessThan(360);
        expect(planet.signIndex).toBeGreaterThanOrEqual(0);
        expect(planet.signIndex).toBeLessThan(12);
        expect(planet.sign).toBe(ZODIAC_SIGNS[planet.signIndex]);
        expect(planet.degreeInSign).toBeGreaterThanOrEqual(0);
        expect(planet.degreeInSign).toBeLessThan(30);
        expect(planet.normalized).toBeGreaterThanOrEqual(0);
        expect(planet.normalized).toBeLessThanOrEqual(1);
        expect(planetHouses[planet.name]).toBeGreaterThanOrEqual(1);
        expect(planetHouses[planet.name]).toBeLessThanOrEqual(12);
      }

      expect(getShortestAngleDiff(angles.ascendant, angles.descendant)).toBeCloseTo(180, 6);
      expect(getShortestAngleDiff(angles.midheaven, angles.imumCoeli)).toBeCloseTo(180, 6);

      let totalCuspArc = 0;
      for (let index = 0; index < cusps.length; index += 1) {
        const cusp = cusps[index];
        const next = cusps[(index + 1) % cusps.length];
        const arc = ((next.longitude - cusp.longitude) % 360 + 360) % 360;
        totalCuspArc += arc;

        expect(cusp.house).toBe(index + 1);
        expect(cusp.longitude).toBeGreaterThanOrEqual(0);
        expect(cusp.longitude).toBeLessThan(360);
        expect(arc).toBeGreaterThan(0);
        const assignedHouse = houseForLongitude(cusp.longitude, cusps);
        if (assignedHouse !== cusp.house) {
          throw new Error(
            `Cusp assignment mismatch at sample ${sample}, date=${date.toISOString()}, `
            + `lat=${latitude}, lon=${longitude}, cusp=${cusp.house}, assigned=${assignedHouse}, `
            + `cusps=${cusps.map((item) => item.longitude).join(',')}`
          );
        }
      }
      expect(totalCuspArc).toBeCloseTo(360, 4);

      for (let index = 0; index < 6; index += 1) {
        expect(getShortestAngleDiff(
          cusps[index].longitude,
          cusps[index + 6].longitude
        )).toBeCloseTo(180, 5);
      }
    }
  });

  it('keeps aspect scores finite and bounded across deterministic chart pairs', () => {
    const base = Date.parse('1995-01-01T00:00:00.000Z');
    for (let sample = 0; sample < 64; sample += 1) {
      const natal = calculatePlanetaryChart(new Date(base + sample * 137 * ONE_DAY_MS));
      const transit = calculatePlanetaryChart(new Date(base + sample * 137 * ONE_DAY_MS + 31 * ONE_DAY_MS));
      const analysis = analyzeTransitToNatalAspects(transit, natal);

      for (const score of [
        analysis.tensionScore,
        analysis.harmonyScore,
        analysis.conjunctionIntensity,
        analysis.fastPlanetActivity,
      ]) {
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
      expect(analysis.aspects.every((aspect) => (
        aspect.orb >= 0 && aspect.weight >= 0 && aspect.weight <= 1
      ))).toBe(true);
    }
  });

  it('selects the eastern Ascendant at southern polar latitudes', () => {
    // Independent Swiss Ephemeris 2.10.03 reference, Porphyry system (`O`).
    const date = new Date('2058-04-13T06:58:22.459Z');
    const angles = calculateAngles(date, -73.302073509, 123.6064394563);
    const cusps = calculatePorphyryCusps(angles);
    const expectedCusps = [
      216.5001019, 228.1542952, 239.8084885, 251.4626817,
      299.8084885, 348.1542952, 36.5001019, 48.1542952,
      59.8084885, 71.4626817, 119.8084885, 168.1542952,
    ];

    expect(angles.ascendant).toBeCloseTo(216.5001019, 2);
    expect(angles.midheaven).toBeCloseTo(71.4626817, 2);
    cusps.forEach((cusp, index) => {
      expect(cusp.longitude).toBeCloseTo(expectedCusps[index], 2);
      expect(houseForLongitude(cusp.longitude, cusps)).toBe(cusp.house);
    });
  });
});

describe('Historical IANA timezone audit', () => {
  it('tracks the 2011 Samoa international-date-line jump', () => {
    expectUtc('2011-12-29', '12:00', 'Pacific/Apia', '2011-12-29T22:00:00.000Z');
    expect(() => resolveBirthDate(
      '2011-12-30',
      '12:00',
      'exact',
      location('Pacific/Apia')
    )).toThrow(/không tồn tại/);
    expectUtc('2011-12-31', '12:00', 'Pacific/Apia', '2011-12-30T22:00:00.000Z');
  });

  it('tracks Nepal changing from UTC+05:30 to UTC+05:45 in 1986', () => {
    expectUtc('1985-12-31', '23:59', 'Asia/Kathmandu', '1985-12-31T18:29:00.000Z');
    expect(() => resolveBirthDate(
      '1986-01-01',
      '00:05',
      'exact',
      location('Asia/Kathmandu')
    )).toThrow(/không tồn tại/);
    expectUtc('1986-01-01', '00:15', 'Asia/Kathmandu', '1985-12-31T18:30:00.000Z');
  });

  it('tracks British Double Summer Time and its July 1945 rollback', () => {
    expectUtc('1945-07-14', '12:00', 'Europe/London', '1945-07-14T10:00:00.000Z');
    expectUtc('1945-07-15', '12:00', 'Europe/London', '1945-07-15T11:00:00.000Z');
  });

  it('tracks Ho Chi Minh City changing from UTC+08 to UTC+07 in 1975', () => {
    expectUtc('1975-01-01', '12:00', 'Asia/Ho_Chi_Minh', '1975-01-01T04:00:00.000Z');
    expectUtc('1976-01-01', '12:00', 'Asia/Ho_Chi_Minh', '1976-01-01T05:00:00.000Z');
  });
});
