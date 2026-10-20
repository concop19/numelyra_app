import {
  ASTROLOGY_RULE_EXPECTED_COUNTS,
  AstrologyRuleCatalogError,
  getBundledAstrologyRuleCatalog,
  parseAstrologyRuleCatalog,
  validateAstrologyRuleCatalog,
  type AstrologyRuleCatalog,
} from '../astrologyRuleCatalog';

function catalogCopy(): AstrologyRuleCatalog {
  const catalog = getBundledAstrologyRuleCatalog();
  if (!catalog) throw new Error('Bundled astrology catalog must be valid.');
  return JSON.parse(JSON.stringify(catalog)) as AstrologyRuleCatalog;
}

describe('AstrologyRuleCatalog', () => {
  it('loads all expected rules with valid coverage and references', () => {
    const catalog = catalogCopy();
    expect(catalog.rules).toHaveLength(489);
    expect(validateAstrologyRuleCatalog(catalog)).toEqual([]);
    const counts = Object.fromEntries(
      Object.keys(ASTROLOGY_RULE_EXPECTED_COUNTS).map((kind) => [
        kind,
        catalog.rules.filter((rule) => rule.kind === kind).length,
      ])
    );
    expect(counts).toEqual(ASTROLOGY_RULE_EXPECTED_COUNTS);
    expect(Object.keys(catalog.contentProvenance).sort())
      .toEqual(Object.keys(catalog.contentLibrary).sort());
  });

  it('requires reliable natal context for every house rule only', () => {
    const catalog = catalogCopy();
    const houseRules = catalog.rules.filter(
      (rule) => rule.kind === 'planet_house' || rule.kind === 'transit_house'
    );
    expect(houseRules).toHaveLength(240);
    expect(houseRules.every((rule) => rule.requiresNatalContext)).toBe(true);
    expect(catalog.rules.filter((rule) => !houseRules.includes(rule))
      .every((rule) => !rule.requiresNatalContext)).toBe(true);
  });

  it('rejects broken content references, bindings, thresholds, and provenance', () => {
    const missingContent = catalogCopy();
    missingContent.rules[0].contentRefs[0] = 'content.reference.missing';
    expect(validateAstrologyRuleCatalog(missingContent).some((item) => item.includes('contentRefs'))).toBe(true);

    const missingBinding = catalogCopy();
    missingBinding.rules[0].templateBindings = {};
    expect(validateAstrologyRuleCatalog(missingBinding).some((item) => item.includes('templateBindings'))).toBe(true);

    const invalidThreshold = catalogCopy();
    const thresholdRule = invalidThreshold.rules.find(
      (rule) => rule.ruleId === 'temperament.element.fire.high'
    )!;
    thresholdRule.conditions.threshold = 0.1;
    expect(validateAstrologyRuleCatalog(invalidThreshold)
      .some((item) => item.includes('conditions không hợp lệ'))).toBe(true);

    const missingProvenance = catalogCopy();
    delete missingProvenance.contentProvenance['planet.Sun.core'];
    expect(validateAstrologyRuleCatalog(missingProvenance)
      .some((item) => item.includes('contentProvenance'))).toBe(true);
  });

  it('reports duplicate sources and an out-of-range house without crashing', () => {
    const duplicateSource = catalogCopy();
    duplicateSource.sourceReferences.push({ ...duplicateSource.sourceReferences[0] });
    expect(validateAstrologyRuleCatalog(duplicateSource).some((item) => item.includes('sourceId bị trùng'))).toBe(true);

    const invalidHouse = catalogCopy();
    const houseRule = invalidHouse.rules.find(
      (rule) => rule.ruleId === 'placement.planet.Sun.house.1'
    )!;
    houseRule.conditions.house = 1e100;
    expect(validateAstrologyRuleCatalog(invalidHouse)
      .some((item) => item.includes('conditions không hợp lệ'))).toBe(true);
  });

  it('rejects malformed catalog input', () => {
    expect(() => parseAstrologyRuleCatalog({})).toThrow(AstrologyRuleCatalogError);

    const malformedRule = catalogCopy() as unknown as Record<string, unknown>;
    malformedRule.rules = [{}];
    expect(() => parseAstrologyRuleCatalog(malformedRule)).toThrow(AstrologyRuleCatalogError);
  });
});
