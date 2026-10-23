import {
  buildDailyInsight,
  buildDailyLuckyColor,
  chooseLuckyAwakeHour,
  getDailyInsightCacheKey,
  getLuckyColorForMoonSign,
  MOON_SIGN_LUCKY_COLORS,
  readCachedDailyInsight,
} from './dailyInsight';
import type { HourInfo } from '../../services/lunarService';

const hour = (startHour: number, overrides: Partial<HourInfo> = {}): HourInfo => ({
  name: 'Thìn', canChi: 'Canh Thìn', range: `${startHour}h-${startHour + 2}h`, startHour,
  isHoangDao: true, isClash: false, isDayClash: false, label: 'Thanh Long',
  lyThuanPhong: 'Tốc Hỷ', isLyThuanPhongGood: true, ...overrides,
});

describe('dailyInsight', () => {
  test('maps all twelve tropical Moon signs to localized lucky colors', () => {
    const expected = [
      ['Aries', 'Đỏ tươi', 'Bright red', '#EF4444'],
      ['Taurus', 'Trắng ngà', 'Ivory', '#F3E6C8'],
      ['Gemini', 'Xanh lá sáng', 'Bright green', '#65C466'],
      ['Cancer', 'Bạc', 'Silver', '#C5CED8'],
      ['Leo', 'Cam', 'Orange', '#F59E0B'],
      ['Virgo', 'Xanh olive', 'Olive green', '#7A8B3A'],
      ['Libra', 'Hồng phấn', 'Blush pink', '#F29BC2'],
      ['Scorpio', 'Đỏ rượu', 'Burgundy', '#7F1D3F'],
      ['Sagittarius', 'Vàng', 'Yellow', '#F4C542'],
      ['Capricorn', 'Xám than', 'Charcoal gray', '#4B5563'],
      ['Aquarius', 'Xanh dương đậm', 'Deep blue', '#315C9B'],
      ['Pisces', 'Xanh biển nhạt', 'Light sea blue', '#7CC7D9'],
    ] as const;

    expect(Object.keys(MOON_SIGN_LUCKY_COLORS)).toHaveLength(12);
    for (const [sign, viName, enName, hex] of expected) {
      expect(getLuckyColorForMoonSign(sign, 'vi')).toMatchObject({ moonSign: sign, name: viName, hex });
      expect(getLuckyColorForMoonSign(sign, 'en')).toMatchObject({ moonSign: sign, name: enName, hex });
    }
  });

  test('anchors the lucky color at local noon for the whole calendar day', () => {
    const early = new Date(2026, 9, 23, 0, 1);
    const late = new Date(2026, 9, 23, 23, 59);
    expect(buildDailyLuckyColor(early, 'vi')).toEqual(buildDailyLuckyColor(late, 'vi'));
  });

  test('chooses a strong awake hour and excludes clashes and overnight windows', () => {
    const result = chooseLuckyAwakeHour([
      hour(1), hour(7, { isClash: true }), hour(9, { isDayClash: true }), hour(11), hour(23),
    ]);
    expect(result?.startHour).toBe(11);
  });

  test('combines deterministic astrology and Can Chi data in both locales', () => {
    const profile = { fullName: 'Test User', birthDate: '1998-06-15', gender: 'female' as const };
    const date = new Date(2026, 1, 17, 8);
    const vi = buildDailyInsight(profile, date, 'vi');
    const en = buildDailyInsight(profile, date, 'en');
    expect(vi.dateKey).toBe('2026-02-17');
    expect(vi.canChiDay).toBe('Nhâm Tuất');
    expect(vi.luckyTime?.startHour).toBeGreaterThanOrEqual(7);
    expect(vi.luckyTime?.startHour).toBeLessThan(22);
    expect(en.directions.joy).not.toBe(vi.directions.joy);
    expect(en.suggestedQuestions[0]).toContain('today');
    expect(Object.keys(vi.astroMetrics.metrics)).toEqual(['energy', 'emotion', 'focus', 'connection']);
    expect(vi.astroMetrics.confidence).toBe('estimated');
    expect(Object.values(vi.astroMetrics.metrics).every(({ score }) => score >= 15 && score <= 85)).toBe(true);
    expect(vi.luckyColor.moonSign).toBe(en.luckyColor.moonSign);
    expect(vi.luckyColor.name).not.toBe(en.luckyColor.name);
    expect(vi.luckyColor.evidence).toContain(vi.luckyColor.moonSignLabel);
    expect(getDailyInsightCacheKey(vi)).toContain('@numelyra:daily-insight:v4:');
  });

  test('rejects a cached v3 insight after the lucky-color schema upgrade', async () => {
    const insight = buildDailyInsight(
      { fullName: 'Cache Test', birthDate: '1998-06-15', gender: 'female' },
      new Date(2026, 1, 17, 12),
      'vi',
    );
    const storage = {
      getItem: jest.fn(async () => JSON.stringify({ ...insight, engineVersion: 'daily-insight-v3:legacy' })),
      setItem: jest.fn(async () => undefined),
    };

    await expect(readCachedDailyInsight(storage, insight)).resolves.toBeNull();
    expect(storage.getItem).toHaveBeenCalledWith(expect.stringContaining('@numelyra:daily-insight:v4:'));
  });

  test('keeps one day deterministic while varying the energy rhythm across a month', () => {
    const profile = { fullName: 'Test User', birthDate: '1998-06-15', gender: 'female' as const };
    const dates = Array.from({ length: 31 }, (_, index) => new Date(2026, 9, index + 1, 12));
    const insights = dates.map((date) => buildDailyInsight(profile, date, 'vi'));
    const rhythms = insights.map((insight) => insight.personality);
    const colors = insights.map((insight) => insight.luckyColor.hex);
    const metricFingerprints = insights.map((insight) => (
      Object.values(insight.astroMetrics.metrics).map(({ score }) => score).join('|')
    ));

    expect(buildDailyInsight(profile, dates[0], 'vi').personality).toBe(rhythms[0]);
    expect(new Set(rhythms).size).toBeGreaterThanOrEqual(10);
    expect(new Set(colors).size).toBeGreaterThanOrEqual(10);
    expect(new Set(metricFingerprints).size).toBeGreaterThanOrEqual(5);
    expect(insights.every((insight) => (
      Object.values(insight.astroMetrics.metrics).every(({ score }) => score >= 15 && score <= 85)
    ))).toBe(true);

    let longestRepeatedRun = 1;
    let currentRun = 1;
    for (let index = 1; index < rhythms.length; index += 1) {
      currentRun = rhythms[index] === rhythms[index - 1] ? currentRun + 1 : 1;
      longestRepeatedRun = Math.max(longestRepeatedRun, currentRun);
    }
    expect(longestRepeatedRun).toBeLessThanOrEqual(3);

    let longestColorRun = 1;
    let currentColorRun = 1;
    for (let index = 1; index < colors.length; index += 1) {
      currentColorRun = colors[index] === colors[index - 1] ? currentColorRun + 1 : 1;
      longestColorRun = Math.max(longestColorRun, currentColorRun);
    }
    expect(longestColorRun).toBeLessThanOrEqual(3);
  });
});
