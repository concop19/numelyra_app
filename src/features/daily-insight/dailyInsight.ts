import type { UserProfile } from '../../store/userProfile';
import { formatLocalDateKey, getAstrologyProfileFingerprint } from '../astrology/dailyAstroFortune';
import { generatePureAstroVector, type PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { makeDaySnapshot, type HourInfo, type LunarDaySnapshot } from '../../services/lunarService';
import type { RatedActivity } from '../../services/activityRuleEngine';
import { ASTRO_ENGINE_VERSION } from '../../services/astro/astroVersion';
import { translate, type AppLocale } from '../../i18n/translations';

export const DAILY_INSIGHT_ENGINE_VERSION = `daily-insight-v2:${ASTRO_ENGINE_VERSION}`;
export const DAILY_INSIGHT_QUIET_START = 7;
export const DAILY_INSIGHT_QUIET_END = 22;

export interface DailyInsightLuckyTime {
  startHour: number;
  endHour: number;
  range: string;
  canChi: string;
  label: string;
}

export interface DailyInsight {
  dateKey: string;
  profileKey: string;
  locale: AppLocale;
  timeZone: string;
  personality: string;
  luckyTime: DailyInsightLuckyTime | null;
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
  profile: UserProfile,
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
    directions: {
      joy: localizeDirection(snapshot.direction.hyThan, locale),
      wealth: localizeDirection(snapshot.direction.taiThan, locale),
    },
    recommended,
    avoid,
    ratedActivities: ratedData,
    warning: snapshot.warning,
    astroEvidence: buildAstroEvidence(metadata, locale),
    canChiEvidence: buildCanChiEvidence(snapshot, locale),
    canChiDay: snapshot.canChiDay,
    suggestedQuestions: [],
    engineVersion: DAILY_INSIGHT_ENGINE_VERSION,
  };
  return { ...base, suggestedQuestions: suggestions(locale, base) };
}

export function getDailyInsightCacheKey(insight: Pick<DailyInsight, 'dateKey' | 'profileKey' | 'locale' | 'timeZone'>): string {
  return `@numelyra:daily-insight:v2:${insight.dateKey}:${insight.profileKey}:${insight.locale}:${insight.timeZone}`;
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
      ? parsed as DailyInsight
      : null;
  } catch {
    return null;
  }
}

