import type { UserProfile } from '../../store/userProfile';
import { formatLocalDateKey, getAstrologyProfileFingerprint } from '../astrology/dailyAstroFortune';
import { generatePureAstroVector, type PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { makeDaySnapshot, type HourInfo, type LunarDaySnapshot } from '../../services/lunarService';
import type { RatedActivity } from '../../services/activityRuleEngine';
import { ASTRO_ENGINE_VERSION } from '../../services/astro/astroVersion';
import {
  computeTransitChart,
  ZODIAC_SIGNS,
  type AstroBirthDataPrecision,
} from '../../services/astro/astroEngine';
import { translate, type AppLocale } from '../../i18n/translations';
import {
  buildDailyAstroMetricsFromMetadata,
  type DailyAstroMetrics,
} from '../../services/astro/dailyMetricEngine';

export const LUCKY_COLOR_VERSION = 'lucky-color-24-v1';
export const DAILY_INSIGHT_ENGINE_VERSION = `daily-insight-v5:${ASTRO_ENGINE_VERSION}:${LUCKY_COLOR_VERSION}`;
export const DAILY_INSIGHT_QUIET_START = 7;
export const DAILY_INSIGHT_QUIET_END = 22;

export interface DailyInsightLuckyTime {
  startHour: number;
  endHour: number;
  range: string;
  canChi: string;
  label: string;
}

export interface DailyInsightLuckyColor {
  id: string;
  colorSign: string;
  colorSignLabel: string;
  variant: LuckyColorVariant;
  name: string;
  swatchHex: string;
  textHex: string;
  evidence: string;
  basis: {
    version: typeof LUCKY_COLOR_VERSION;
    transitMoonSign: string;
    natalSunSign: string;
    natalMoonSign: string;
    phaseIndex: number;
    precision: AstroBirthDataPrecision;
  };
}

export interface DailyInsightAstrologyQuality {
  isEstimated: boolean;
  missingBirthTime: boolean;
  missingBirthLocation: boolean;
}

export interface DailyInsight {
  dateKey: string;
  profileKey: string;
  locale: AppLocale;
  timeZone: string;
  personality: string;
  luckyTime: DailyInsightLuckyTime | null;
  luckyColor: DailyInsightLuckyColor;
  astroDataQuality: DailyInsightAstrologyQuality;
  directions: { joy: string; wealth: string };
  /** Backward-compat: tên hoạt động có kèm lý do ("Ký kết — Trực Định (Tốt)") */
  recommended: string[];
  avoid: string[];
  /** Full rated data — UI dùng khi muốn hiển thị icon, category, reason riêng */
  ratedActivities?: {
    recommended: RatedActivity[];
    avoid: RatedActivity[];
  };
  warning: string | null;
  astroMetrics: DailyAstroMetrics;
  astroEvidence: string;
  canChiEvidence: string;
  canChiDay: string;
  suggestedQuestions: string[];
  engineVersion: string;
}

const EN_DIRECTIONS: Record<string, string> = {
  'Chính Bắc': 'North', 'Đông Bắc': 'Northeast', 'Chính Đông': 'East', 'Đông Nam': 'Southeast',
  'Chính Nam': 'South', 'Tây Nam': 'Southwest', 'Chính Tây': 'West', 'Tây Bắc': 'Northwest',
};

const EN_ACTIVITIES: Record<string, string> = {
  'Xuất hành': 'Travel or begin a journey', 'Khai trương': 'Launch or open a venture', 'Nhậm chức': 'Begin a new role',
  'Cưới hỏi': 'Relationship commitments', 'Động thổ': 'Start construction', 'Đào giếng': 'Ground work',
  'Mở kho': 'Open reserves', 'Cầu an': 'Seek calm and wellbeing', 'Chữa bệnh': 'Focus on recovery',
  'Dọn dẹp': 'Declutter', 'Cầu phúc': 'Practice gratitude', 'Ký kết lớn': 'Sign major agreements',
  'Xuất hành xa': 'Long-distance travel', 'Ký kết': 'Sign agreements', 'Giao dịch': 'Make transactions',
  'Kiện tụng': 'Legal disputes', 'Xây dựng': 'Build or create', 'Sửa chữa': 'Repair and improve',
  'Lập kế hoạch': 'Make plans', 'Dời nhà': 'Move home', 'Cúng tế': 'Quiet spiritual practice',
  'Tĩnh dưỡng': 'Rest and recover', 'Mạo hiểm': 'High-risk actions', 'Thu hoạch': 'Complete and collect results',
  'Tích trữ': 'Build reserves', 'Nạp tài': 'Organize finances', 'Khởi công lớn': 'Start a major project',
  'An táng': 'Memorial arrangements', 'Cầu tài': 'Pursue financial opportunities', 'Nhập trạch': 'Move into a home',
  'Tu bổ': 'Maintain and restore', 'Tĩnh tâm': 'Reflect quietly', 'Lập kế hoạch nội bộ': 'Plan internally',
};

function localizeDirection(value: string, locale: AppLocale): string {
  return locale === 'en' ? EN_DIRECTIONS[value] ?? value : value;
}

function localizeActivities(values: string[], locale: AppLocale): string[] {
  return locale === 'en' ? values.map((value) => EN_ACTIVITIES[value] ?? value) : values;
}

function formatHourRange(hour: HourInfo, locale: AppLocale): string {
  if (locale === 'vi') return hour.range.replace('-', '–');
  const endHour = (hour.startHour + 2) % 24;
  return `${String(hour.startHour).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`;
}

export function chooseLuckyAwakeHour(
  hours: HourInfo[],
  quietStart = DAILY_INSIGHT_QUIET_START,
  quietEnd = DAILY_INSIGHT_QUIET_END,
): HourInfo | null {
  const awake = hours.filter((hour) => (
    hour.startHour >= quietStart
    && hour.startHour < quietEnd
    && hour.isHoangDao
    && !hour.isClash
  ));
  if (!awake.length) return null;
  return [...awake].sort((left, right) => {
    const leftRank = Number(!left.isDayClash) * 2 + Number(left.isLyThuanPhongGood);
    const rightRank = Number(!right.isDayClash) * 2 + Number(right.isLyThuanPhongGood);
    return rightRank - leftRank || left.startHour - right.startHour;
  })[0];
}

type LocalizedDailyCopy = Record<AppLocale, string>;

export type LuckyColorVariant = 'primary' | 'companion';

export interface LuckyColorDefinition {
  id: string;
  sign: string;
  variant: LuckyColorVariant;
  swatchHex: string;
  textHex: string;
  signLabel: LocalizedDailyCopy;
  colorName: LocalizedDailyCopy;
}

const COLOR = (
  id: string,
  sign: string,
  variant: LuckyColorVariant,
  signVi: string,
  nameVi: string,
  nameEn: string,
  swatchHex: string,
  textHex: string,
): LuckyColorDefinition => ({
  id,
  sign,
  variant,
  swatchHex,
  textHex,
  signLabel: { vi: signVi, en: sign },
  colorName: { vi: nameVi, en: nameEn },
});

/** Ordered by zodiac sign, then 0–15° primary and 15–30° companion phase. */
export const LUCKY_COLOR_PALETTE: readonly LuckyColorDefinition[] = [
  COLOR('aries-bright-red', 'Aries', 'primary', 'Bạch Dương', 'Đỏ tươi', 'Bright red', '#EF4444', '#A61B2B'),
  COLOR('aries-ruby-red', 'Aries', 'companion', 'Bạch Dương', 'Đỏ ruby', 'Ruby red', '#B91C3C', '#8F1230'),
  COLOR('taurus-ivory', 'Taurus', 'primary', 'Kim Ngưu', 'Trắng ngà', 'Ivory', '#F3E6C8', '#705A2F'),
  COLOR('taurus-sage-green', 'Taurus', 'companion', 'Kim Ngưu', 'Xanh xô thơm', 'Sage green', '#8FAF88', '#3F6347'),
  COLOR('gemini-bright-green', 'Gemini', 'primary', 'Song Tử', 'Xanh lá sáng', 'Bright green', '#65C466', '#247A3D'),
  COLOR('gemini-lemon-yellow', 'Gemini', 'companion', 'Song Tử', 'Vàng chanh', 'Lemon yellow', '#D8D34B', '#6C6500'),
  COLOR('cancer-silver', 'Cancer', 'primary', 'Cự Giải', 'Bạc', 'Silver', '#C5CED8', '#4F5F72'),
  COLOR('cancer-pearl-blue', 'Cancer', 'companion', 'Cự Giải', 'Xanh ngọc trai', 'Pearl blue', '#AFC8D8', '#3E6175'),
  COLOR('leo-orange', 'Leo', 'primary', 'Sư Tử', 'Cam', 'Orange', '#F59E0B', '#8A4600'),
  COLOR('leo-golden', 'Leo', 'companion', 'Sư Tử', 'Vàng kim', 'Golden', '#D9A21B', '#765600'),
  COLOR('virgo-olive-green', 'Virgo', 'primary', 'Xử Nữ', 'Xanh olive', 'Olive green', '#7A8B3A', '#526025'),
  COLOR('virgo-moss-green', 'Virgo', 'companion', 'Xử Nữ', 'Xanh rêu', 'Moss green', '#5F7A48', '#3F5A2F'),
  COLOR('libra-blush-pink', 'Libra', 'primary', 'Thiên Bình', 'Hồng phấn', 'Blush pink', '#F29BC2', '#943565'),
  COLOR('libra-rose-pink', 'Libra', 'companion', 'Thiên Bình', 'Hồng hoa hồng', 'Rose pink', '#D96C9D', '#8D2F5C'),
  COLOR('scorpio-burgundy', 'Scorpio', 'primary', 'Bọ Cạp', 'Đỏ rượu', 'Burgundy', '#7F1D3F', '#7F1D3F'),
  COLOR('scorpio-plum', 'Scorpio', 'companion', 'Bọ Cạp', 'Tím mận', 'Plum', '#63305F', '#63305F'),
  COLOR('sagittarius-yellow', 'Sagittarius', 'primary', 'Nhân Mã', 'Vàng', 'Yellow', '#F4C542', '#776000'),
  COLOR('sagittarius-royal-purple', 'Sagittarius', 'companion', 'Nhân Mã', 'Tím hoàng gia', 'Royal purple', '#7051B8', '#543794'),
  COLOR('capricorn-charcoal-gray', 'Capricorn', 'primary', 'Ma Kết', 'Xám than', 'Charcoal gray', '#4B5563', '#4B5563'),
  COLOR('capricorn-earth-brown', 'Capricorn', 'companion', 'Ma Kết', 'Nâu đất', 'Earth brown', '#705548', '#634638'),
  COLOR('aquarius-deep-blue', 'Aquarius', 'primary', 'Bảo Bình', 'Xanh dương đậm', 'Deep blue', '#315C9B', '#315C9B'),
  COLOR('aquarius-turquoise', 'Aquarius', 'companion', 'Bảo Bình', 'Xanh ngọc lam', 'Turquoise', '#2A9D9A', '#176B6A'),
  COLOR('pisces-light-sea-blue', 'Pisces', 'primary', 'Song Ngư', 'Xanh biển nhạt', 'Light sea blue', '#7CC7D9', '#2C6978'),
  COLOR('pisces-lavender', 'Pisces', 'companion', 'Song Ngư', 'Tím oải hương', 'Lavender', '#A78BCA', '#604484'),
] as const;

export const MOON_SIGN_LUCKY_COLORS: Record<string, readonly [LuckyColorDefinition, LuckyColorDefinition]> =
  Object.fromEntries(ZODIAC_SIGNS.map((sign, signIndex) => [
    sign,
    [LUCKY_COLOR_PALETTE[signIndex * 2], LUCKY_COLOR_PALETTE[signIndex * 2 + 1]],
  ]));

export function getLuckyColorForMoonSign(
  moonSign: string,
  locale: AppLocale = 'vi',
  variant: LuckyColorVariant = 'primary',
): LuckyColorDefinition & { name: string; colorSignLabel: string } {
  const definitions = MOON_SIGN_LUCKY_COLORS[moonSign];
  if (!definitions) throw new Error(`Unsupported Moon sign: ${moonSign}`);
  const definition = definitions[variant === 'primary' ? 0 : 1];
  return {
    ...definition,
    name: definition.colorName[locale],
    colorSignLabel: definition.signLabel[locale],
  };
}

export function buildDailyLuckyColor(
  profile: UserProfile,
  date = new Date(),
  locale: AppLocale = 'vi',
): DailyInsightLuckyColor {
  const metadata = generatePureAstroVector({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || undefined,
    fullName: profile.fullName,
    birthTimeAccuracy: profile.birthTimeAccuracy,
    resolvedBirthLocation: profile.birthLocation,
  }, date).metadata;
  return buildDailyLuckyColorFromMetadata(metadata, date, locale);
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function zodiacLabel(sign: string, locale: AppLocale): string {
  return MOON_SIGN_LUCKY_COLORS[sign]?.[0].signLabel[locale] ?? sign;
}

function buildDailyLuckyColorFromMetadata(
  metadata: PureAstroFeatureMetadata,
  date: Date,
  locale: AppLocale,
): DailyInsightLuckyColor {
  const localNoon = new Date(date);
  localNoon.setHours(12, 0, 0, 0);
  const transitMoon = computeTransitChart(localNoon).planets.Moon;
  const natalSun = metadata.natalPlanets.find((planet) => planet.name === 'Sun');
  const natalMoon = metadata.natalPlanets.find((planet) => planet.name === 'Moon');
  if (!transitMoon || !natalSun || !natalMoon) {
    throw new Error('Lucky-color planetary positions are unavailable');
  }

  const personalizedLongitude = normalizeDegrees(
    transitMoon.longitude + natalSun.longitude + natalMoon.longitude,
  );
  const phaseIndex = Math.min(23, Math.floor(personalizedLongitude / 15));
  const definition = LUCKY_COLOR_PALETTE[phaseIndex];
  const colorSignLabel = definition.signLabel[locale];
  const transitMoonLabel = zodiacLabel(transitMoon.sign, locale);
  const natalSunLabel = zodiacLabel(natalSun.sign, locale);
  const natalMoonLabel = zodiacLabel(natalMoon.sign, locale);

  return {
    id: definition.id,
    colorSign: definition.sign,
    colorSignLabel,
    variant: definition.variant,
    name: definition.colorName[locale],
    swatchHex: definition.swatchHex,
    textHex: definition.textHex,
    evidence: locale === 'vi'
      ? `Mặt Trăng quá cảnh ở ${transitMoonLabel} × Mặt Trời bản mệnh ở ${natalSunLabel} × Mặt Trăng bản mệnh ở ${natalMoonLabel}`
      : `Moon in ${transitMoonLabel} × natal Sun in ${natalSunLabel} × natal Moon in ${natalMoonLabel}`,
    basis: {
      version: LUCKY_COLOR_VERSION,
      transitMoonSign: transitMoon.sign,
      natalSunSign: natalSun.sign,
      natalMoonSign: natalMoon.sign,
      phaseIndex,
      precision: metadata.birthDataPrecision,
    },
  };
}

const TRANSIT_MOON_TONES: Record<string, LocalizedDailyCopy> = {
  Aries: {
    vi: 'Cảm xúc nghiêng về hành động trực tiếp và quyết đoán.',
    en: 'Your emotions lean toward direct, decisive action.',
  },
  Taurus: {
    vi: 'Bạn cần một nhịp ổn định và cảm giác an toàn để phát huy tốt nhất.',
    en: 'A steady pace and a sense of security help you work at your best.',
  },
  Gemini: {
    vi: 'Tâm trí muốn trao đổi, đặt câu hỏi và cập nhật điều mới.',
    en: 'Your mind wants conversation, questions, and fresh information.',
  },
  Cancer: {
    vi: 'Cảm xúc cần sự gần gũi và một không gian đủ an toàn để mở lòng.',
    en: 'Your feelings need closeness and a safe space in which to open up.',
  },
  Leo: {
    vi: 'Bạn dễ tỏa sáng khi được thể hiện điều mình thật sự trân trọng.',
    en: 'You shine more easily when expressing what you genuinely value.',
  },
  Virgo: {
    vi: 'Sự rõ ràng đến từ việc sắp xếp lại chi tiết và nhịp sinh hoạt.',
    en: 'Clarity comes from organizing details and restoring your routine.',
  },
  Libra: {
    vi: 'Bạn nhạy hơn với sự công bằng, cách đối thoại và chất lượng kết nối.',
    en: 'You are more sensitive to fairness, dialogue, and the quality of connection.',
  },
  Scorpio: {
    vi: 'Cảm xúc có chiều sâu; thành thật với điều cốt lõi sẽ giúp bạn nhẹ hơn.',
    en: 'Feelings run deep; honesty about what matters most can bring relief.',
  },
  Sagittarius: {
    vi: 'Bạn cần một góc nhìn rộng hơn, chút dịch chuyển hoặc cảm hứng mới.',
    en: 'You need a wider perspective, some movement, or a fresh source of inspiration.',
  },
  Capricorn: {
    vi: 'Năng lượng hợp với việc xác định mục tiêu và tiến từng bước có cấu trúc.',
    en: 'Your energy favors clear goals and structured, deliberate progress.',
  },
  Aquarius: {
    vi: 'Ý tưởng khác biệt và kết nối cộng đồng có thể mở ra hướng đi mới.',
    en: 'Unconventional ideas and community connections can reveal a new direction.',
  },
  Pisces: {
    vi: 'Trực giác đang nhạy; khoảng lặng sẽ giúp bạn nghe rõ tín hiệu bên trong.',
    en: 'Your intuition is heightened; quiet moments help you hear your inner signals.',
  },
};

const ACTIVATED_HOUSE_FOCUS: Record<number, LocalizedDailyCopy> = {
  1: { vi: 'Ưu tiên cách bạn hiện diện và chủ động bắt đầu.', en: 'Prioritize how you show up and take initiative.' },
  2: { vi: 'Ưu tiên giá trị cá nhân và cách bạn quản lý nguồn lực.', en: 'Prioritize personal values and how you manage resources.' },
  3: { vi: 'Ưu tiên giao tiếp rõ ràng, học hỏi và các kết nối gần.', en: 'Prioritize clear communication, learning, and nearby connections.' },
  4: { vi: 'Ưu tiên gia đình, nền tảng cảm xúc và cảm giác thuộc về.', en: 'Prioritize family, emotional foundations, and a sense of belonging.' },
  5: { vi: 'Ưu tiên sáng tạo, niềm vui và cách bạn bày tỏ tình cảm.', en: 'Prioritize creativity, joy, and how you express affection.' },
  6: { vi: 'Ưu tiên thói quen, sức bền và những việc nhỏ cần hoàn thiện.', en: 'Prioritize routines, stamina, and small tasks that need completion.' },
  7: { vi: 'Ưu tiên sự cân bằng trong quan hệ và những cam kết đôi bên.', en: 'Prioritize balance in relationships and mutual commitments.' },
  8: { vi: 'Ưu tiên ranh giới, nguồn lực chung và điều cần chuyển hóa.', en: 'Prioritize boundaries, shared resources, and what needs transformation.' },
  9: { vi: 'Ưu tiên học hỏi, khám phá và mở rộng góc nhìn.', en: 'Prioritize learning, exploration, and a broader perspective.' },
  10: { vi: 'Ưu tiên mục tiêu dài hạn, trách nhiệm và hướng phát triển sự nghiệp.', en: 'Prioritize long-term goals, responsibility, and career direction.' },
  11: { vi: 'Ưu tiên bạn bè, cộng đồng và kế hoạch cho tương lai.', en: 'Prioritize friends, community, and plans for the future.' },
  12: { vi: 'Ưu tiên nghỉ ngơi, khép lại việc cũ và lắng nghe nội tâm.', en: 'Prioritize rest, closure, and listening inward.' },
};

function personalityFor(metadata: PureAstroFeatureMetadata, locale: AppLocale): string {
  const base = translate(locale, `daily.personality.${metadata.dominantSignal}`);
  const moonTone = TRANSIT_MOON_TONES[metadata.transitMoonSign]?.[locale];
  const activeHouse = metadata.dailyContext?.activatedHouses[0]?.house;
  const houseFocus = activeHouse ? ACTIVATED_HOUSE_FOCUS[activeHouse]?.[locale] : undefined;
  // Put the fast-moving Moon tone first so compact one-line cards also feel current.
  return [moonTone, houseFocus, base].filter(Boolean).join(' ');
}

function buildAstroEvidence(metadata: PureAstroFeatureMetadata, locale: AppLocale): string {
  const topTopic = metadata.ruleEvaluation?.topTopics[0];
  const house = metadata.dailyContext?.activatedHouses[0];
  if (locale === 'en') {
    const parts = [`Dominant signal: ${metadata.dominantSignal}`];
    if (topTopic) parts.push(`Leading theme: ${topTopic.title}`);
    if (house) parts.push(`House ${house.house} is emphasized today`);
    return parts.join(' · ');
  }
  const parts = [`Tín hiệu chủ đạo: ${metadata.dominantSignal}`];
  if (topTopic) parts.push(`Chủ đề nổi bật: ${topTopic.title}`);
  if (house) parts.push(`Nhà ${house.house} (${house.topicVi}) đang được kích hoạt`);
  return parts.join(' · ');
}

function buildCanChiEvidence(snapshot: LunarDaySnapshot, locale: AppLocale): string {
  if (locale === 'en') {
    return `${snapshot.canChiDay} day · ${snapshot.activities.trucName} officer · ${snapshot.dayHoangDaoStatus.label}`;
  }
  return `Ngày ${snapshot.canChiDay} · Trực ${snapshot.activities.trucName} · ${snapshot.dayHoangDaoStatus.label}`;
}

function suggestions(locale: AppLocale, insight: Pick<DailyInsight, 'luckyTime' | 'directions' | 'avoid'>): string[] {
  if (locale === 'en') {
    return [
      'What should I focus on today?',
      `How can I use my lucky direction, ${insight.directions.joy}?`,
      `What should I do during ${insight.luckyTime?.range ?? 'my best time today'}?`,
      `Why should I avoid ${insight.avoid[0]?.toLowerCase() ?? 'rushed decisions'} today?`,
      'What does today suggest for love and relationships?',
      'What is the best career move for me today?',
    ];
  }
  return [
    'Hôm nay tôi nên tập trung vào điều gì?',
    `Tôi nên tận dụng hướng ${insight.directions.joy} thế nào?`,
    `Tôi nên làm gì trong khung ${insight.luckyTime?.range ?? 'giờ tốt hôm nay'}?`,
    `Vì sao hôm nay tôi nên kiêng ${insight.avoid[0]?.toLowerCase() ?? 'quyết định vội'}?`,
    'Chuyện tình cảm hôm nay có điều gì đáng chú ý?',
    'Bước đi công việc nào phù hợp nhất hôm nay?',
  ];
}

export function buildDailyInsight(
  profile: UserProfile & { id?: string | null },
  date = new Date(),
  locale: AppLocale = 'vi',
): DailyInsight {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';
  const snapshot = makeDaySnapshot(date, {
    birthDate: profile.birthDate,
    currentHour: 0,
    timeZone: -date.getTimezoneOffset() / 60,
    locale,
  });
  const metadata = generatePureAstroVector({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || undefined,
    fullName: profile.fullName,
    birthTimeAccuracy: profile.birthTimeAccuracy,
    resolvedBirthLocation: profile.birthLocation,
  }, date).metadata;
  const astroMetrics = buildDailyAstroMetricsFromMetadata(metadata, date, locale);
  const luckyColor = buildDailyLuckyColorFromMetadata(metadata, date, locale);
  const hasExactBirthTime = profile.birthTimeAccuracy
    ? profile.birthTimeAccuracy === 'exact' && !!profile.birthTime?.trim()
    : !!profile.birthTime?.trim();
  const astroDataQuality: DailyInsightAstrologyQuality = {
    isEstimated: !hasExactBirthTime || !profile.birthLocation,
    missingBirthTime: !hasExactBirthTime,
    missingBirthLocation: !profile.birthLocation,
  };
  const bestHour = chooseLuckyAwakeHour(snapshot.hours);

  // --- Nên làm / Kiêng cữ ---
  // Ưu tiên engine đa lớp (rated); fallback về bảng 12 Trực tĩnh nếu rated không có.
  const ratedData = snapshot.activities.rated;

  const recommended = ratedData
    ? ratedData.recommended.map((r) => (locale === 'en' ? r.en : r.vi))
    : localizeActivities(snapshot.activities.yi, locale).slice(0, 5);

  const avoid = ratedData
    ? ratedData.avoid.map((r) => (locale === 'en' ? r.en : r.vi))
    : localizeActivities(snapshot.activities.ji, locale).slice(0, 4);
  const base: DailyInsight = {
    dateKey: formatLocalDateKey(date),
    profileKey: getAstrologyProfileFingerprint(profile),
    locale,
    timeZone,
    personality: personalityFor(metadata, locale),
    luckyTime: bestHour ? {
      startHour: bestHour.startHour,
      endHour: (bestHour.startHour + 2) % 24,
      range: formatHourRange(bestHour, locale),
      canChi: bestHour.canChi,
      label: bestHour.label,
    } : null,
    luckyColor,
    astroDataQuality,
    directions: {
      joy: localizeDirection(snapshot.direction.hyThan, locale),
      wealth: localizeDirection(snapshot.direction.taiThan, locale),
    },
    recommended,
    avoid,
    ratedActivities: ratedData ? {
      recommended: ratedData.recommended,
      avoid: ratedData.avoid,
    } : undefined,
    warning: snapshot.warning,
    astroMetrics,
    astroEvidence: buildAstroEvidence(metadata, locale),
    canChiEvidence: buildCanChiEvidence(snapshot, locale),
    canChiDay: snapshot.canChiDay,
    suggestedQuestions: [],
    engineVersion: DAILY_INSIGHT_ENGINE_VERSION,
  };
  return { ...base, suggestedQuestions: suggestions(locale, base) };
}

export function getDailyInsightCacheKey(insight: Pick<DailyInsight, 'dateKey' | 'profileKey' | 'locale' | 'timeZone'>): string {
  return `@numelyra:daily-insight:v5:${insight.dateKey}:${insight.profileKey}:${insight.locale}:${insight.timeZone}`;
}

export interface DailyInsightStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export async function cacheDailyInsight(storage: DailyInsightStorage, insight: DailyInsight): Promise<void> {
  await storage.setItem(getDailyInsightCacheKey(insight), JSON.stringify(insight));
}

export async function readCachedDailyInsight(
  storage: DailyInsightStorage,
  identity: Pick<DailyInsight, 'dateKey' | 'profileKey' | 'locale' | 'timeZone'>,
): Promise<DailyInsight | null> {
  try {
    const raw = await storage.getItem(getDailyInsightCacheKey(identity));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyInsight>;
    return parsed.engineVersion === DAILY_INSIGHT_ENGINE_VERSION
      && parsed.dateKey === identity.dateKey
      && parsed.profileKey === identity.profileKey
      && parsed.locale === identity.locale
      && parsed.timeZone === identity.timeZone
      && parsed.luckyColor?.basis?.version === LUCKY_COLOR_VERSION
      && !!parsed.astroDataQuality
      ? parsed as DailyInsight
      : null;
  } catch {
    return null;
  }
}

