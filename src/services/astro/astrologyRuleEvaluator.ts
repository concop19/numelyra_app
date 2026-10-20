import {
  MAJOR_ASPECTS,
  type DetectedAspect,
} from './aspectCalculator';
import {
  getBundledAstrologyRuleCatalog,
  validateAstrologyRuleCatalog,
  type AstrologyRuleCatalog,
  type AstrologyRuleRecord,
  type AstrologyRuleValue,
} from './astrologyRuleCatalog';

export interface AstrologyRuleFacts {
  temperament: Record<string, number>;
  natalSigns: Record<string, string>;
  natalHouses: Record<string, number>;
  transitHouses: Record<string, number>;
  aspects: DetectedAspect[];
  hasReliableNatalContext: boolean;
}

export interface AstrologyRuleRenderedPayload {
  experience: string;
  challenge: string;
  supportiveExpression: string;
  advice: string;
}

export interface AstrologyRuleMatch {
  ruleIds: string[];
  themes: string[];
  score: number;
  payload: AstrologyRuleRenderedPayload;
}

export interface AstrologyRuleTopic {
  topicId: string;
  title: string;
  score: number;
  matchedRuleIds: string[];
  supportingSignalCount: number;
  supportingThemes: string[];
  payload: AstrologyRuleRenderedPayload;
}

export interface AstrologyRuleEvaluation {
  catalogId: string;
  schemaVersion: number;
  matches: AstrologyRuleMatch[];
  topTopics: AstrologyRuleTopic[];
}

function stringValue(value: AstrologyRuleValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: AstrologyRuleValue | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export class AstrologyRuleEvaluator {
  private readonly rulesById: Map<string, AstrologyRuleRecord>;

  constructor(private readonly catalog: AstrologyRuleCatalog) {
    const failures = validateAstrologyRuleCatalog(catalog);
    if (failures.length > 0) throw new Error(`Catalog astrology không hợp lệ: ${failures.join(' ')}`);
    this.rulesById = new Map(catalog.rules.map((rule) => [rule.ruleId, rule]));
  }

  evaluate(facts: AstrologyRuleFacts, maximumTopics = 3): AstrologyRuleEvaluation {
    const matches: AstrologyRuleMatch[] = [];
    for (const rule of this.catalog.rules) {
      switch (rule.kind) {
        case 'temperament_balance': {
          const metric = stringValue(rule.conditions.metric);
          const value = metric ? facts.temperament[metric] : undefined;
          const payload = value !== undefined && this.matchesThreshold(rule, value)
            ? this.render(rule, rule.templateBindings)
            : null;
          if (payload) matches.push({ ruleIds: [rule.ruleId], themes: rule.themes, score: 1, payload });
          break;
        }
        case 'temperament_profile': {
          const payload = this.profileMatches(rule, facts)
            ? this.render(rule, rule.templateBindings)
            : null;
          if (payload) matches.push({ ruleIds: [rule.ruleId], themes: rule.themes, score: 1, payload });
          break;
        }
        case 'planet_sign': {
          const planet = stringValue(rule.conditions.planet);
          const sign = stringValue(rule.conditions.sign);
          const payload = planet && sign && facts.natalSigns[planet] === sign
            ? this.render(rule, rule.templateBindings)
            : null;
          if (payload) matches.push({ ruleIds: [rule.ruleId], themes: rule.themes, score: 1, payload });
          break;
        }
        case 'planet_house': {
          const planet = stringValue(rule.conditions.planet);
          const house = numberValue(rule.conditions.house);
          const payload = facts.hasReliableNatalContext && planet && house !== undefined
            && facts.natalHouses[planet] === house
            ? this.render(rule, rule.templateBindings)
            : null;
          if (payload) matches.push({ ruleIds: [rule.ruleId], themes: rule.themes, score: 1, payload });
          break;
        }
        case 'transit_natal_pair': {
          const transit = stringValue(rule.conditions.transitPlanet);
          const natal = stringValue(rule.conditions.natalPlanet);
          if (!transit || !natal) break;
          for (const aspect of facts.aspects) {
            if (aspect.transitPlanet !== transit || aspect.natalPlanet !== natal) continue;
            const definition = MAJOR_ASPECTS.find((item) => item.type === aspect.type);
            const modifier = this.rulesById.get(`aspect.modifier.${aspect.type}`);
            if (!definition || !modifier || !Number.isFinite(aspect.orb)
              || aspect.orb < 0 || aspect.orb > definition.maxOrb) continue;
            const bindings = {
              ...rule.templateBindings,
              aspectStyle: `aspect.${aspect.type}.style`,
              aspectSupport: `aspect.${aspect.type}.support`,
              aspectAdvice: `aspect.${aspect.type}.advice`,
            };
            const payload = this.render(rule, bindings);
            if (!payload) continue;
            matches.push({
              ruleIds: [rule.ruleId, modifier.ruleId],
              themes: uniqueSorted([...rule.themes, ...modifier.themes]),
              score: Math.max(0, aspect.weight),
              payload,
            });
          }
          break;
        }
        case 'aspect_modifier':
          break;
        case 'transit_house': {
          const planet = stringValue(rule.conditions.transitPlanet);
          const house = numberValue(rule.conditions.house);
          const payload = facts.hasReliableNatalContext && planet && house !== undefined
            && facts.transitHouses[planet] === house
            ? this.render(rule, rule.templateBindings)
            : null;
          if (payload) matches.push({ ruleIds: [rule.ruleId], themes: rule.themes, score: 1, payload });
          break;
        }
      }
    }

    return {
      catalogId: this.catalog.catalogId,
      schemaVersion: this.catalog.schemaVersion,
      matches: [...matches].sort((left, right) => right.score - left.score),
      topTopics: this.synthesizeTopics(matches, Math.max(0, maximumTopics)),
    };
  }

  private profileMatches(rule: AstrologyRuleRecord, facts: AstrologyRuleFacts): boolean {
    const metric = stringValue(rule.conditions.metric);
    const threshold = rule.conditions.threshold;
    let relevant: number[];
    if (metric === 'temperament.element.spread') {
      relevant = ['fire', 'earth', 'air', 'water'].map((key) => facts.temperament[`temperament.${key}`]);
    } else if (metric === 'temperament.modality.spread') {
      relevant = ['cardinal', 'fixed', 'mutable'].map((key) => facts.temperament[`temperament.${key}`]);
    } else if (metric === 'temperament.all') {
      relevant = ['fire', 'earth', 'air', 'water', 'cardinal', 'fixed', 'mutable']
        .map((key) => facts.temperament[`temperament.${key}`]);
    } else {
      return false;
    }
    if (relevant.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) return false;
    const operator = stringValue(rule.conditions.operator);
    if (operator === 'spread_lte' && typeof threshold === 'number') {
      return Math.max(...relevant) - Math.min(...relevant) <= threshold;
    }
    if (operator === 'balanced_range' && Array.isArray(threshold) && threshold.length === 2) {
      return relevant.every((value) => value >= threshold[0] && value <= threshold[1]);
    }
    return false;
  }

  private matchesThreshold(rule: AstrologyRuleRecord, value: number): boolean {
    if (!Number.isFinite(value)) return false;
    const operator = stringValue(rule.conditions.operator);
    const threshold = rule.conditions.threshold;
    if (operator === 'gte' && typeof threshold === 'number') return value >= threshold;
    if (operator === 'lte' && typeof threshold === 'number') return value <= threshold;
    if (operator === 'range' && Array.isArray(threshold) && threshold.length === 2) {
      return value >= threshold[0] && value <= threshold[1];
    }
    return false;
  }

  private render(
    rule: AstrologyRuleRecord,
    bindings: Record<string, string>
  ): AstrologyRuleRenderedPayload | null {
    const template = this.catalog.payloadTemplates[rule.payloadTemplateId];
    if (!template) return null;
    const expand = (text: string): string | null => {
      let result = text;
      for (const [placeholder, ref] of Object.entries(bindings)) {
        const content = this.catalog.contentLibrary[ref];
        if (!content) return null;
        result = result.split(`{${placeholder}}`).join(content);
      }
      return result;
    };
    const experience = expand(template.experience);
    const challenge = expand(template.challenge);
    const supportiveExpression = expand(template.supportiveExpression);
    const advice = expand(template.advice);
    if (!experience || !challenge || !supportiveExpression || !advice) return null;
    return { experience, challenge, supportiveExpression, advice };
  }

  private synthesizeTopics(matches: AstrologyRuleMatch[], maximumCount: number): AstrologyRuleTopic[] {
    const grouped = new Map<string, { title: string; matches: AstrologyRuleMatch[] }>();
    for (const match of matches) {
      const primaryRule = this.rulesById.get(match.ruleIds[0]);
      if (!primaryRule) continue;
      const identity = this.topicIdentity(primaryRule);
      const current = grouped.get(identity.id) ?? { title: identity.title, matches: [] };
      current.matches.push(match);
      grouped.set(identity.id, current);
    }

    return [...grouped.entries()].map(([topicId, value]) => {
      const payloads = value.matches.map((match) => match.payload);
      return {
        topicId,
        title: value.title,
        score: Math.max(...value.matches.map((match) => match.score)),
        matchedRuleIds: uniqueSorted(value.matches.flatMap((match) => match.ruleIds)),
        supportingSignalCount: new Set(value.matches.map((match) => match.ruleIds[0])).size,
        supportingThemes: uniqueSorted(value.matches.flatMap((match) => match.themes)),
        payload: {
          experience: this.joinUnique(payloads.map((payload) => payload.experience)),
          challenge: this.joinUnique(payloads.map((payload) => payload.challenge)),
          supportiveExpression: this.joinUnique(payloads.map((payload) => payload.supportiveExpression)),
          advice: this.joinUnique(payloads.map((payload) => payload.advice)),
        },
      };
    }).sort((left, right) => (
      right.score - left.score
      || right.supportingSignalCount - left.supportingSignalCount
      || left.topicId.localeCompare(right.topicId)
    )).slice(0, maximumCount);
  }

  private topicIdentity(rule: AstrologyRuleRecord): { id: string; title: string } {
    const value = (key: string) => stringValue(rule.conditions[key]) ?? 'unknown';
    const planetTitles: Record<string, string> = {
      Sun: 'Mặt Trời', Moon: 'Mặt Trăng', Mercury: 'Sao Thủy', Venus: 'Sao Kim',
      Mars: 'Sao Hỏa', Jupiter: 'Sao Mộc', Saturn: 'Sao Thổ', Uranus: 'Thiên Vương',
      Neptune: 'Hải Vương', Pluto: 'Diêm Vương',
    };
    switch (rule.kind) {
      case 'temperament_balance': {
        const metric = value('metric');
        const key = metric.split('.').pop() ?? metric;
        const names: Record<string, string> = {
          fire: 'Lửa', earth: 'Đất', air: 'Khí', water: 'Nước',
          cardinal: 'Tiên phong', fixed: 'Kiên định', mutable: 'Linh hoạt',
        };
        const dimension = ['fire', 'earth', 'air', 'water'].includes(key) ? 'Nguyên tố' : 'Tính chất';
        return { id: metric, title: `${dimension} ${names[key] ?? key}` };
      }
      case 'temperament_profile': {
        const profile = value('profile');
        const titles: Record<string, string> = {
          mixed_elements: 'Phân bố nguyên tố',
          mixed_modalities: 'Nhịp tính chất',
          balanced_profile: 'Cân bằng khí chất',
        };
        return { id: `temperament.profile.${profile}`, title: titles[profile] ?? 'Khí chất' };
      }
      case 'planet_sign':
      case 'planet_house': {
        const planet = value('planet');
        return { id: `natal.planet.${planet}`, title: `Natal · ${planetTitles[planet] ?? planet}` };
      }
      case 'transit_natal_pair': {
        const transit = value('transitPlanet');
        const natal = value('natalPlanet');
        return {
          id: `transit_natal.${transit}.${natal}`,
          title: `${planetTitles[transit] ?? transit} · ${planetTitles[natal] ?? natal}`,
        };
      }
      case 'transit_house': {
        const planet = value('transitPlanet');
        return { id: `transit.planet.${planet}`, title: `Transit · ${planetTitles[planet] ?? planet}` };
      }
      case 'aspect_modifier': {
        const aspect = value('aspectType');
        return { id: `aspect.${aspect}`, title: `Góc ${aspect}` };
      }
    }
  }

  private joinUnique(values: string[]): string {
    return [...new Set(values)].join(' ');
  }
}

let bundledEvaluator: AstrologyRuleEvaluator | null | undefined;

export function getBundledAstrologyRuleEvaluator(): AstrologyRuleEvaluator | null {
  if (bundledEvaluator !== undefined) return bundledEvaluator;
  const catalog = getBundledAstrologyRuleCatalog();
  if (!catalog) {
    bundledEvaluator = null;
    return bundledEvaluator;
  }
  try {
    bundledEvaluator = new AstrologyRuleEvaluator(catalog);
  } catch {
    bundledEvaluator = null;
  }
  return bundledEvaluator;
}
