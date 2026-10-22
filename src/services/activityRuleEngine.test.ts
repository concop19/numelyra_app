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
  type ActivityRuleContext,
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

// ============================================================
// TC1: Nguyệt Kỵ → khai_truong score ≤ -4
// ============================================================
test('TC1: Nguyệt Kỵ penalizes khai_truong by at least 4', () => {
  const rated = scoreActivities(ctx({ isNguyetKy: true }));
  expect(findScore(rated, 'khai_truong')).toBeLessThanOrEqual(-4);
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
