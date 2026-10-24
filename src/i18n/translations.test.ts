import { translations } from './translations';

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
}

describe('translation catalog', () => {
  it('keeps Vietnamese and English keys in exact parity', () => {
    expect(Object.keys(translations.en).sort()).toEqual(Object.keys(translations.vi).sort());
  });

  it('keeps placeholders in parity for every key', () => {
    for (const key of Object.keys(translations.vi) as Array<keyof typeof translations.vi>) {
      expect(placeholders(translations.en[key])).toEqual(placeholders(translations.vi[key]));
    }
  });
});
