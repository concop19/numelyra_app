import manifest from '../data/numerologyKnowledgeManifest.json';
import { isKnowledgeCatalogValid, type KnowledgeCatalogRecord } from './numerologyCatalogValidation';
import { formatIndicatorDisplayValue, formatIndicatorValue } from './numerologyPresentation';
import type { CalculatedIndicator } from './numerologyEngine';

function validCatalog(): KnowledgeCatalogRecord[] {
  return ['vi', 'en'].flatMap((locale) => Object.entries(manifest.revisions).map(([key, revision]) => {
    const [indicator_key, number_value] = key.split('|');
    return { indicator_key, number_value, locale, source_revision: revision, review_status: 'approved',
      reviewed_by: 'test-reviewer', title: 'A reviewed title', content: 'A reviewed interpretation. '.repeat(6) };
  }));
}

describe('bundled catalog startup validation', () => {
  it('accepts the exact approved bilingual contract', () => {
    expect(isKnowledgeCatalogValid(validCatalog())).toBe(true);
  });

  it.each([
    { review_status: 'draft' }, { source_revision: 'stale' }, { reviewed_by: '' },
    { indicator_key: 'legacy' }, { number_value: '999' }, { locale: 'fr' }, { content: '' },
  ])('rejects a same-sized but invalid catalog: %j', (change) => {
    const rows = validCatalog();
    rows[0] = { ...rows[0], ...change };
    expect(isKnowledgeCatalogValid(rows)).toBe(false);
  });

  it('rejects duplicate keys that conceal a missing state', () => {
    const rows = validCatalog();
    rows[0] = { ...rows[1] };
    expect(isKnowledgeCatalogValid(rows)).toBe(false);
    expect(isKnowledgeCatalogValid(rows.slice(1))).toBe(false);
  });
});

describe('indicator presentation', () => {
  it('localizes special results without changing calculation values', () => {
    expect(formatIndicatorValue('Không thiếu', 'en')).toBe('No missing numbers');
    expect(formatIndicatorValue('Không có nợ nghiệp', 'en')).toBe('No karmic debt');
    expect(formatIndicatorValue('13/4, 16/7', 'en')).toBe('13/4, 16/7');
    expect(formatIndicatorValue('Không thiếu', 'vi')).toBe('Không thiếu');
    const chart = { key: 'arrows', chartData: { counts: {} } } as CalculatedIndicator;
    expect(formatIndicatorDisplayValue(chart, 'en')).toBe('8 states');
    expect(formatIndicatorDisplayValue({ ...chart, key: 'nameChart' }, 'en')).toBe('3×3 matrix');
  });
});
