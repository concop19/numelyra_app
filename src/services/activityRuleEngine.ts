/**
 * activityRuleEngine.ts
 *
 * Engine đọc activity-rules.json và chạy 5 lớp rule theo thứ tự ưu tiên:
 *   L0 — Nguyệt Kỵ / Tam Nương  (hard block)
 *   L1 — Trực quality            (nền dữ liệu)
 *   L2 — Hoàng đạo / Hắc đạo   (khuếch đại)
 *   L3 — Can ngày → Ngũ hành    (điều chỉnh nhẹ)
 *   L4 — Tuổi xung người dùng   (lọc cá nhân)
 *
 * Conflict resolution: tổng score của tất cả layer;
 * reason = layer có |delta| lớn nhất (priority tie-break L0 > L1 > ... > L4).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RULES = require('../data/activity-rules.json') as ActivityRulesJson;

// ============================================================
// JSON Schema Types
// ============================================================

export type ActivityCategory =
  | 'work'
  | 'finance'
  | 'love'
  | 'health'
  | 'learning'
  | 'travel';

interface ActivityJson {
  key: string;
  vi: string;
  en: string;
  category: ActivityCategory;
  icon: string;
  trucYi: string[];
  trucJi: string[];
}

interface ActivityRulesJson {
  version: string;
  activities: ActivityJson[];
  layers: {
    nguyetKy: {
      blockedKeys: string[];
      delta: number;
      reasonVi: string;
      reasonEn: string;
    };
    tamNuong: {
      blockedKeys: string[];
      delta: number;
      reasonVi: string;
      reasonEn: string;
    };
    hoangDao: {
      boostedKeys: string[];
      delta: number;
      reasonVi: string;
      reasonEn: string;
    };
    hacDao: {
      penalizedKeys: string[];
      delta: number;
      reasonVi: string;
      reasonEn: string;
    };
    trucQuality: {
      trucModifiers: Record<string, number>;
      yiBase: number;
      reasonTemplateYiVi: string;
      reasonTemplateYiEn: string;
      reasonTemplateJiVi: string;
      reasonTemplateJiEn: string;
      penaltyJi: number;
    };
    canElementBoost: {
      canToElement: Record<string, string>;
      elementToCategories: Record<string, string[]>;
      delta: number;
      reasonTemplateVi: string;
      reasonTemplateEn: string;
    };
    zodiacClash: {
      sensitiveKeys: string[];
      deltaImportant: number;
      deltaOther: number;
      reasonTemplateVi: string;
      reasonTemplateEn: string;
    };
  };
  hourLayers: {
    quality: {
      sensitiveKeys: string[];
      hoangDaoDelta: number;
      hacDaoDelta: number;
      hoangDaoReasonVi: string;
      hoangDaoReasonEn: string;
      hacDaoReasonVi: string;
      hacDaoReasonEn: string;
    };
    zodiacClash: {
      delta: number;
      reasonVi: string;
      reasonEn: string;
    };
    dayClash: {
      delta: number;
      reasonVi: string;
      reasonEn: string;
    };
    lyThuanPhong: {
      travelKeys: string[];
      goodDelta: number;
      badDelta: number;
      goodReasonVi: string;
      goodReasonEn: string;
      badReasonVi: string;
      badReasonEn: string;
    };
  };
  categoryLabels: Record<ActivityCategory, { vi: string; en: string }>;
}

// ============================================================
// Public Types
// ============================================================

export interface RatedActivity {
  key: string;
  vi: string;
  en: string;
  category: ActivityCategory;
  icon: string;
  /** Lý do ngắn kèm theo (đã localize) */
  reason: string;
  /** Tổng điểm tích luỹ từ tất cả các lớp rule */
  score: number;
  /** true = nên làm; false = nên tránh */
  recommended: boolean;
  /** Veto từ Nguyệt Kỵ / Tam Nương; giờ tốt không được phép đảo kết quả này. */
  blockedByDay: boolean;
}

export interface ActivityRuleContext {
  trucName: string;
  trucQuality: 'Tốt' | 'Bình' | 'Xấu';
  isHoangDao: boolean;
  hoangDaoLabel: string;   // 'Thanh Long', 'Minh Đường', ...
  isNguyetKy: boolean;
  isTamNuong: boolean;
  dayCanIdx: number;       // 0–9
  dayChiIdx: number;       // 0–11
  userZodiac: string;      // 'Tý', 'Sửu', ...
  userZodiacClash: string; // con giáp xung với user
  locale: 'vi' | 'en';
}

export interface HourActivityContext {
  hourName: string;
  canChi: string;
  range: string;
  isHoangDao: boolean;
  hourLabel: string;
  isClash: boolean;
  isDayClash: boolean;
  lyThuanPhong: string;
  isLyThuanPhongGood: boolean;
  userZodiac: string;
  locale: 'vi' | 'en';
}

export interface HourlyRatedActivity extends RatedActivity {
  dayScore: number;
  hourDelta: number;
  dayReason: string;
  hourReason: string;
  blockedByHour: boolean;
}

export interface HourlyActivities {
  hour: Pick<HourActivityContext, 'hourName' | 'canChi' | 'range'>;
  all: HourlyRatedActivity[];
  recommended: HourlyRatedActivity[];
  avoid: HourlyRatedActivity[];
}

export interface RatedActivities {
  all: RatedActivity[];
  recommended: RatedActivity[];
  avoid: RatedActivity[];
}

// ============================================================
// Internal helpers
// ============================================================

interface LayerResult {
  /** Thứ tự ưu tiên — nhỏ hơn = ưu tiên cao hơn */
  priority: number;
  delta: number;
  reason: string;
}

function tmpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

const DIA_CHI_VI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// ============================================================
// Layer functions
// ============================================================

/** L0 — Nguyệt Kỵ */
function layerNguyetKy(act: ActivityJson, ctx: ActivityRuleContext): LayerResult {
  if (!ctx.isNguyetKy) return { priority: 0, delta: 0, reason: '' };
  const cfg = RULES.layers.nguyetKy;
  if (!cfg.blockedKeys.includes(act.key)) return { priority: 0, delta: 0, reason: '' };
  return {
    priority: 0,
    delta: cfg.delta,
    reason: ctx.locale === 'en' ? cfg.reasonEn : cfg.reasonVi,
  };
}

/** L0 — Tam Nương (same priority 0, but overrides NguyetKy when key is in both) */
function layerTamNuong(act: ActivityJson, ctx: ActivityRuleContext): LayerResult {
  if (!ctx.isTamNuong) return { priority: 0, delta: 0, reason: '' };
  const cfg = RULES.layers.tamNuong;
  if (!cfg.blockedKeys.includes(act.key)) return { priority: 0, delta: 0, reason: '' };
  return {
    priority: 0,
    delta: cfg.delta,
    reason: ctx.locale === 'en' ? cfg.reasonEn : cfg.reasonVi,
  };
}

/** L1 — Trực quality */
function layerTruc(act: ActivityJson, ctx: ActivityRuleContext): LayerResult {
  const cfg = RULES.layers.trucQuality;
  const inYi = act.trucYi.includes(ctx.trucName);
  const inJi = act.trucJi.includes(ctx.trucName);

  if (inYi) {
    // An activity explicitly listed as Yi remains suitable even when the
    // officer has an overall "Xấu" quality (for example clearing old things
    // on Trực Phá). The quality modifier only strengthens that base support.
    const bonus = cfg.yiBase + (cfg.trucModifiers[ctx.trucQuality] ?? 0);
    const template = ctx.locale === 'en' ? cfg.reasonTemplateYiEn : cfg.reasonTemplateYiVi;
    return {
      priority: 1,
      delta: bonus,
      reason: tmpl(template, { truc: ctx.trucName, quality: ctx.trucQuality }),
    };
  }
  if (inJi) {
    const template = ctx.locale === 'en' ? cfg.reasonTemplateJiEn : cfg.reasonTemplateJiVi;
    return {
      priority: 1,
      delta: cfg.penaltyJi,
      reason: tmpl(template, { truc: ctx.trucName }),
    };
  }
  return { priority: 1, delta: 0, reason: '' };
}

/** L2 — Hoàng đạo / Hắc đạo */
function layerHoangDao(act: ActivityJson, ctx: ActivityRuleContext): LayerResult {
  const cleanLabel = ctx.hoangDaoLabel.replace(/^Ngày\s+(Hoàng|Hắc)\s+đạo\s*\(?|\)$/gi, '').trim();
  const label = cleanLabel || ctx.hoangDaoLabel;

  if (ctx.isHoangDao) {
    const cfg = RULES.layers.hoangDao;
    if (!cfg.boostedKeys.includes(act.key)) return { priority: 2, delta: 0, reason: '' };
    const template = ctx.locale === 'en' ? cfg.reasonEn : cfg.reasonVi;
    return {
      priority: 2,
      delta: cfg.delta,
      reason: tmpl(template, { label }),
    };
  } else {
    const cfg = RULES.layers.hacDao;
    if (!cfg.penalizedKeys.includes(act.key)) return { priority: 2, delta: 0, reason: '' };
    const template = ctx.locale === 'en' ? cfg.reasonEn : cfg.reasonVi;
    return {
      priority: 2,
      delta: cfg.delta,
      reason: tmpl(template, { label }),
    };
  }
}

/** L3 — Can ngày → Ngũ hành */
function layerCanElement(act: ActivityJson, ctx: ActivityRuleContext): LayerResult {
  const cfg = RULES.layers.canElementBoost;
  const element = cfg.canToElement[String(ctx.dayCanIdx)];
  if (!element) return { priority: 3, delta: 0, reason: '' };
  const cats = cfg.elementToCategories[element] ?? [];
  if (!cats.includes(act.category)) return { priority: 3, delta: 0, reason: '' };
  const catLabels = RULES.categoryLabels[act.category];
  const template = ctx.locale === 'en' ? cfg.reasonTemplateEn : cfg.reasonTemplateVi;
  return {
    priority: 3,
    delta: cfg.delta,
    reason: tmpl(template, {
      element,
      categoryVi: catLabels?.vi ?? act.category,
      categoryEn: catLabels?.en ?? act.category,
    }),
  };
}

/** L4 — Tuổi xung */
function layerZodiacClash(act: ActivityJson, ctx: ActivityRuleContext): LayerResult {
  const dayChiName = DIA_CHI_VI[ctx.dayChiIdx];
  if (!ctx.userZodiacClash || dayChiName !== ctx.userZodiacClash) {
    return { priority: 4, delta: 0, reason: '' };
  }
  const cfg = RULES.layers.zodiacClash;
  const isSensitive = cfg.sensitiveKeys.includes(act.key);
  const delta = isSensitive ? cfg.deltaImportant : cfg.deltaOther;
  const template = ctx.locale === 'en' ? cfg.reasonTemplateEn : cfg.reasonTemplateVi;
  return {
    priority: 4,
    delta,
    reason: tmpl(template, { zodiac: ctx.userZodiac }),
  };
}

// ============================================================
// Engine core
// ============================================================

/**
 * Chạy tất cả lớp rule cho một activity, trả về RatedActivity.
 */
function rateOne(act: ActivityJson, ctx: ActivityRuleContext): RatedActivity {
  const layers: LayerResult[] = [
    layerNguyetKy(act, ctx),
    layerTamNuong(act, ctx),
    layerTruc(act, ctx),
    layerHoangDao(act, ctx),
    layerCanElement(act, ctx),
    layerZodiacClash(act, ctx),
  ];

  const hasPrimarySupport = layers.some((layer) => (
    (layer.priority === 1 || layer.priority === 2) && layer.delta > 0
  ));
  const scoredLayers = layers.map((layer) => (
    // Can-element affinity is only a tie-breaker. It must not independently
    // recommend an unrelated activity merely because it shares a category.
    layer.priority === 3 && layer.delta > 0 && !hasPrimarySupport
      ? { ...layer, delta: 0, reason: '' }
      : layer
  ));

  const rawScore = scoredLayers.reduce((sum, l) => sum + l.delta, 0);
  const hardBlock = layers
    .filter((layer) => layer.priority === 0 && layer.delta < 0 && layer.reason)
    .sort((left, right) => left.delta - right.delta)[0];

  // Nguyệt Kỵ / Tam Nương are veto rules, not ordinary score modifiers.
  // Positive layers may explain secondary strengths, but must never turn a
  // blocked activity into a recommendation.
  const score = hardBlock ? Math.min(rawScore, hardBlock.delta) : rawScore;

  // Lấy reason từ layer có |delta| lớn nhất, tie-break bằng priority (thấp = ưu tiên)
  const mainReason = hardBlock?.reason ?? [...scoredLayers]
    .filter((l) => l.reason && l.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.priority - b.priority)[0]
    ?.reason ?? '';

  return {
    key: act.key,
    vi: act.vi,
    en: act.en,
    category: act.category,
    icon: act.icon,
    reason: mainReason,
    score,
    recommended: score > 0,
    blockedByDay: Boolean(hardBlock),
  };
}

/**
 * Chạy toàn bộ catalogue → danh sách đã chấm điểm.
 */
export function scoreActivities(ctx: ActivityRuleContext): RatedActivity[] {
  return RULES.activities.map((act) => rateOne(act, ctx));
}

/**
 * Base Trực catalogue used by the compatibility fallback in lunarService.
 * Keeping it here prevents a second, divergent Yi/Ji table.
 */
export function getBaseActivitiesForTruc(
  trucName: string,
  locale: 'vi' | 'en' = 'vi',
): { yi: string[]; ji: string[] } {
  const label = (activity: ActivityJson) => (locale === 'en' ? activity.en : activity.vi);
  return {
    yi: RULES.activities.filter((activity) => activity.trucYi.includes(trucName)).map(label),
    ji: RULES.activities.filter((activity) => activity.trucJi.includes(trucName)).map(label),
  };
}

/**
 * Chọn N hoạt động nên làm (score > 0).
 * Đảm bảo đa dạng category — không quá 2 item/nhóm.
 */
export function pickRecommended<T extends RatedActivity>(rated: T[], n = 5, fillBeyondCategoryLimit = true): T[] {
  const positive = [...rated]
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const result: T[] = [];
  const catCount: Partial<Record<ActivityCategory, number>> = {};

  // Pass 1: max 2 per category
  for (const item of positive) {
    if (result.length >= n) break;
    const c = catCount[item.category] ?? 0;
    if (c < 2) {
      result.push(item);
      catCount[item.category] = c + 1;
    }
  }

  // Pass 2: fill remaining slots regardless of category
  if (fillBeyondCategoryLimit && result.length < n) {
    for (const item of positive) {
      if (result.length >= n) break;
      if (!result.find((r) => r.key === item.key)) {
        result.push(item);
      }
    }
  }

  return result;
}

/**
 * Chọn N hoạt động nên tránh (score ≤ -2).
 * Xấu nhất trước (sort ascending).
 */
export function pickAvoid<T extends RatedActivity>(rated: T[], n = 4, limitByCategory = false): T[] {
  const negative = [...rated]
    .filter((r) => r.score <= -2)
    .sort((a, b) => a.score - b.score || a.key.localeCompare(b.key));

  if (!limitByCategory) return negative.slice(0, n);

  const result: T[] = [];
  const catCount: Partial<Record<ActivityCategory, number>> = {};
  for (const item of negative) {
    if (result.length >= n) break;
    const count = catCount[item.category] ?? 0;
    if (count >= 2) continue;
    result.push(item);
    catCount[item.category] = count + 1;
  }
  return result;
}

/**
 * Hàm tiện ích chính — dùng trong lunarService.ts
 */
export function buildRatedActivities(
  ctx: ActivityRuleContext,
  recommendedCount = 5,
  avoidCount = 4,
): RatedActivities {
  const all = scoreActivities(ctx);
  return {
    all,
    recommended: pickRecommended(all, recommendedCount),
    avoid: pickAvoid(all, avoidCount),
  };
}

interface HourLayerResult {
  priority: number;
  delta: number;
  reason: string;
  veto?: boolean;
}

function localizeHourReason(ctx: HourActivityContext, vi: string, en: string, vars: Record<string, string>): string {
  return tmpl(ctx.locale === 'en' ? en : vi, vars);
}

function scoreActivityForHour(activity: RatedActivity, ctx: HourActivityContext): HourlyRatedActivity {
  const cfg = RULES.hourLayers;
  const isSensitive = cfg.quality.sensitiveKeys.includes(activity.key);
  const layers: HourLayerResult[] = [];

  if (isSensitive) {
    const delta = ctx.isHoangDao ? cfg.quality.hoangDaoDelta : cfg.quality.hacDaoDelta;
    layers.push({
      priority: 3,
      delta,
      reason: localizeHourReason(
        ctx,
        ctx.isHoangDao ? cfg.quality.hoangDaoReasonVi : cfg.quality.hacDaoReasonVi,
        ctx.isHoangDao ? cfg.quality.hoangDaoReasonEn : cfg.quality.hacDaoReasonEn,
        { label: ctx.hourLabel },
      ),
    });
  }

  if (isSensitive && ctx.isClash) {
    layers.push({
      priority: 0,
      delta: cfg.zodiacClash.delta,
      veto: true,
      reason: localizeHourReason(ctx, cfg.zodiacClash.reasonVi, cfg.zodiacClash.reasonEn, {
        hour: ctx.hourName,
        zodiac: ctx.userZodiac,
      }),
    });
  }

  if (isSensitive && ctx.isDayClash) {
    layers.push({
      priority: 1,
      delta: cfg.dayClash.delta,
      reason: localizeHourReason(ctx, cfg.dayClash.reasonVi, cfg.dayClash.reasonEn, { hour: ctx.hourName }),
    });
  }

  if (cfg.lyThuanPhong.travelKeys.includes(activity.key)) {
    const delta = ctx.isLyThuanPhongGood ? cfg.lyThuanPhong.goodDelta : cfg.lyThuanPhong.badDelta;
    layers.push({
      priority: 2,
      delta,
      reason: localizeHourReason(
        ctx,
        ctx.isLyThuanPhongGood ? cfg.lyThuanPhong.goodReasonVi : cfg.lyThuanPhong.badReasonVi,
        ctx.isLyThuanPhongGood ? cfg.lyThuanPhong.goodReasonEn : cfg.lyThuanPhong.badReasonEn,
        { name: ctx.lyThuanPhong },
      ),
    });
  }

  const orderedLayers = [...layers]
    .filter((layer) => layer.delta !== 0 && layer.reason)
    .sort((left, right) => left.priority - right.priority);
  const hourDelta = layers.reduce((sum, layer) => sum + layer.delta, 0);
  const blockedByHour = layers.some((layer) => layer.veto);
  const rawScore = activity.score + hourDelta;
  const score = activity.blockedByDay || blockedByHour ? Math.min(rawScore, -2) : rawScore;
  const hourReason = orderedLayers.map((layer) => layer.reason).join(' · ');
  const reason = [activity.reason, hourReason].filter(Boolean).join(' · ');

  return {
    ...activity,
    dayScore: activity.score,
    hourDelta,
    score,
    dayReason: activity.reason,
    hourReason,
    reason,
    recommended: score > 0 && !activity.blockedByDay && !blockedByHour,
    blockedByHour,
  };
}

/** Kết hợp điểm ngày với giờ đang chọn mà không thay đổi dữ liệu ngày gốc. */
export function buildHourlyActivities(
  dayRatings: RatedActivity[],
  ctx: HourActivityContext,
  recommendedCount = 5,
  avoidCount = 4,
): HourlyActivities {
  const all = dayRatings.map((activity) => scoreActivityForHour(activity, ctx));
  return {
    hour: { hourName: ctx.hourName, canChi: ctx.canChi, range: ctx.range },
    all,
    recommended: pickRecommended(all, recommendedCount, false),
    avoid: pickAvoid(all, avoidCount, true),
  };
}
