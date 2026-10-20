import rawCatalog from '../../../assets/rule/AstrologyRules.v1.json';

import { ASTRO_ENGINE_VERSION } from './astroVersion';

export type AstrologyRuleDomain =
  | 'temperament'
  | 'placement'
  | 'transit_natal_aspect'
  | 'transit_house';

export type AstrologyRuleKind =
  | 'temperament_balance'
  | 'temperament_profile'
  | 'planet_sign'
  | 'planet_house'
  | 'transit_natal_pair'
  | 'aspect_modifier'
  | 'transit_house';

export type AstrologyRuleValue = string | number | number[] | boolean;

export interface AstrologyRuleCompatibility {
  zodiac: string;
  houseSystem: string;
  engineVersion: string;
  planets: string[];
  signs: string[];
  houses: number[];
  aspects: string[];
}

export interface AstrologyRuleSource {
  sourceId: string;
  author: string;
  title: string;
  year: number;
  location: string;
  url: string;
  licenseStatus: string;
  verificationStatus: string;
}

export interface AstrologyRuleContentProvenance {
  sourceRefs: string[];
  location: string;
  attributionType: string;
  verificationStatus: string;
}

export interface AstrologyRulePayloadTemplate {
  experience: string;
  challenge: string;
  supportiveExpression: string;
  advice: string;
}

export interface AstrologyRuleRecord {
  ruleId: string;
  version: number;
  domain: AstrologyRuleDomain;
  kind: AstrologyRuleKind;
  epistemicTier: string;
  tradition: string;
  conditions: Record<string, AstrologyRuleValue>;
  themes: string[];
  payloadTemplateId: string;
  templateBindings: Record<string, string>;
  contentRefs: string[];
  sourceRefs: string[];
  requiresNatalContext: boolean;
  editorialStatus: string;
}

export interface AstrologyRuleCatalog {
  catalogId: string;
  schemaVersion: number;
  tradition: string;
  compatibility: AstrologyRuleCompatibility;
  sourceReferences: AstrologyRuleSource[];
  contentLibrary: Record<string, string>;
  contentProvenance: Record<string, AstrologyRuleContentProvenance>;
  payloadTemplates: Record<string, AstrologyRulePayloadTemplate>;
  rules: AstrologyRuleRecord[];
}

export const ASTROLOGY_RULE_EXPECTED_COUNT = 489;
export const ASTROLOGY_RULE_EXPECTED_COUNTS: Record<AstrologyRuleKind, number> = {
  temperament_balance: 21,
  temperament_profile: 3,
  planet_sign: 120,
  planet_house: 120,
  transit_natal_pair: 100,
  aspect_modifier: 5,
  transit_house: 120,
};

export const ASTROLOGY_RULE_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

export const ASTROLOGY_RULE_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const ASTROLOGY_RULE_ASPECTS = [
  'conjunction', 'sextile', 'square', 'trine', 'opposition',
] as const;

const ASTROLOGY_RULE_KINDS = Object.keys(
  ASTROLOGY_RULE_EXPECTED_COUNTS
) as AstrologyRuleKind[];

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isObject(value) && Object.values(value).every((item) => typeof item === 'string');
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stringCondition(rule: AstrologyRuleRecord, key: string): string | undefined {
  const value = rule.conditions[key];
  return typeof value === 'string' ? value : undefined;
}

function numberCondition(rule: AstrologyRuleRecord, key: string): number | undefined {
  const value = rule.conditions[key];
  return typeof value === 'number' ? value : undefined;
}

function isIntegerHouse(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= 12;
}

function catalogShapeFailures(value: unknown): string[] {
  if (!isObject(value)) return ['Catalog phải là object.'];
  const failures: string[] = [];
  if (typeof value.catalogId !== 'string') failures.push('catalogId phải là string.');
  if (typeof value.schemaVersion !== 'number') failures.push('schemaVersion phải là number.');
  if (typeof value.tradition !== 'string') failures.push('tradition phải là string.');
  if (!isObject(value.compatibility)) failures.push('compatibility không hợp lệ.');
  if (!Array.isArray(value.sourceReferences)) failures.push('sourceReferences không hợp lệ.');
  if (!isStringRecord(value.contentLibrary)) failures.push('contentLibrary không hợp lệ.');
  if (!isObject(value.contentProvenance)) failures.push('contentProvenance không hợp lệ.');
  if (!isObject(value.payloadTemplates)) failures.push('payloadTemplates không hợp lệ.');
  if (!Array.isArray(value.rules)) failures.push('rules không hợp lệ.');
  return failures;
}

function thresholdMatchesState(rule: AstrologyRuleRecord): boolean {
  const metric = stringCondition(rule, 'metric');
  const operator = stringCondition(rule, 'operator');
  const threshold = rule.conditions.threshold;
  const isElement = ['temperament.fire', 'temperament.earth', 'temperament.air', 'temperament.water'].includes(metric ?? '');
  const isModality = ['temperament.cardinal', 'temperament.fixed', 'temperament.mutable'].includes(metric ?? '');
  if (!isElement && !isModality) return false;
  const high = isElement ? 0.4 : 0.5;
  const low = 0.1;
  const mid = isElement ? [0.2, 0.3] : [0.2, 0.4];
  if (operator === 'gte' && typeof threshold === 'number') {
    return rule.ruleId.endsWith('.high') && Math.abs(threshold - high) < 1e-7;
  }
  if (operator === 'lte' && typeof threshold === 'number') {
    return rule.ruleId.endsWith('.low') && Math.abs(threshold - low) < 1e-7;
  }
  if (operator === 'range' && Array.isArray(threshold) && threshold.length === 2) {
    return rule.ruleId.endsWith('.mid')
      && Math.abs(threshold[0] - mid[0]) < 1e-7
      && Math.abs(threshold[1] - mid[1]) < 1e-7;
  }
  return false;
}

function hasValidConditions(rule: AstrologyRuleRecord): boolean {
  const planet = stringCondition(rule, 'planet');
  const transitPlanet = stringCondition(rule, 'transitPlanet');
  const natalPlanet = stringCondition(rule, 'natalPlanet');
  switch (rule.kind) {
    case 'temperament_balance': {
      const metric = stringCondition(rule, 'metric');
      const operator = stringCondition(rule, 'operator');
      const threshold = rule.conditions.threshold;
      const validMetric = ['fire', 'earth', 'air', 'water', 'cardinal', 'fixed', 'mutable']
        .some((key) => metric === `temperament.${key}`);
      if (rule.domain !== 'temperament' || rule.epistemicTier !== 'INFR' || !validMetric) return false;
      if (!['gte', 'lte', 'range'].includes(operator ?? '')) return false;
      if (operator === 'range') {
        if (!Array.isArray(threshold) || threshold.length !== 2) return false;
        if (!threshold.every((item) => typeof item === 'number')) return false;
        if (threshold[0] < 0 || threshold[1] > 1 || threshold[0] > threshold[1]) return false;
      } else if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        return false;
      }
      return thresholdMatchesState(rule);
    }
    case 'temperament_profile': {
      if (rule.domain !== 'temperament' || rule.epistemicTier !== 'INFR') return false;
      const profile = stringCondition(rule, 'profile');
      const metric = stringCondition(rule, 'metric');
      const operator = stringCondition(rule, 'operator');
      const threshold = rule.conditions.threshold;
      if (profile === 'mixed_elements' || profile === 'mixed_modalities') {
        const expectedMetric = profile === 'mixed_elements'
          ? 'temperament.element.spread'
          : 'temperament.modality.spread';
        return metric === expectedMetric && operator === 'spread_lte'
          && typeof threshold === 'number' && threshold >= 0 && threshold <= 1;
      }
      return profile === 'balanced_profile' && metric === 'temperament.all'
        && operator === 'balanced_range' && Array.isArray(threshold) && threshold.length === 2
        && threshold.every((item) => typeof item === 'number')
        && threshold[0] >= 0 && threshold[1] <= 1 && threshold[0] <= threshold[1];
    }
    case 'planet_sign':
      return rule.domain === 'placement' && rule.epistemicTier === 'DOCT'
        && ASTROLOGY_RULE_PLANETS.includes(planet as typeof ASTROLOGY_RULE_PLANETS[number])
        && ASTROLOGY_RULE_SIGNS.includes(stringCondition(rule, 'sign') as typeof ASTROLOGY_RULE_SIGNS[number]);
    case 'planet_house':
      return rule.domain === 'placement' && rule.epistemicTier === 'DOCT'
        && ASTROLOGY_RULE_PLANETS.includes(planet as typeof ASTROLOGY_RULE_PLANETS[number])
        && isIntegerHouse(numberCondition(rule, 'house'));
    case 'transit_natal_pair':
      return rule.domain === 'transit_natal_aspect' && rule.epistemicTier === 'DOCT'
        && rule.payloadTemplateId === 'transit_natal_aspect'
        && ASTROLOGY_RULE_PLANETS.includes(transitPlanet as typeof ASTROLOGY_RULE_PLANETS[number])
        && ASTROLOGY_RULE_PLANETS.includes(natalPlanet as typeof ASTROLOGY_RULE_PLANETS[number]);
    case 'aspect_modifier':
      return rule.domain === 'transit_natal_aspect' && rule.epistemicTier === 'DOCT'
        && ASTROLOGY_RULE_ASPECTS.includes(stringCondition(rule, 'aspectType') as typeof ASTROLOGY_RULE_ASPECTS[number]);
    case 'transit_house':
      return rule.domain === 'transit_house' && rule.epistemicTier === 'DOCT'
        && ASTROLOGY_RULE_PLANETS.includes(transitPlanet as typeof ASTROLOGY_RULE_PLANETS[number])
        && isIntegerHouse(numberCondition(rule, 'house'));
    default:
      return false;
  }
}

function identityMatchesConditions(rule: AstrologyRuleRecord): boolean {
  switch (rule.kind) {
    case 'temperament_balance': {
      const metric = stringCondition(rule, 'metric');
      const parts = metric?.split('.') ?? [];
      if (parts.length !== 2 || parts[0] !== 'temperament') return false;
      const key = parts[1];
      const prefix = ['fire', 'earth', 'air', 'water'].includes(key)
        ? 'element'
        : ['cardinal', 'fixed', 'mutable'].includes(key) ? 'modality' : null;
      const stateByOperator: Record<string, string> = { gte: 'high', lte: 'low', range: 'mid' };
      const state = stateByOperator[stringCondition(rule, 'operator') ?? ''];
      return !!prefix && !!state && rule.ruleId === `temperament.${prefix}.${key}.${state}`;
    }
    case 'temperament_profile': {
      const profile = stringCondition(rule, 'profile');
      const metrics: Record<string, string> = {
        mixed_elements: 'temperament.element.spread',
        mixed_modalities: 'temperament.modality.spread',
        balanced_profile: 'temperament.all',
      };
      return !!profile && rule.ruleId === `temperament.profile.${profile}`
        && stringCondition(rule, 'metric') === metrics[profile];
    }
    case 'planet_sign':
      return rule.ruleId === `placement.planet.${stringCondition(rule, 'planet')}.sign.${stringCondition(rule, 'sign')}`;
    case 'planet_house':
      return rule.ruleId === `placement.planet.${stringCondition(rule, 'planet')}.house.${numberCondition(rule, 'house')}`;
    case 'transit_natal_pair':
      return rule.ruleId === `aspect.pair.transit.${stringCondition(rule, 'transitPlanet')}.natal.${stringCondition(rule, 'natalPlanet')}`;
    case 'aspect_modifier':
      return rule.ruleId === `aspect.modifier.${stringCondition(rule, 'aspectType')}`;
    case 'transit_house':
      return rule.ruleId === `transit.house.${stringCondition(rule, 'transitPlanet')}.${numberCondition(rule, 'house')}`;
    default:
      return false;
  }
}

function hasValidBindings(
  rule: AstrologyRuleRecord,
  templates: Record<string, AstrologyRulePayloadTemplate>,
  content: Record<string, string>
): boolean {
  const template = templates[rule.payloadTemplateId];
  if (!template || !isStringRecord(rule.templateBindings) || Object.keys(rule.templateBindings).length === 0) return false;
  if (!Object.values(rule.templateBindings).every((ref) => rule.contentRefs.includes(ref) && !!content[ref])) return false;
  const text = [template.experience, template.challenge, template.supportiveExpression, template.advice].join(' ');
  const placeholders = new Set(Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g), (match) => match[1]));
  const bindingKeys = new Set(Object.keys(rule.templateBindings));
  return placeholders.size === bindingKeys.size && [...placeholders].every((key) => bindingKeys.has(key));
}

function expectedRuleIds(): Set<string> {
  const ids = new Set<string>();
  for (const element of ['fire', 'earth', 'air', 'water']) {
    for (const state of ['high', 'low', 'mid']) ids.add(`temperament.element.${element}.${state}`);
  }
  for (const modality of ['cardinal', 'fixed', 'mutable']) {
    for (const state of ['high', 'low', 'mid']) ids.add(`temperament.modality.${modality}.${state}`);
  }
  for (const profile of ['mixed_elements', 'mixed_modalities', 'balanced_profile']) {
    ids.add(`temperament.profile.${profile}`);
  }
  for (const planet of ASTROLOGY_RULE_PLANETS) {
    for (const sign of ASTROLOGY_RULE_SIGNS) ids.add(`placement.planet.${planet}.sign.${sign}`);
    for (let house = 1; house <= 12; house += 1) ids.add(`placement.planet.${planet}.house.${house}`);
    for (const natalPlanet of ASTROLOGY_RULE_PLANETS) ids.add(`aspect.pair.transit.${planet}.natal.${natalPlanet}`);
    for (let house = 1; house <= 12; house += 1) ids.add(`transit.house.${planet}.${house}`);
  }
  for (const aspect of ASTROLOGY_RULE_ASPECTS) ids.add(`aspect.modifier.${aspect}`);
  return ids;
}

export function validateAstrologyRuleCatalog(catalog: AstrologyRuleCatalog): string[] {
  const failures: string[] = [];
  if (catalog.catalogId !== 'astrology_rule_v1') failures.push('catalogId không đúng.');
  if (catalog.schemaVersion !== 1) failures.push('schemaVersion không được hỗ trợ.');
  if (catalog.tradition !== 'modern_psychological') failures.push('tradition không đúng profile v1.');
  if (catalog.compatibility.zodiac !== 'tropical') failures.push('Catalog phải dùng tropical zodiac.');
  if (catalog.compatibility.houseSystem !== 'porphyry') failures.push('Catalog phải dùng hệ nhà Porphyry.');
  if (catalog.compatibility.engineVersion !== ASTRO_ENGINE_VERSION) failures.push(`Catalog không tương thích engine ${ASTRO_ENGINE_VERSION}.`);
  if (!arraysEqual(catalog.compatibility.planets, ASTROLOGY_RULE_PLANETS)) failures.push('Danh sách planets không đủ hoặc sai thứ tự.');
  if (!arraysEqual(catalog.compatibility.signs, ASTROLOGY_RULE_SIGNS)) failures.push('Danh sách signs không đủ hoặc sai thứ tự.');
  if (!arraysEqual(catalog.compatibility.houses, Array.from({ length: 12 }, (_, index) => index + 1))) failures.push('Catalog phải có 12 nhà.');
  if (!arraysEqual(catalog.compatibility.aspects, ASTROLOGY_RULE_ASPECTS)) failures.push('Catalog phải có đủ 5 góc chính theo thứ tự engine.');

  const ids = catalog.rules.map((rule) => rule.ruleId);
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const id of ids) {
    if (!id || seenIds.has(id)) duplicateIds.add(id);
    seenIds.add(id);
  }
  if (duplicateIds.size > 0) failures.push(`Rule ID rỗng hoặc trùng: ${[...duplicateIds].sort().join(', ')}.`);
  if (catalog.rules.length !== ASTROLOGY_RULE_EXPECTED_COUNT) failures.push(`Cần đúng ${ASTROLOGY_RULE_EXPECTED_COUNT} rule components; hiện có ${catalog.rules.length}.`);

  const sourceIds = catalog.sourceReferences.map((source) => source.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) failures.push('sourceId bị trùng.');
  const sourceSet = new Set(sourceIds);
  if (catalog.sourceReferences.some((source) => {
    let isHttps = false;
    try { isHttps = new URL(source.url).protocol === 'https:'; } catch { isHttps = false; }
    return !source.author || !source.title || !source.location || !isHttps;
  })) failures.push('Source reference thiếu tác giả, nhan đề, vị trí trích dẫn hoặc HTTPS URL.');

  const contentIds = Object.keys(catalog.contentLibrary).sort();
  const provenanceIds = Object.keys(catalog.contentProvenance).sort();
  if (!arraysEqual(contentIds, provenanceIds)) failures.push('contentProvenance phải phủ đúng toàn bộ contentLibrary.');
  for (const [contentId, provenance] of Object.entries(catalog.contentProvenance)) {
    if (!Array.isArray(provenance.sourceRefs) || provenance.sourceRefs.length === 0
      || provenance.sourceRefs.some((ref) => !sourceSet.has(ref))) failures.push(`${contentId}: provenance thiếu sourceRefs hợp lệ.`);
    if (!provenance.location?.trim()) failures.push(`${contentId}: provenance thiếu vị trí/chủ đề tham chiếu.`);
    if (provenance.attributionType !== 'original_paraphrase_basis') failures.push(`${contentId}: attributionType không hợp lệ.`);
    if (provenance.verificationStatus !== 'topic_mapped_page_not_verified') failures.push(`${contentId}: verificationStatus không hợp lệ.`);
  }

  const counts = Object.fromEntries(ASTROLOGY_RULE_KINDS.map((kind) => [kind, 0])) as Record<AstrologyRuleKind, number>;
  for (const rule of catalog.rules) if (rule.kind in counts) counts[rule.kind] += 1;
  for (const kind of ASTROLOGY_RULE_KINDS) {
    if (counts[kind] !== ASTROLOGY_RULE_EXPECTED_COUNTS[kind]) failures.push(`${kind} cần ${ASTROLOGY_RULE_EXPECTED_COUNTS[kind]} rule; hiện có ${counts[kind]}.`);
  }

  for (const rule of catalog.rules) {
    if (rule.version !== 1) failures.push(`${rule.ruleId}: version phải là 1.`);
    if (rule.tradition !== 'modern_psychological') failures.push(`${rule.ruleId}: tradition sai.`);
    if (!Array.isArray(rule.themes) || rule.themes.length === 0 || rule.themes.some((theme) => !theme.trim())) failures.push(`${rule.ruleId}: themes không được rỗng.`);
    if (!catalog.payloadTemplates[rule.payloadTemplateId]) failures.push(`${rule.ruleId}: thiếu payload template ${rule.payloadTemplateId}.`);
    if (!Array.isArray(rule.contentRefs) || rule.contentRefs.length === 0 || rule.contentRefs.some((ref) => !catalog.contentLibrary[ref])) failures.push(`${rule.ruleId}: contentRefs rỗng hoặc không tồn tại.`);
    if (!hasValidBindings(rule, catalog.payloadTemplates, catalog.contentLibrary)) failures.push(`${rule.ruleId}: templateBindings thiếu, thừa hoặc trỏ tới content không tồn tại.`);
    if (!Array.isArray(rule.sourceRefs) || rule.sourceRefs.length === 0 || rule.sourceRefs.some((ref) => !sourceSet.has(ref))) failures.push(`${rule.ruleId}: sourceRefs rỗng hoặc không tồn tại.`);
    if (rule.contentRefs.some((contentId) => {
      const provenance = catalog.contentProvenance[contentId];
      return !provenance || !rule.sourceRefs.every((ref) => provenance.sourceRefs.includes(ref));
    })) failures.push(`${rule.ruleId}: content provenance không bao phủ nguồn của rule.`);
    if (rule.editorialStatus !== 'original_paraphrase_review_required') failures.push(`${rule.ruleId}: editorialStatus không được bỏ qua review.`);
    const isHouseRule = rule.kind === 'planet_house' || rule.kind === 'transit_house';
    if (isHouseRule !== rule.requiresNatalContext) failures.push(`${rule.ruleId}: yêu cầu natal context không hợp lệ.`);
    if (!hasValidConditions(rule)) failures.push(`${rule.ruleId}: domain, kind hoặc conditions không hợp lệ.`);
    if (!identityMatchesConditions(rule)) failures.push(`${rule.ruleId}: ruleId không khớp kind/conditions.`);
  }

  const expectedIds = expectedRuleIds();
  const actualIds = new Set(ids);
  const missing = [...expectedIds].filter((id) => !actualIds.has(id)).sort();
  const unexpected = [...actualIds].filter((id) => !expectedIds.has(id)).sort();
  if (missing.length > 0) failures.push(`Thiếu rule IDs: ${missing.slice(0, 5).join(', ')}.`);
  if (unexpected.length > 0) failures.push(`Có rule IDs ngoài bộ v1: ${unexpected.slice(0, 5).join(', ')}.`);
  return failures;
}

export class AstrologyRuleCatalogError extends Error {
  constructor(public readonly failures: string[]) {
    super(`Catalog astrology không hợp lệ: ${failures.join(' ')}`);
    this.name = 'AstrologyRuleCatalogError';
  }
}

export function parseAstrologyRuleCatalog(value: unknown): AstrologyRuleCatalog {
  const shapeFailures = catalogShapeFailures(value);
  if (shapeFailures.length > 0) throw new AstrologyRuleCatalogError(shapeFailures);
  const catalog = value as unknown as AstrologyRuleCatalog;
  let failures: string[];
  try {
    failures = validateAstrologyRuleCatalog(catalog);
  } catch {
    throw new AstrologyRuleCatalogError(['Catalog không đúng schema chi tiết.']);
  }
  if (failures.length > 0) throw new AstrologyRuleCatalogError(failures);
  return catalog;
}

let bundledCatalog: AstrologyRuleCatalog | null | undefined;

export function getBundledAstrologyRuleCatalog(): AstrologyRuleCatalog | null {
  if (bundledCatalog !== undefined) return bundledCatalog;
  try {
    bundledCatalog = parseAstrologyRuleCatalog(rawCatalog as unknown);
  } catch {
    bundledCatalog = null;
  }
  return bundledCatalog;
}
