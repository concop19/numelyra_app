import {
  createColorGuidance,
  elementFromLunarYear,
  tarotElementFromCardId,
} from './colorGuidanceService';
import { evaluateAgentDecision } from './agentDecisionEngine';

describe('color guidance', () => {
  it('uses the lunar year across the 1996 Tet boundary', () => {
    expect(createColorGuidance('1996-02-18', { card: { id: 'wands-01' } }).lunarYear).toBe(1995);
    expect(createColorGuidance('1996-02-19', { card: { id: 'wands-01' } }).lunarYear).toBe(1996);
  });

  it('maps every final digit to the agreed element', () => {
    expect([0, 1].map((digit) => elementFromLunarYear(2000 + digit))).toEqual(['Kim', 'Kim']);
    expect([2, 3].map((digit) => elementFromLunarYear(2000 + digit))).toEqual(['Thủy', 'Thủy']);
    expect([4, 5].map((digit) => elementFromLunarYear(2000 + digit))).toEqual(['Mộc', 'Mộc']);
    expect([6, 7].map((digit) => elementFromLunarYear(2000 + digit))).toEqual(['Hỏa', 'Hỏa']);
    expect([8, 9].map((digit) => elementFromLunarYear(2000 + digit))).toEqual(['Thổ', 'Thổ']);
  });

  it('uses the fixed suit and every major arcana mapping', () => {
    expect(tarotElementFromCardId('wands-01')).toBe('fire');
    expect(tarotElementFromCardId('cups-01')).toBe('water');
    expect(tarotElementFromCardId('swords-01')).toBe('air');
    expect(tarotElementFromCardId('pentacles-01')).toBe('earth');
    const expectedMajors: Record<string, string> = {
      '0-fool': 'air', '1-magician': 'air', '2-high-priestess': 'water', '3-empress': 'earth',
      '4-emperor': 'fire', '5-hierophant': 'earth', '6-lovers': 'air', '7-chariot': 'water',
      '8-strength': 'fire', '9-hermit': 'earth', '10-wheel-of-fortune': 'fire', '11-justice': 'air',
      '12-hanged-man': 'water', '13-death': 'water', '14-temperance': 'fire', '15-devil': 'earth',
      '16-tower': 'fire', '17-star': 'air', '18-moon': 'water', '19-sun': 'fire',
      '20-judgement': 'fire', '21-world': 'earth',
    };
    Object.entries(expectedMajors).forEach(([cardId, element]) => {
      expect(tarotElementFromCardId(cardId)).toBe(element);
    });
  });

  it('returns five colors and two distinct, palette-contained priorities for both orientations', () => {
    const upright = createColorGuidance('1996-02-19', { card: { id: 'wands-01' }, isReversed: false });
    const reversed = createColorGuidance('1996-02-19', { card: { id: 'wands-01' }, isReversed: true });
    const paletteIds = upright.palette.map((color) => color.id);

    expect(upright.palette).toHaveLength(5);
    expect(new Set(upright.selectedColorIds).size).toBe(2);
    expect(upright.selectedColorIds.every((id) => paletteIds.includes(id))).toBe(true);
    expect(reversed.selectedColorIds).not.toEqual(upright.selectedColorIds);
  });

  it('routes color questions to one Tarot card without numerology indicators', () => {
    const decision = evaluateAgentDecision('Ngày mai tôi nên mặc màu gì?', [{
      id: 'test', fullName: 'Người thử', birthDate: '1996-02-19'
    }]);
    expect(decision).toMatchObject({
      intent: 'color_guidance', needsTarot: true, spreadId: 'single', cardCount: 1, targetIndicators: []
    });
  });
});
