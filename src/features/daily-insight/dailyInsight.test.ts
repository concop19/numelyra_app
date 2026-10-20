import { buildDailyInsight, chooseLuckyAwakeHour } from './dailyInsight';
import type { HourInfo } from '../../services/lunarService';

const hour = (startHour: number, overrides: Partial<HourInfo> = {}): HourInfo => ({
  name: 'Thìn', canChi: 'Canh Thìn', range: `${startHour}h-${startHour + 2}h`, startHour,
  isHoangDao: true, isClash: false, isDayClash: false, label: 'Thanh Long',
  lyThuanPhong: 'Tốc Hỷ', isLyThuanPhongGood: true, ...overrides,
});

describe('dailyInsight', () => {
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
  });
});
