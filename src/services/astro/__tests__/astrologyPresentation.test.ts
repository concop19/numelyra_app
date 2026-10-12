import {
  buildTodayInterpretation,
  getActiveInfluences,
  getPlanetGuidanceItems,
  getPrecisionMessage,
  getTodaySummaryCards,
  PLANET_IDS,
  resolveDetailConstellation,
  ZODIAC_IDS,
} from '../../../features/astrology/astrologyPresentation';
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
    expect(resolveDetailConstellation({ kind: 'sign', id: 'Cancer' }, input)).toBe('Cancer');
    expect(resolveDetailConstellation({ kind: 'planet', id: 'Moon' }, input)).toBe(natalMoon?.sign);
    expect(resolveDetailConstellation({ kind: 'planet', id: 'Pluto' })).toBe('Pisces');
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
