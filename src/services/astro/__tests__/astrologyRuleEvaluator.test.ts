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
    expect(withContext.topTopics[0].payload.experience).toContain('Chức năng này');
    expect(withContext.topTopics[0].payload.experience).toContain('khi nói về');
    expect(JSON.stringify(withContext)).not.toContain('có thể có thể');
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
    expect(result.matches[0].score).toBeCloseTo(0.5355);
    expect(result.matches[0].payload.experience).toContain('ma sát cần điều chỉnh');
    expect(result.matches[0].payload.advice).toContain('Chia vấn đề');
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

  it('reserves daily topics for an aspect and active transit house before natal context', () => {
    const aspect: DetectedAspect = {
      transitPlanet: 'Mars',
      natalPlanet: 'Moon',
      type: 'square',
      symbol: '□',
      nameVi: 'Vuông góc',
      targetAngle: 90,
      actualAngle: 91,
      orb: 1,
      weight: 0.82,
      nature: 'tension',
    };
    const result = evaluator().evaluate(facts({
      natalSigns: { Sun: 'Aries' },
      natalHouses: { Sun: 1 },
      transitHouses: { Moon: 4, Mars: 10 },
      aspects: [aspect],
      hasReliableNatalContext: true,
    }));

    expect(result.topTopics.map((topic) => topic.topicId)).toEqual([
      'transit_natal.Mars.Moon',
      'transit.planet.Moon',
      'natal.planet.Sun',
    ]);
    expect(JSON.stringify(result.topTopics)).not.toContain('có thể có thể');
  });

  it('deduplicates same-planet aspect prose and keeps rendered sentences clean', () => {
    const aspect: DetectedAspect = {
      transitPlanet: 'Venus',
      natalPlanet: 'Venus',
      type: 'conjunction',
      symbol: '☌',
      nameVi: 'Trùng tụ',
      targetAngle: 0,
      actualAngle: 0.2,
      orb: 0.2,
      weight: 0.9731,
      nature: 'neutral',
    };
    const result = evaluator().evaluate(facts({ aspects: [aspect] }));
    const topic = result.topTopics[0];

    expect(topic.payload.experience).toContain('đang được nhấn mạnh qua góc');
    expect(topic.payload.experience).not.toMatch(/(.{20,}) đang tạo góc .+ với \1/u);
    expect(topic.payload.experience[0]).toBe(
      topic.payload.experience[0].toLocaleUpperCase('vi-VN')
    );
    expect(String(topic.score).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });
});
