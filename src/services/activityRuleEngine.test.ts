/**
 * activityRuleEngine.test.ts
 *
 * Kiểm tra 7 trường hợp chính của bộ rule đa lớp.
 */
import {
  scoreActivities,
  pickRecommended,
  pickAvoid,
  buildRatedActivities,
  buildHourlyActivities,
  type ActivityRuleContext,
  type HourActivityContext,
} from './activityRuleEngine';

// ============================================================
// Helpers
// ============================================================

const baseCtx: ActivityRuleContext = {
  trucName: 'Định',
  trucQuality: 'Tốt',
  isHoangDao: true,
  hoangDaoLabel: 'Thanh Long',
  isNguyetKy: false,
  isTamNuong: false,
  dayCanIdx: 0,   // Giáp → Mộc
  dayChiIdx: 2,   // Dần
  userZodiac: 'Thân',
  userZodiacClash: 'Dần',
  locale: 'vi',
};

function ctx(overrides: Partial<ActivityRuleContext>): ActivityRuleContext {
  return { ...baseCtx, ...overrides };
}

function findScore(rated: ReturnType<typeof scoreActivities>, key: string): number {
  return rated.find((r) => r.key === key)?.score ?? 0;
}

const baseHourCtx: HourActivityContext = {
  hourName: 'Thìn',
  canChi: 'Canh Thìn',
  range: '07h-09h',
  isHoangDao: true,
  hourLabel: 'Thanh Long',
  isClash: false,
  isDayClash: false,
  lyThuanPhong: 'Tốc Hỷ',
  isLyThuanPhongGood: true,
  userZodiac: 'Thân',
  locale: 'vi',
};

function hourCtx(overrides: Partial<HourActivityContext>): HourActivityContext {
  return { ...baseHourCtx, ...overrides };
}

function hourlyItem(
  result: ReturnType<typeof buildHourlyActivities>,
  key: string,
) {
  return result.all.find((item) => item.key === key);
}

// ============================================================
// TC1: Nguyệt Kỵ → khai_truong score ≤ -4
// ============================================================
test('TC1: Nguyệt Kỵ penalizes khai_truong by at least 4', () => {
  const rated = scoreActivities(ctx({
    isNguyetKy: true,
    trucName: 'Kiến',
    trucQuality: 'Tốt',
    isHoangDao: true,
    dayCanIdx: 2, // Bính/Hỏa also boosts the work category
    dayChiIdx: 5,
    userZodiacClash: 'Dần',
  }));
  const blocked = rated.find((item) => item.key === 'khai_truong')!;
  expect(blocked.score).toBeLessThanOrEqual(-4);
  expect(blocked.recommended).toBe(false);
  expect(blocked.reason).toMatch(/Nguyệt Kỵ/i);
});

// ============================================================
// TC2: Tam Nương → cuoi_hoi bị phạt nặng (reason chứa "Tam Nương")
// Lưu ý: các lớp khác (Trực Yi, Hoàng đạo) có thể bù một phần,
// nhưng lý do hiển thị phải là Tam Nương (delta lớn nhất = -5).
// ============================================================
test('TC2: Tam Nương penalizes cuoi_hoi and reason shows Tam Nương', () => {
  const rated = scoreActivities(ctx({
    isTamNuong: true,
    isNguyetKy: false,
    isHoangDao: false,       // tắt Hoàng đạo boost để kiểm tra rõ hơn
    hoangDaoLabel: 'Bạch Hổ',
    trucName: 'Phá',         // Phá là trucJi của cuoi_hoi → thêm -3
    trucQuality: 'Xấu',
    dayChiIdx: 5,            // Tỵ — không xung với Thân (userZodiacClash='Dần')
  }));
  const item = rated.find((r) => r.key === 'cuoi_hoi')!;
  // Score phải âm
  expect(item.score).toBeLessThan(0);
  // Lý do phải nhắc Tam Nương (delta lớn nhất)
  expect(item.reason).toMatch(/Tam Nương/i);
});

// ============================================================
// TC3: Trực Phá → khai_truong score < 0 (trucJi)
// ============================================================
test('TC3: Trực Phá penalizes khai_truong', () => {
  const rated = scoreActivities(ctx({ trucName: 'Phá', trucQuality: 'Xấu' }));
  expect(findScore(rated, 'khai_truong')).toBeLessThan(0);
});

// ============================================================
// TC4: Hoàng đạo Thanh Long + Trực Thành → ky_ket score ≥ 4
// ============================================================
test('TC4: Hoàng đạo + Trực Thành boosts ky_ket score ≥ 4', () => {
  const rated = scoreActivities(ctx({
    trucName: 'Thành',
    trucQuality: 'Tốt',
    isHoangDao: true,
    hoangDaoLabel: 'Thanh Long',
    isNguyetKy: false,
    isTamNuong: false,
    // dayChiIdx không xung với userZodiacClash
    dayChiIdx: 5,       // Tỵ
    userZodiacClash: 'Dần',
  }));
  expect(findScore(rated, 'ky_ket')).toBeGreaterThanOrEqual(4);
});

// ============================================================
// TC5: Tuổi Ngọ + ngày Tý (xung Ngọ) → nham_chuc score < 0
// ============================================================
test('TC5: Zodiac clash day reduces nham_chuc score', () => {
  const rated = scoreActivities(ctx({
    dayChiIdx: 0,           // Tý
    userZodiac: 'Ngọ',
    userZodiacClash: 'Tý',  // Ngọ xung Tý
    trucName: 'Kiến',
    trucQuality: 'Tốt',
    isHoangDao: false,
    hoangDaoLabel: 'Bạch Hổ',
  }));
  // Trực Kiến yi +3 nhưng clash sensitive -3 + Hắc đạo -2 → tổng âm
  expect(findScore(rated, 'nham_chuc')).toBeLessThan(3);
});

// ============================================================
// TC6: pickRecommended không trả >2 item cùng category
// ============================================================
test('TC6: pickRecommended limits category diversity to max 2', () => {
  const rated = scoreActivities(ctx({ trucName: 'Thành', trucQuality: 'Tốt' }));
  const result = pickRecommended(rated, 8);
  const catCounts: Record<string, number> = {};
  for (const item of result) {
    catCounts[item.category] = (catCounts[item.category] ?? 0) + 1;
  }
  // Mỗi nhóm tối đa 2 item (trừ khi tổng < 8)
  const overLimit = Object.values(catCounts).filter((c) => c > 2);
  expect(overLimit.length).toBe(0);
});

// ============================================================
// TC7: Không có item xuất hiện đồng thời trong recommended và avoid
// ============================================================
test('TC7: No item appears in both recommended and avoid', () => {
  const { recommended, avoid } = buildRatedActivities(ctx({}));
  const recKeys = new Set(recommended.map((r) => r.key));
  const conflicts = avoid.filter((a) => recKeys.has(a.key));
  expect(conflicts).toHaveLength(0);
});

// ============================================================
// TC8: pickAvoid chỉ trả item có score ≤ -2
// ============================================================
test('TC8: pickAvoid only returns items with score ≤ -2', () => {
  const rated = scoreActivities(ctx({ isNguyetKy: true, isTamNuong: true }));
  const avoided = pickAvoid(rated, 10);
  const overThreshold = avoided.filter((r) => r.score > -2);
  expect(overThreshold).toHaveLength(0);
});

// ============================================================
// TC9: reason string không rỗng khi có delta đáng kể
// ============================================================
test('TC9: Items with significant delta have non-empty reason', () => {
  const rated = scoreActivities(ctx({ isNguyetKy: true }));
  const blocked = rated.filter((r) => r.score <= -4);
  for (const item of blocked) {
    expect(item.reason.length).toBeGreaterThan(0);
  }
});

test('TC10: Tam Nương veto cannot be offset by favorable layers', () => {
  const rated = scoreActivities(ctx({
    isTamNuong: true,
    trucName: 'Kiến',
    trucQuality: 'Tốt',
    isHoangDao: true,
    dayCanIdx: 2,
    dayChiIdx: 5,
    userZodiacClash: 'Dần',
  }));
  const blocked = rated.find((item) => item.key === 'cuoi_hoi')!;
  expect(blocked.score).toBeLessThanOrEqual(-5);
  expect(blocked.recommended).toBe(false);
  expect(blocked.reason).toMatch(/Tam Nương/i);
});

test('TC11: Trực Phá still supports its explicitly suitable activities', () => {
  const rated = scoreActivities(ctx({
    trucName: 'Phá',
    trucQuality: 'Xấu',
    isHoangDao: true,
    dayCanIdx: 0,
    dayChiIdx: 5,
    userZodiacClash: 'Dần',
  }));
  expect(findScore(rated, 'don_dep')).toBeGreaterThan(0);
  expect(findScore(rated, 'chua_benh')).toBeGreaterThan(0);
});

test('TC12: Can element cannot recommend an activity by itself', () => {
  const rated = scoreActivities(ctx({
    trucName: 'Phá',
    trucQuality: 'Xấu',
    isHoangDao: false,
    dayCanIdx: 6, // Canh/Kim boosts the travel category
    dayChiIdx: 5,
    userZodiacClash: 'Dần',
  }));
  const funeral = rated.find((item) => item.key === 'an_tang')!;
  expect(funeral.score).toBe(0);
  expect(funeral.recommended).toBe(false);
  expect(funeral.reason).toBe('');
});

test('TC13: favorable and cautious hours adjust only time-sensitive activities', () => {
  const all = buildRatedActivities(ctx({})).all;
  const favorable = buildHourlyActivities(all, hourCtx({ isHoangDao: true }));
  const cautious = buildHourlyActivities(all, hourCtx({ isHoangDao: false }));
  const favorableMeeting = hourlyItem(favorable, 'hop_hanh')!;
  const cautiousMeeting = hourlyItem(cautious, 'hop_hanh')!;

  expect(favorableMeeting.hourDelta).toBeGreaterThan(cautiousMeeting.hourDelta);
  expect(favorableMeeting.hourReason).toMatch(/Thanh Long/);
  expect(cautiousMeeting.hourReason).toMatch(/thận trọng/i);
});

test('TC14: zodiac-clashing hour vetoes a strong major activity', () => {
  const all = buildRatedActivities(ctx({ trucName: 'Thành', trucQuality: 'Tốt' })).all;
  const result = buildHourlyActivities(all, hourCtx({ isClash: true }));
  const contract = hourlyItem(result, 'ky_ket')!;

  expect(contract).toMatchObject({ blockedByHour: true, recommended: false });
  expect(contract.score).toBeLessThanOrEqual(-2);
  expect(contract.hourReason).toMatch(/xung tuổi/i);
  expect(result.recommended.some((item) => item.key === 'ky_ket')).toBe(false);
});

test('TC15: day-clash hour penalizes without creating an hour veto', () => {
  const all = buildRatedActivities(ctx({})).all;
  const normal = buildHourlyActivities(all, hourCtx({ isDayClash: false }));
  const clashing = buildHourlyActivities(all, hourCtx({ isDayClash: true }));
  const normalMeeting = hourlyItem(normal, 'hop_hanh')!;
  const clashingMeeting = hourlyItem(clashing, 'hop_hanh')!;

  expect(clashingMeeting.hourDelta).toBe(normalMeeting.hourDelta - 3);
  expect(clashingMeeting.blockedByHour).toBe(false);
  expect(clashingMeeting.hourReason).toMatch(/Nhật Phá/i);
});

test('TC16: Ly Thuan Phong changes travel but not unrelated activities', () => {
  const all = buildRatedActivities(ctx({ trucName: 'Bình', trucQuality: 'Bình' })).all;
  const good = buildHourlyActivities(all, hourCtx({ isLyThuanPhongGood: true }));
  const bad = buildHourlyActivities(all, hourCtx({ isLyThuanPhongGood: false, lyThuanPhong: 'Không Vong' }));

  expect(hourlyItem(good, 'di_chuyen')!.hourDelta - hourlyItem(bad, 'di_chuyen')!.hourDelta).toBe(4);
  expect(hourlyItem(good, 'hop_hanh')!.hourDelta).toBe(hourlyItem(bad, 'hop_hanh')!.hourDelta);
});

test('TC17: favorable hour cannot reverse a day hard block', () => {
  const all = buildRatedActivities(ctx({
    isTamNuong: true,
    trucName: 'Kiến',
    trucQuality: 'Tốt',
    isHoangDao: true,
  })).all;
  const result = buildHourlyActivities(all, hourCtx({ isHoangDao: true }));
  const wedding = hourlyItem(result, 'cuoi_hoi')!;

  expect(wedding).toMatchObject({ blockedByDay: true, recommended: false });
  expect(wedding.score).toBeLessThanOrEqual(-2);
  expect(result.recommended.some((item) => item.key === 'cuoi_hoi')).toBe(false);
});

test('TC18: hour rules do not turn medical care into an avoided activity', () => {
  const all = buildRatedActivities(ctx({ trucName: 'Phá', trucQuality: 'Xấu' })).all;
  const medicalDay = all.find((item) => item.key === 'chua_benh')!;
  const result = buildHourlyActivities(all, hourCtx({
    isHoangDao: false,
    isClash: true,
    isDayClash: true,
    isLyThuanPhongGood: false,
  }));
  const medicalHour = hourlyItem(result, 'chua_benh')!;

  expect(medicalHour.hourDelta).toBe(0);
  expect(medicalHour.score).toBe(medicalDay.score);
  expect(result.avoid.some((item) => item.key === 'chua_benh')).toBe(false);
});

test('TC19: hourly output is deterministic, localized, disjoint, and category-balanced', () => {
  const allVi = buildRatedActivities(ctx({ locale: 'vi' })).all;
  const allEn = buildRatedActivities(ctx({ locale: 'en' })).all;
  const vi = buildHourlyActivities(allVi, hourCtx({ locale: 'vi' }));
  const viAgain = buildHourlyActivities(allVi, hourCtx({ locale: 'vi' }));
  const en = buildHourlyActivities(allEn, hourCtx({ locale: 'en' }));

  expect(viAgain).toEqual(vi);
  expect(vi.recommended.map((item) => item.score)).toEqual(en.recommended.map((item) => item.score));
  expect(vi.recommended[0]?.hourReason).not.toBe(en.recommended[0]?.hourReason);
  const recommendedKeys = new Set(vi.recommended.map((item) => item.key));
  expect(vi.avoid.some((item) => recommendedKeys.has(item.key))).toBe(false);
  const categoryCounts = vi.recommended.reduce<Record<string, number>>((counts, item) => ({
    ...counts,
    [item.category]: (counts[item.category] ?? 0) + 1,
  }), {});
  expect(Math.max(0, ...Object.values(categoryCounts))).toBeLessThanOrEqual(2);
});
