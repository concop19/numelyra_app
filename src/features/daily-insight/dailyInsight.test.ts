import {
  buildDailyInsight,
  buildDailyLuckyColor,
  chooseLuckyAwakeHour,
  getDailyInsightCacheKey,
  getLuckyColorForMoonSign,
  LUCKY_COLOR_PALETTE,
  LUCKY_COLOR_VERSION,
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
  test('maps all twelve signs to two localized colors while preserving the twelve original swatches', () => {
    const originalSwatches = [
      '#EF4444', '#F3E6C8', '#65C466', '#C5CED8', '#F59E0B', '#7A8B3A',
      '#F29BC2', '#7F1D3F', '#F4C542', '#4B5563', '#315C9B', '#7CC7D9',
    ];
    expect(Object.keys(MOON_SIGN_LUCKY_COLORS)).toHaveLength(12);
    expect(LUCKY_COLOR_PALETTE).toHaveLength(24);
    expect(new Set(LUCKY_COLOR_PALETTE.map((color) => color.id)).size).toBe(24);
    expect(new Set(LUCKY_COLOR_PALETTE.map((color) => color.swatchHex)).size).toBe(24);
    expect(new Set(LUCKY_COLOR_PALETTE.map((color) => color.colorName.vi)).size).toBe(24);
    expect(new Set(LUCKY_COLOR_PALETTE.map((color) => color.colorName.en)).size).toBe(24);
    expect(LUCKY_COLOR_PALETTE.filter((color) => color.variant === 'primary').map((color) => color.swatchHex))
      .toEqual(originalSwatches);
    expect(getLuckyColorForMoonSign('Aries', 'vi', 'primary')).toMatchObject({ name: 'Đỏ tươi', swatchHex: '#EF4444' });
    expect(getLuckyColorForMoonSign('Aries', 'en', 'companion')).toMatchObject({ name: 'Ruby red', swatchHex: '#B91C3C' });
  });

  test('keeps every lucky-color text tone readable on the mint card', () => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const background = luminance('#F3FBF7');
    for (const color of LUCKY_COLOR_PALETTE) {
      const foreground = luminance(color.textHex);
      const contrast = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('anchors the personalized lucky color at local noon for the whole calendar day', () => {
    const profile = { fullName: 'Test User', birthDate: '1998-06-15', gender: 'female' as const };
    const early = new Date(2026, 9, 23, 0, 1);
    const late = new Date(2026, 9, 23, 23, 59);
    expect(buildDailyLuckyColor(profile, early, 'vi')).toEqual(buildDailyLuckyColor(profile, late, 'vi'));
  });

  test('uses natal phase to personalize the same transit day across profiles', () => {
    const date = new Date(2026, 9, 1, 12);
    const first = buildDailyLuckyColor(
      { fullName: 'First', birthDate: '1998-06-15', gender: 'female' },
      date,
      'vi',
    );
    const second = buildDailyLuckyColor(
      { fullName: 'Second', birthDate: '1990-01-01', gender: 'male' },
      date,
      'vi',
    );
    expect(first.id).not.toBe(second.id);
    expect(first.basis.transitMoonSign).toBe(second.basis.transitMoonSign);
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
    expect(vi.luckyColor.id).toBe(en.luckyColor.id);
    expect(vi.luckyColor.name).not.toBe(en.luckyColor.name);
    expect(vi.luckyColor.basis).toEqual(en.luckyColor.basis);
    expect(vi.luckyColor.basis.version).toBe(LUCKY_COLOR_VERSION);
    expect(vi.luckyColor.evidence).toContain('Mặt Trăng');
    expect(vi.astroDataQuality).toEqual({
      isEstimated: true,
      missingBirthTime: true,
      missingBirthLocation: true,
    });
    expect(getDailyInsightCacheKey(vi)).toContain('@numelyra:daily-insight:v5:');
  });

  test('marks exact birth time plus resolved place as complete astrology data', () => {
    const insight = buildDailyInsight({
      fullName: 'Complete Profile',
      birthDate: '1998-06-15',
      birthTime: '14:30',
      birthTimeAccuracy: 'exact',
      gender: 'female',
      birthLocation: {
        placeId: 'hanoi',
        userLabel: 'Hà Nội, Việt Nam',
        latitude: 21.0278,
        longitude: 105.8342,
        timeZoneIdentifier: 'Asia/Bangkok',
        resolvedAt: '2026-01-01T00:00:00.000Z',
      },
    }, new Date(2026, 1, 17, 12), 'vi');
    expect(insight.astroDataQuality).toEqual({
      isEstimated: false,
      missingBirthTime: false,
      missingBirthLocation: false,
    });
    expect(insight.luckyColor.basis.precision).toBe('complete');
  });

  test('rejects a cached v4 insight after the 24-color schema upgrade', async () => {
    const insight = buildDailyInsight(
      { fullName: 'Cache Test', birthDate: '1998-06-15', gender: 'female' },
      new Date(2026, 1, 17, 12),
      'vi',
    );
    const storage = {
      getItem: jest.fn(async () => JSON.stringify({
        ...insight,
        engineVersion: 'daily-insight-v4:legacy',
        luckyColor: { name: 'Silver', hex: '#C5CED8' },
      })),
      setItem: jest.fn(async () => undefined),
    };

    await expect(readCachedDailyInsight(storage, insight)).resolves.toBeNull();
    expect(storage.getItem).toHaveBeenCalledWith(expect.stringContaining('@numelyra:daily-insight:v5:'));
  });

  test('accepts a complete v5 cached insight', async () => {
    const insight = buildDailyInsight(
      { fullName: 'Cache Test', birthDate: '1998-06-15', gender: 'female' },
      new Date(2026, 1, 17, 12),
      'vi',
    );
    const storage = {
      getItem: jest.fn(async () => JSON.stringify(insight)),
      setItem: jest.fn(async () => undefined),
    };
    await expect(readCachedDailyInsight(storage, insight)).resolves.toMatchObject({
      dateKey: insight.dateKey,
      luckyColor: { id: insight.luckyColor.id, basis: { version: LUCKY_COLOR_VERSION } },
      astroDataQuality: insight.astroDataQuality,
    });
  });

  test('keeps one day deterministic while varying the energy rhythm across a month', () => {
    const profile = { fullName: 'Test User', birthDate: '1998-06-15', gender: 'female' as const };
    const dates = Array.from({ length: 31 }, (_, index) => new Date(2026, 9, index + 1, 12));
    const insights = dates.map((date) => buildDailyInsight(profile, date, 'vi'));
    const rhythms = insights.map((insight) => insight.personality);
    const colors = insights.map((insight) => insight.luckyColor.id);
    const metricFingerprints = insights.map((insight) => (
      Object.values(insight.astroMetrics.metrics).map(({ score }) => score).join('|')
    ));

    expect(buildDailyInsight(profile, dates[0], 'vi').personality).toBe(rhythms[0]);
    expect(new Set(rhythms).size).toBeGreaterThanOrEqual(10);
    expect(new Set(colors).size).toBeGreaterThanOrEqual(22);
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
    expect(longestColorRun).toBeLessThanOrEqual(2);
  });
});
