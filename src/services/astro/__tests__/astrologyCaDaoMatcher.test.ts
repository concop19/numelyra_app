import { buildAstrologyCaDaoMatchPlan } from '../astrologyCaDaoMatcher';

function context(topicId: string, supportingThemes: string[], dominantSignal: 'tension' | 'harmony' | 'conjunction' | 'balanced' = 'balanced') {
  return {
    dominantSignal,
    temperament: { dominantElement: 'Nước' },
    ruleEvaluation: {
      topTopics: [{ topicId, title: 'Chủ đề thử nghiệm', supportingThemes }],
    },
  };
}

describe('astrology ca dao matcher', () => {
  it('prioritizes relationship and family ca dao for Venus and Moon signals', () => {
    const venus = buildAstrologyCaDaoMatchPlan(
      context('natal.planet.Venus', ['natal_venus', 'house_7'], 'harmony')
    );
    expect(venus.categories[0]).toBe('Tình yêu đôi lứa');
    expect(venus.keywords).toEqual(expect.arrayContaining(['tình', 'duyên', 'thương']));
    expect(venus.reason).toContain('tình cảm và kết nối');

    const moon = buildAstrologyCaDaoMatchPlan(
      context('natal.planet.Moon', ['natal_moon', 'house_4'], 'harmony')
    );
    expect(moon.categories[0]).toBe('Tình cảm gia đình, bạn bè');
    expect(moon.keywords).toEqual(expect.arrayContaining(['mẹ', 'nhà']));
  });

  it('uses work and self-irony pools for pressured Mars or Saturn themes', () => {
    const plan = buildAstrologyCaDaoMatchPlan(
      context('transit_natal.Mars.Saturn', ['transit_mars', 'natal_saturn', 'aspect_square'], 'tension')
    );
    expect(plan.categories.slice(0, 2)).toEqual(expect.arrayContaining([
      'Lao động sản xuất',
      'Trào phúng, phê phán đả kích',
    ]));
    expect(plan.keywords).toEqual(expect.arrayContaining(['công', 'việc', 'cười']));
  });

  it('falls back to broad social and nature material without rule topics', () => {
    const plan = buildAstrologyCaDaoMatchPlan();
    expect(plan.categories).toEqual(expect.arrayContaining([
      'Vũ trụ, con người và xã hội',
      'Quan hệ thiên nhiên',
    ]));
    expect(plan.seed).toBe('balanced|unknown-element|unknown-transit-moon|no-top-aspect');
  });

  it('creates a stable seed from the same rule context', () => {
    const input = context('transit_natal.Mercury.Jupiter', ['transit_mercury', 'natal_jupiter']);
    expect(buildAstrologyCaDaoMatchPlan(input).seed)
      .toBe(buildAstrologyCaDaoMatchPlan(input).seed);
  });

  it('uses changing transit and activated-house signals to diversify the daily seed', () => {
    const base = context('natal.planet.Sun', ['natal_sun']);
    const first = buildAstrologyCaDaoMatchPlan({
      ...base,
      transitMoonSign: 'Cancer',
      topAspect: { transitPlanet: 'Venus', natalPlanet: 'Moon', type: 'trine' },
      dailyContext: { activatedHouses: [{ house: 4 }] },
    });
    const second = buildAstrologyCaDaoMatchPlan({
      ...base,
      transitMoonSign: 'Capricorn',
      topAspect: { transitPlanet: 'Mars', natalPlanet: 'Saturn', type: 'square' },
      dailyContext: { activatedHouses: [{ house: 10 }] },
    });
    expect(first.seed).not.toBe(second.seed);
    expect(first.categories).toContain('Tình cảm gia đình, bạn bè');
    expect(second.categories).toContain('Lao động sản xuất');
  });
});
