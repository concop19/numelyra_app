import {
  TAROT_DECK,
  TAROT_SPREADS,
  drawCardsForSpread,
  getTarotCardName,
  getTarotMeaning,
  getTarotPositionDescription,
  getTarotPositionName,
  getTarotSpreadName,
  normalizeDrawnCardPayload,
} from './tarotService';
import { getTarotCardImage } from './tarotAssets';

describe('bilingual Tarot catalog', () => {
  it('contains 78 unique, fully localized cards', () => {
    expect(TAROT_DECK).toHaveLength(78);
    expect(new Set(TAROT_DECK.map((card) => card.id)).size).toBe(78);
    for (const card of TAROT_DECK) {
      expect(getTarotCardName(card, 'vi')).toBeTruthy();
      expect(getTarotCardName(card, 'en')).toBeTruthy();
      expect(card.keywordsUprightEn.length).toBeGreaterThanOrEqual(3);
      expect(card.keywordsReversedEn.length).toBeGreaterThanOrEqual(3);
      expect(getTarotMeaning(card, false, 'en').length).toBeGreaterThan(40);
      expect(getTarotMeaning(card, true, 'en').length).toBeGreaterThan(40);
      expect(getTarotCardImage(card.id)).toBeTruthy();
    }
  });

  it('localizes all four spreads and every stable position', () => {
    expect(Object.keys(TAROT_SPREADS)).toHaveLength(4);
    for (const spread of Object.values(TAROT_SPREADS)) {
      expect(getTarotSpreadName(spread, 'vi')).toBeTruthy();
      expect(getTarotSpreadName(spread, 'en')).toBeTruthy();
      for (const position of spread.positions) {
        expect(getTarotPositionName(position, 'en')).toBeTruthy();
        expect(getTarotPositionDescription(position, 'en')).toBeTruthy();
      }
    }
  });

  it('writes locale metadata and upgrades legacy payloads without changing ids', () => {
    const drawn = drawCardsForSpread('three-card', 'en');
    expect(drawn).toHaveLength(3);
    expect(drawn.every((item) => item.schemaVersion === 2 && item.localeAtCreation === 'en')).toBe(true);

    const legacy = { ...drawn[0], schemaVersion: undefined, localeAtCreation: undefined };
    const normalized = normalizeDrawnCardPayload(legacy, 'vi');
    expect(normalized.card.id).toBe(legacy.card.id);
    expect(normalized.position.id).toBe(legacy.position.id);
    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.localeAtCreation).toBe('vi');
  });
});
