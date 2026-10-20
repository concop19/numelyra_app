import type { DetectedAspect } from '../aspectCalculator';
import { getBundledAstrologyRuleCatalog } from '../astrologyRuleCatalog';
import {
  AstrologyRuleEvaluator,
  type AstrologyRuleFacts,
} from '../astrologyRuleEvaluator';

function evaluator(): AstrologyRuleEvaluator {
  const catalog = getBundledAstrologyRuleCatalog();
  if (!catalog) throw new Error('Bundled astrology catalog must be valid.');
  return new AstrologyRuleEvaluator(catalog);
}

function facts(overrides: Partial<AstrologyRuleFacts> = {}): AstrologyRuleFacts {
  return {
    temperament: {},
    natalSigns: {},
    natalHouses: {},
    transitHouses: {},
    aspects: [],
    hasReliableNatalContext: false,
    ...overrides,
  };
}

describe('AstrologyRuleEvaluator', () => {
  it('combines natal sign and house into one topic only with reliable context', () => {
    const engine = evaluator();
    const withoutContext = engine.evaluate(facts({
      natalSigns: { Sun: 'Aries' },
      natalHouses: { Sun: 5 },
    }));
    expect(withoutContext.matches.map((match) => match.ruleIds))
      .toEqual([['placement.planet.Sun.sign.Aries']]);

    const withContext = engine.evaluate(facts({
      natalSigns: { Sun: 'Aries' },
      natalHouses: { Sun: 5 },
      hasReliableNatalContext: true,
    }));
    expect(withContext.topTopics).toHaveLength(1);
    expect(withContext.topTopics[0].topicId).toBe('natal.planet.Sun');
    expect(new Set(withContext.topTopics[0].matchedRuleIds)).toEqual(new Set([
      'placement.planet.Sun.sign.Aries',
      'placement.planet.Sun.house.5',
    ]));
    expect(withContext.topTopics[0].payload.experience).toContain('sắc thái');
    expect(withContext.topTopics[0].payload.experience).toContain('lĩnh vực');
  });

  it('combines transit-natal pair with its aspect modifier and orb weight', () => {
    const aspect: DetectedAspect = {
      transitPlanet: 'Mars',
      natalPlanet: 'Moon',
      type: 'square',
      symbol: '□',
      nameVi: 'Vuông góc',
      targetAngle: 90,
      actualAngle: 93,
      orb: 3,
      weight: 0.63,
      nature: 'tension',
    };
    const result = evaluator().evaluate(facts({ aspects: [aspect] }));
    expect(result.matches[0].ruleIds).toEqual([
      'aspect.pair.transit.Mars.natal.Moon',
      'aspect.modifier.square',
    ]);
    expect(result.matches[0].score).toBeCloseTo(0.63);
    expect(result.matches[0].payload.experience).toContain('ma sát cần điều chỉnh');
    expect(result.matches[0].payload.advice).toContain('chia vấn đề');
    expect(result.topTopics[0].topicId).toBe('transit_natal.Mars.Moon');
  });

  it('returns at most three distinct deterministic topics', () => {
    const input = facts({
      natalSigns: {
        Sun: 'Aries', Moon: 'Taurus', Mercury: 'Gemini', Venus: 'Cancer',
      },
    });
    const first = evaluator().evaluate(input);
    const second = evaluator().evaluate(input);
    expect(first.topTopics).toHaveLength(3);
    expect(new Set(first.topTopics.map((topic) => topic.topicId)).size).toBe(3);
    expect(first).toEqual(second);
  });
});
