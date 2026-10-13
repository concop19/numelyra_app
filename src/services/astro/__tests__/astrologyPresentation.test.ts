import {
  buildTodayInterpretation,
  buildPlanetModeSummary,
  buildPlanetPlacementInterpretation,
  getActiveInfluences,
  getIncomingTransitAspects,
  getNatalAspectsForPlanet,
  getOutgoingTransitAspects,
  getPlanetGuidanceItems,
  getPrecisionMessage,
  getTodaySummaryCards,
  PLANET_IDS,
  resolveDetailConstellation,
  ZODIAC_IDS,
} from '../../../features/astrology/astrologyPresentation';
import type { DetectedAspect } from '../aspectCalculator';
import {
  ASTROLOGY_BACKGROUNDS,
  CONSTELLATION_SVG,
  PLANET_PNG,
  PLANET_SVG,
  ZODIAC_PNG,
} from '../../../features/astrology/astrologyArtwork';
import { generatePureAstroVector, type AstroDominantSignal } from '../astroVectorEngine';

const location = {
  placeId: 'hanoi',
  userLabel: 'Hà Nội, Việt Nam',
  latitude: 21.0278,
  longitude: 105.8342,
  timeZoneIdentifier: 'Asia/Ho_Chi_Minh',
  resolvedAt: '2026-10-11T00:00:00.000Z',
};

function metadata() {
  return generatePureAstroVector({
    birthDate: '1998-10-20',
    birthTime: '14:30',
    birthTimeAccuracy: 'exact',
    resolvedBirthLocation: location,
  }, new Date('2026-10-11T12:00:00.000Z')).metadata;
}

function transitAspect(
  transitPlanet: string,
  natalPlanet: string,
  weight: number,
  orb: number
): DetectedAspect {
  return {
    transitPlanet,
    natalPlanet,
    type: 'square',
    symbol: '□',
    nameVi: 'Vuông góc',
    targetAngle: 90,
    actualAngle: 90 + orb,
    orb,
    weight,
    nature: 'tension',
  };
}

describe('astrology presentation mapping', () => {
  it('maps all backgrounds, planets, zodiac art, and constellations', () => {
    expect(Object.keys(ASTROLOGY_BACKGROUNDS)).toEqual(['today', 'natal', 'detail', 'planetDetail']);
    expect(Object.keys(PLANET_PNG)).toEqual(PLANET_IDS);
    expect(Object.keys(PLANET_SVG)).toEqual(PLANET_IDS);
    expect(Object.keys(ZODIAC_PNG)).toEqual(ZODIAC_IDS);
    expect(Object.keys(CONSTELLATION_SVG)).toEqual(ZODIAC_IDS);
  });

  it('always builds guidance for all ten planets in canonical order', () => {
    const input = metadata();
    input.notableTransitAspects = [];
    const items = getPlanetGuidanceItems(input);
    expect(items.map((item) => item.id)).toEqual(PLANET_IDS);
    expect(items).toHaveLength(10);
    expect(items.every((item) => item.aspect === null && item.aspectText.length > 0)).toBe(true);
  });

  it('resolves detail constellations for signs, planet placements, and missing metadata', () => {
    const input = metadata();
    const natalMoon = input.natalPlanets.find((planet) => planet.name === 'Moon');
    const transitMoon = input.transitPlanets.find((planet) => planet.name === 'Moon');
    expect(resolveDetailConstellation({ kind: 'sign', id: 'Cancer' }, input)).toBe('Cancer');
    expect(resolveDetailConstellation({ kind: 'planet', id: 'Moon' }, input)).toBe(natalMoon?.sign);
    expect(resolveDetailConstellation({ kind: 'planet', id: 'Moon' }, input, 'transit')).toBe(transitMoon?.sign);
    expect(resolveDetailConstellation({ kind: 'planet', id: 'Pluto' })).toBe('Pisces');
  });

  it('keeps incoming and outgoing transit aspects directional', () => {
    const input = metadata();
    input.transitAspects = [
      transitAspect('Moon', 'Sun', 0.5, 1),
      transitAspect('Sun', 'Moon', 0.8, 0.5),
      transitAspect('Moon', 'Venus', 0.7, 0.2),
      transitAspect('Pluto', 'Moon', 1, 0.1),
    ];

    expect(getIncomingTransitAspects(input, 'Moon').map((item) => item.transitPlanet))
      .toEqual(['Sun', 'Pluto']);
    expect(getOutgoingTransitAspects(input, 'Moon').map((item) => item.natalPlanet))
      .toEqual(['Venus', 'Sun']);
  });

  it('selects natal aspects for either side and keeps the strongest first', () => {
    const input = metadata();
    const selected = getNatalAspectsForPlanet(input, 'Moon');
    expect(selected.every((item) => item.planetA === 'Moon' || item.planetB === 'Moon')).toBe(true);
    expect(selected.every((item, index) => index === 0 || selected[index - 1].weight >= item.weight)).toBe(true);
  });

  it('builds structured placement and mode summaries from the selected planet only', () => {
    const input = metadata();
    const natalMoon = input.natalPlanets.find((planet) => planet.name === 'Moon');
    const house = input.natalContext?.planetHouses.Moon;
    const placement = buildPlanetPlacementInterpretation('Moon', natalMoon?.sign, house, 'natal');
    const summary = buildPlanetModeSummary(input, 'Moon', 'transit');

    expect(placement.join(' ')).toContain('Mặt Trăng');
    if (house) expect(placement.join(' ')).toContain(`Nhà ${house}`);
    expect(summary).toContain('Mặt Trăng');
  });

  it.each<AstroDominantSignal>(['tension', 'harmony', 'conjunction', 'balanced'])(
    'maps %s without inventing lifestyle percentages',
    (signal) => {
      const input = metadata();
      input.dominantSignal = signal;
      const cards = getTodaySummaryCards(input);
      expect(cards).toHaveLength(4);
      expect(cards.map((card) => card.id)).toEqual(['energy', 'emotion', 'relationships', 'actions']);
      expect(cards.map((card) => `${card.value} ${card.detail}`).join(' ')).not.toMatch(/tình yêu|sức khỏe|may mắn|sự nghiệp/i);
    }
  );

  it('filters Moon and Venus influences from real aspects', () => {
    const input = metadata();
    const moon = getActiveInfluences(input, { kind: 'planet', id: 'Moon' });
    const venus = getActiveInfluences(input, { kind: 'planet', id: 'Venus' });
    expect(moon.every((item) => item.transitPlanet === 'Moon' || item.natalPlanet === 'Moon')).toBe(true);
    expect(venus.every((item) => item.transitPlanet === 'Venus' || item.natalPlanet === 'Venus')).toBe(true);
  });

  it('describes complete and incomplete birth precision explicitly', () => {
    const complete = metadata();
    const dateOnly = generatePureAstroVector({ birthDate: '1998-10-20' }, new Date('2026-10-11T12:00:00.000Z')).metadata;
    expect(getPrecisionMessage(complete)).toContain('Porphyry');
    expect(getPrecisionMessage(dateOnly)).toContain('12:00 tạm tính');
    expect(dateOnly.natalContext).toBeNull();
  });

  it('builds interpretation only from current metadata', () => {
    const input = metadata();
    const text = buildTodayInterpretation(input, { kind: 'planet', id: 'Moon' });
    expect(text).toContain(input.vibeSummary);
    expect(text).not.toContain('1998-10-20');
    if (input.topAspect) expect(text).toContain(input.topAspect.orb.toFixed(1));
  });
});
