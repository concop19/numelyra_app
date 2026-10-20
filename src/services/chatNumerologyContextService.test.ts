import {
  isChatContextIndicator,
  getChatIndicatorName,
  getConciseIndicatorMeaning,
  getConciseIndicatorReading,
  type ChatIndicatorKey,
} from './chatNumerologyContextService';

describe('chatNumerologyContextService', () => {
  const expectedKeys: ChatIndicatorKey[] = [
    'walksOfLife',
    'mission',
    'soul',
    'personality',
    'dateOfBirth',
    'mature',
    'rationalThinking',
    'yearIndividual',
    'attitude',
  ];

  it('correctly identifies all 9 chat indicator keys', () => {
    for (const key of expectedKeys) {
      expect(isChatContextIndicator(key)).toBe(true);
      expect(getChatIndicatorName(key)).toBeDefined();
    }
    expect(isChatContextIndicator('karmicDebts')).toBe(false);
    expect(isChatContextIndicator('arrows')).toBe(false);
    expect(isChatContextIndicator('balance')).toBe(false);
  });

  it('retrieves concise meaning for life path values 1-9, 11, 22', () => {
    const testValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22];
    for (const val of testValues) {
      const meaning = getConciseIndicatorMeaning('walksOfLife', val);
      expect(meaning).toBeDefined();
      expect(typeof meaning).toBe('string');
      expect(meaning!.length).toBeGreaterThan(15);
    }
  });

  it('retrieves master values 33 for mission, soul, mature', () => {
    expect(getConciseIndicatorMeaning('mission', 33)).toContain('chữa lành');
    expect(getConciseIndicatorMeaning('soul', 33)).toContain('tình thương vô điều kiện');
    expect(getConciseIndicatorMeaning('mature', 33)).toContain('chữa lành');
  });

  it('formats into KnowledgeReadingResult compatible with detail modals without DB access', () => {
    const reading = getConciseIndicatorReading('walksOfLife', 7, 'Số Đường Đời');
    expect(reading).not.toBeNull();
    expect(reading!.title).toBe('Đường Đời 7');
    expect(reading!.source).toBe('offline-archetype');
    expect(reading!.overview).toContain('chiêm nghiệm');
    expect(reading!.strengths).toEqual([]);
    expect(reading!.challenges).toEqual([]);
    expect(reading!.fullContent).toBe(reading!.overview);
  });

  it('returns undefined / null for unknown values safely', () => {
    expect(getConciseIndicatorMeaning('walksOfLife', 99)).toBeUndefined();
    expect(getConciseIndicatorReading('walksOfLife', 99)).toBeNull();
    expect(getConciseIndicatorMeaning('nonExistentKey', 1)).toBeUndefined();
  });
});
