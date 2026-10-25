import {
  TRANSIT_ACTIVITY_WEIGHTS,
  type AspectType,
  type DetectedAspect,
  type NatalAspect,
} from '../../services/astro/aspectCalculator';
import type {
  AstroDominantSignal,
  PureAstroFeatureMetadata,
} from '../../services/astro/astroVectorEngine';
import type { AppLocale } from '../../i18n/translations';

export const PLANET_IDS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

export const ZODIAC_IDS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type PlanetId = (typeof PLANET_IDS)[number];
export type ZodiacId = (typeof ZODIAC_IDS)[number];
export type PlanetDetailMode = 'natal' | 'transit';

export type AstrologyDetailTarget =
  | { kind: 'planet'; id: PlanetId }
  | { kind: 'sign'; id: ZodiacId };

export function isPlanetId(value: string): value is PlanetId {
  return (PLANET_IDS as readonly string[]).includes(value);
}

export function isZodiacId(value: string): value is ZodiacId {
  return (ZODIAC_IDS as readonly string[]).includes(value);
}

export function resolveDetailConstellation(
  target: AstrologyDetailTarget,
  metadata?: PureAstroFeatureMetadata,
  mode: PlanetDetailMode = 'natal'
): ZodiacId {
  if (target.kind === 'sign') return target.id;

  const transitSign = metadata?.transitPlanets.find((planet) => planet.name === target.id)?.sign;
  const natalSign = metadata?.natalPlanets.find((planet) => planet.name === target.id)?.sign;
  const preferredSign = mode === 'transit' ? transitSign : natalSign;
  const fallbackSign = mode === 'transit' ? natalSign : transitSign;
  if (preferredSign && isZodiacId(preferredSign)) return preferredSign;
  if (fallbackSign && isZodiacId(fallbackSign)) return fallbackSign;

  return metadata?.natalSunSign && isZodiacId(metadata.natalSunSign)
    ? metadata.natalSunSign
    : 'Pisces';
}

export interface CelestialInfo {
  id: string;
  nameVi: string;
  symbol: string;
  description: string;
  themes: string[];
}

export interface TodaySummaryCard {
  id: 'energy' | 'emotion' | 'relationships' | 'actions';
  title: string;
  value: string;
  detail: string;
  icon: string;
  color: string;
  target?: AstrologyDetailTarget;
}

export interface EnergyFocusItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface PlanetGuidanceItem {
  id: PlanetId;
  sign: ZodiacId | null;
  degreeInSign: number | null;
  aspect: DetectedAspect | null;
  aspectText: string;
  natureLabel: string;
}

export interface AstrologyRuleTopicSummary {
  key: string;
  title: string;
  experience: string;
  advice: string;
}

export interface PlanetRuleInsight {
  key: string;
  title: string;
  experience: string;
  challenge: string;
  supportiveExpression: string;
  advice: string;
}

export function getAstrologyRuleTopicSummaries(
  metadata?: PureAstroFeatureMetadata
): AstrologyRuleTopicSummary[] {
  return (metadata?.ruleEvaluation?.topTopics ?? []).slice(0, 3).map((topic) => ({
    key: topic.topicId,
    title: topic.title,
    experience: topic.payload.experience,
    advice: topic.payload.advice,
  }));
}

export const ZODIAC_INFO: Record<ZodiacId, CelestialInfo> = {
  Aries: { id: 'Aries', nameVi: 'Bạch Dương', symbol: '♈', description: 'Nguồn lực khởi đầu, trực diện và sẵn sàng hành động.', themes: ['Tiên phong', 'Can đảm', 'Chủ động'] },
  Taurus: { id: 'Taurus', nameVi: 'Kim Ngưu', symbol: '♉', description: 'Năng lượng bền bỉ, cảm nhận giá trị và xây nền ổn định.', themes: ['Ổn định', 'Giá trị', 'Bền bỉ'] },
  Gemini: { id: 'Gemini', nameVi: 'Song Tử', symbol: '♊', description: 'Sự linh hoạt của tư duy, ngôn ngữ và trao đổi thông tin.', themes: ['Giao tiếp', 'Hiếu kỳ', 'Linh hoạt'] },
  Cancer: { id: 'Cancer', nameVi: 'Cự Giải', symbol: '♋', description: 'Chiều sâu cảm xúc, bản năng chăm sóc và nhu cầu thuộc về.', themes: ['Nuôi dưỡng', 'Trực giác', 'Bảo vệ'] },
  Leo: { id: 'Leo', nameVi: 'Sư Tử', symbol: '♌', description: 'Ánh sáng sáng tạo, biểu đạt bản thân và lòng tự trọng.', themes: ['Sáng tạo', 'Tự tin', 'Tỏa sáng'] },
  Virgo: { id: 'Virgo', nameVi: 'Xử Nữ', symbol: '♍', description: 'Khả năng quan sát, cải thiện và chăm chút điều thiết thực.', themes: ['Phân tích', 'Phục vụ', 'Tinh chỉnh'] },
  Libra: { id: 'Libra', nameVi: 'Thiên Bình', symbol: '♎', description: 'Nhu cầu cân bằng, hợp tác và tạo nên sự hài hòa.', themes: ['Cân bằng', 'Quan hệ', 'Thẩm mỹ'] },
  Scorpio: { id: 'Scorpio', nameVi: 'Bọ Cạp', symbol: '♏', description: 'Năng lực đi sâu, chuyển hóa và bảo vệ điều cốt lõi.', themes: ['Chuyển hóa', 'Chiều sâu', 'Ý chí'] },
  Sagittarius: { id: 'Sagittarius', nameVi: 'Nhân Mã', symbol: '♐', description: 'Động lực mở rộng trải nghiệm, niềm tin và tầm nhìn.', themes: ['Khám phá', 'Niềm tin', 'Tầm nhìn'] },
  Capricorn: { id: 'Capricorn', nameVi: 'Ma Kết', symbol: '♑', description: 'Tính kỷ luật, trách nhiệm và định hướng thành tựu.', themes: ['Kỷ luật', 'Cấu trúc', 'Thành tựu'] },
  Aquarius: { id: 'Aquarius', nameVi: 'Bảo Bình', symbol: '♒', description: 'Tư duy độc lập, cải tiến và kết nối với cộng đồng.', themes: ['Đổi mới', 'Độc lập', 'Cộng đồng'] },
  Pisces: { id: 'Pisces', nameVi: 'Song Ngư', symbol: '♓', description: 'Độ nhạy cảm, tưởng tượng và khả năng đồng cảm sâu.', themes: ['Đồng cảm', 'Trực giác', 'Tưởng tượng'] },
};

export const PLANET_INFO: Record<PlanetId, CelestialInfo> = {
  Sun: { id: 'Sun', nameVi: 'Mặt Trời', symbol: '☉', description: 'Trung tâm bản sắc, sức sống và ý thức về hướng đi.', themes: ['Bản sắc', 'Sức sống', 'Mục tiêu'] },
  Moon: { id: 'Moon', nameVi: 'Mặt Trăng', symbol: '☽', description: 'Thế giới cảm xúc, phản xạ và nhu cầu an toàn bên trong.', themes: ['Cảm xúc', 'Bản năng', 'An toàn'] },
  Mercury: { id: 'Mercury', nameVi: 'Sao Thủy', symbol: '☿', description: 'Cách tiếp nhận, xử lý và truyền đạt thông tin.', themes: ['Tư duy', 'Ngôn ngữ', 'Học hỏi'] },
  Venus: { id: 'Venus', nameVi: 'Sao Kim', symbol: '♀', description: 'Cách kết nối, cảm nhận giá trị và tìm kiếm sự hài hòa.', themes: ['Quan hệ', 'Giá trị', 'Hấp dẫn'] },
  Mars: { id: 'Mars', nameVi: 'Sao Hỏa', symbol: '♂', description: 'Động lực hành động, khẳng định ý chí và phản ứng trực tiếp.', themes: ['Hành động', 'Ý chí', 'Can đảm'] },
  Jupiter: { id: 'Jupiter', nameVi: 'Sao Mộc', symbol: '♃', description: 'Xu hướng mở rộng, phát triển niềm tin và tìm ý nghĩa.', themes: ['Mở rộng', 'Cơ hội', 'Niềm tin'] },
  Saturn: { id: 'Saturn', nameVi: 'Sao Thổ', symbol: '♄', description: 'Bài học về giới hạn, trách nhiệm và cấu trúc bền vững.', themes: ['Kỷ luật', 'Trách nhiệm', 'Trưởng thành'] },
  Uranus: { id: 'Uranus', nameVi: 'Thiên Vương', symbol: '♅', description: 'Nhu cầu đổi mới, tự do và phá vỡ khuôn mẫu cũ.', themes: ['Đổi mới', 'Tự do', 'Thức tỉnh'] },
  Neptune: { id: 'Neptune', nameVi: 'Hải Vương', symbol: '♆', description: 'Trực giác, lý tưởng và ranh giới tinh tế của cảm nhận.', themes: ['Trực giác', 'Lý tưởng', 'Cảm hứng'] },
  Pluto: { id: 'Pluto', nameVi: 'Diêm Vương', symbol: '♇', description: 'Quá trình chuyển hóa sâu và tái cấu trúc quyền lực.', themes: ['Chuyển hóa', 'Tái sinh', 'Chiều sâu'] },
};

export interface HouseInfo {
  number: number;
  nameVi: string;
  description: string;
}

export const HOUSE_INFO: Record<number, HouseInfo> = {
  1: { number: 1, nameVi: 'Bản thân', description: 'cách bạn hiện diện, khởi đầu và tạo ấn tượng trực tiếp' },
  2: { number: 2, nameVi: 'Giá trị & nguồn lực', description: 'giá trị cá nhân, nguồn lực và cảm giác ổn định' },
  3: { number: 3, nameVi: 'Giao tiếp & học hỏi', description: 'tư duy hằng ngày, giao tiếp và cách tiếp nhận thông tin' },
  4: { number: 4, nameVi: 'Gia đình & nền tảng', description: 'gốc rễ cảm xúc, gia đình và không gian riêng tư' },
  5: { number: 5, nameVi: 'Sáng tạo & biểu đạt', description: 'niềm vui, sáng tạo, tình cảm và khả năng thể hiện bản thân' },
  6: { number: 6, nameVi: 'Thói quen & phụng sự', description: 'nếp sống, công việc thường nhật và cách chăm sóc điều thiết thực' },
  7: { number: 7, nameVi: 'Quan hệ & hợp tác', description: 'quan hệ một-một, cam kết và cách bạn gặp gỡ người khác' },
  8: { number: 8, nameVi: 'Chuyển hóa & sẻ chia', description: 'sự thân mật, nguồn lực chung và những thay đổi ở tầng sâu' },
  9: { number: 9, nameVi: 'Niềm tin & mở rộng', description: 'thế giới quan, học vấn cao hơn và hành trình mở rộng trải nghiệm' },
  10: { number: 10, nameVi: 'Sự nghiệp & vị thế', description: 'hướng phát triển công khai, trách nhiệm và vai trò trong xã hội' },
  11: { number: 11, nameVi: 'Cộng đồng & tương lai', description: 'bạn bè, cộng đồng, lý tưởng và kế hoạch dài hạn' },
  12: { number: 12, nameVi: 'Nội tâm & buông xả', description: 'đời sống vô thức, khoảng lặng và những điều cần được khép lại' },
};

const ZODIAC_EXPRESSION_VI: Record<ZodiacId, string> = {
  Aries: 'chủ động, nhanh và trực diện',
  Taurus: 'bền bỉ, thực tế và hướng tới sự ổn định',
  Gemini: 'linh hoạt, hiếu kỳ và giàu nhu cầu trao đổi',
  Cancer: 'nhạy cảm, bảo vệ và gắn với cảm giác thuộc về',
  Leo: 'ấm áp, sáng tạo và muốn được biểu đạt rõ ràng',
  Virgo: 'quan sát kỹ, thực tế và chú trọng cải thiện',
  Libra: 'cân nhắc, hợp tác và tìm kiếm sự hài hòa',
  Scorpio: 'tập trung, sâu sắc và có xu hướng chuyển hóa tận gốc',
  Sagittarius: 'cởi mở, hướng ngoại và muốn mở rộng tầm nhìn',
  Capricorn: 'kỷ luật, có cấu trúc và hướng tới kết quả lâu dài',
  Aquarius: 'độc lập, đổi mới và quan tâm tới bức tranh tập thể',
  Pisces: 'trực giác, cảm thông và dễ tiếp nhận những tín hiệu tinh tế',
};

const ZODIAC_EXPRESSION_EN: Record<ZodiacId, string> = {
  Aries: 'direct, decisive, and ready to initiate',
  Taurus: 'steady, practical, and oriented toward stability',
  Gemini: 'flexible, curious, and eager to exchange ideas',
  Cancer: 'sensitive, protective, and guided by belonging',
  Leo: 'warm, creative, and openly expressive',
  Virgo: 'observant, practical, and focused on improvement',
  Libra: 'considerate, cooperative, and harmony-seeking',
  Scorpio: 'focused, deep, and capable of thorough transformation',
  Sagittarius: 'open, exploratory, and eager to broaden perspective',
  Capricorn: 'disciplined, structured, and committed to lasting results',
  Aquarius: 'independent, innovative, and aware of the wider community',
  Pisces: 'intuitive, compassionate, and receptive to subtle signals',
};

const HOUSE_DESCRIPTIONS_EN: Record<number, string> = {
  1: 'how you present yourself, initiate, and make a direct impression',
  2: 'personal values, resources, and your sense of stability',
  3: 'everyday thinking, communication, and learning',
  4: 'emotional roots, home, and private foundations',
  5: 'joy, creativity, romance, and self-expression',
  6: 'routines, daily work, and practical care',
  7: 'one-to-one relationships, commitment, and cooperation',
  8: 'intimacy, shared resources, and deep transformation',
  9: 'worldview, higher learning, and expanded experience',
  10: 'public direction, responsibility, and social role',
  11: 'friends, community, ideals, and long-term plans',
  12: 'the inner world, retreat, and what is ready to be released',
};

const ASPECT_ENERGY_VI: Record<AspectType, string> = {
  conjunction: 'Hai nguồn lực hội tụ và khuếch đại lẫn nhau; cách sử dụng năng lượng này quyết định nó dễ chịu hay căng thẳng.',
  sextile: 'Một cơ hội hỗ trợ nhẹ đang mở ra, nhưng cần sự chủ động để biến tiềm năng thành hành động.',
  square: 'Ma sát giữa hai nhu cầu tạo áp lực phải điều chỉnh, đồng thời cung cấp động lực để thay đổi.',
  trine: 'Hai nguồn lực phối hợp tự nhiên, giúp năng lượng lưu chuyển thuận lợi và dễ được phát huy.',
  opposition: 'Hai đầu nhu cầu kéo theo hướng khác nhau, đòi hỏi sự cân bằng và nhận biết cả hai phía.',
};

const ASPECT_ENERGY_EN: Record<AspectType, string> = {
  conjunction: 'The two forces converge and amplify each other; how they are directed determines whether the result feels supportive or intense.',
  sextile: 'A gentle opportunity for support is available, but initiative is needed to turn potential into action.',
  square: 'Friction between two needs calls for adjustment while also supplying momentum for change.',
  trine: 'The two forces cooperate naturally, allowing their energy to flow and develop with ease.',
  opposition: 'Two needs pull in different directions, asking for balance and awareness of both sides.',
};

const SIGNAL_LABELS: Record<AstroDominantSignal, string> = {
  tension: 'Cần điều chỉnh',
  harmony: 'Thuận dòng',
  conjunction: 'Đang hội tụ',
  balanced: 'Cân bằng',
};

const SIGNAL_LABELS_EN: Record<AstroDominantSignal, string> = {
  tension: 'Needs adjustment',
  harmony: 'In flow',
  conjunction: 'Converging',
  balanced: 'Balanced',
};

const SIGNAL_DETAILS_EN: Record<AstroDominantSignal, string> = {
  tension: 'Friction aspects are more prominent, making this a good time to review your plans.',
  harmony: 'Supportive aspects are prominent, creating favorable conditions for moving plans forward.',
  conjunction: 'Several currents are converging strongly; focus on the priority that needs momentum.',
  balanced: 'The influences are fairly balanced, supporting a steady pace and attentive observation.',
};

const ASPECT_NAMES_EN: Record<AspectType, string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'opposite',
};

const PLANET_THEMES_EN: Record<PlanetId, string[]> = {
  Sun: ['Identity', 'Vitality', 'Purpose'],
  Moon: ['Emotions', 'Instinct', 'Security'],
  Mercury: ['Thinking', 'Language', 'Learning'],
  Venus: ['Relationships', 'Values', 'Attraction'],
  Mars: ['Action', 'Will', 'Courage'],
  Jupiter: ['Expansion', 'Opportunity', 'Faith'],
  Saturn: ['Discipline', 'Responsibility', 'Maturity'],
  Uranus: ['Innovation', 'Freedom', 'Awakening'],
  Neptune: ['Intuition', 'Ideals', 'Inspiration'],
  Pluto: ['Transformation', 'Renewal', 'Depth'],
};

const PLANET_DESCRIPTIONS_EN: Record<PlanetId, string> = {
  Sun: 'The center of identity, vitality, and conscious direction.',
  Moon: 'The emotional world, instinctive responses, and inner need for safety.',
  Mercury: 'How information is received, processed, and communicated.',
  Venus: 'How you connect, recognize value, and seek harmony.',
  Mars: 'The drive to act, assert your will, and respond directly.',
  Jupiter: 'The impulse to expand, develop faith, and seek meaning.',
  Saturn: 'Lessons of limits, responsibility, and lasting structure.',
  Uranus: 'The need for innovation, freedom, and breaking old patterns.',
  Neptune: 'Intuition, ideals, and the subtle boundaries of perception.',
  Pluto: 'Deep transformation and the restructuring of power.',
};

const HOUSE_TOPICS_EN: Record<number, string> = {
  1: 'Self and identity',
  2: 'Values and resources',
  3: 'Communication and learning',
  4: 'Home and foundations',
  5: 'Creativity and expression',
  6: 'Routines and service',
  7: 'Relationships and partnership',
  8: 'Transformation and shared resources',
  9: 'Beliefs and expansion',
  10: 'Career and public role',
  11: 'Community and the future',
  12: 'Inner life and release',
};

export function zodiacLabel(sign: string, locale: AppLocale = 'vi'): string {
  const info = isZodiacId(sign) ? ZODIAC_INFO[sign] : undefined;
  return info ? `${locale === 'en' ? info.id : info.nameVi} ${info.symbol}` : sign;
}

export function planetLabel(planet: string, locale: AppLocale = 'vi'): string {
  return isPlanetId(planet) ? (locale === 'en' ? PLANET_INFO[planet].id : PLANET_INFO[planet].nameVi) : planet;
}

export function planetThemes(planet: PlanetId, locale: AppLocale = 'vi'): string[] {
  return locale === 'en' ? PLANET_THEMES_EN[planet] : PLANET_INFO[planet].themes;
}

export function planetDescription(planet: PlanetId, locale: AppLocale = 'vi'): string {
  return locale === 'en' ? PLANET_DESCRIPTIONS_EN[planet] : PLANET_INFO[planet].description;
}

function scoreLevel(value: number, locale: AppLocale): string {
  if (value >= 0.67) return locale === 'en' ? 'Strong' : 'Mạnh';
  if (value >= 0.34) return locale === 'en' ? 'Moderate' : 'Vừa';
  return locale === 'en' ? 'Gentle' : 'Nhẹ';
}

function findAspect(metadata: PureAstroFeatureMetadata, planet: string): DetectedAspect | undefined {
  return metadata.notableTransitAspects.find(
    (aspect) => aspect.transitPlanet === planet || aspect.natalPlanet === planet
  );
}

function aspectLine(aspect: DetectedAspect, locale: AppLocale = 'vi'): string {
  const aspectName = locale === 'en'
    ? ASPECT_NAMES_EN[aspect.type]
    : aspect.nameVi.toLocaleLowerCase('vi-VN');
  return `${planetLabel(aspect.transitPlanet, locale)} ${aspectName} ${planetLabel(aspect.natalPlanet, locale)} · orb ${aspect.orb.toFixed(1)}°`;
}

export function getPlanetGuidanceItems(metadata: PureAstroFeatureMetadata, locale: AppLocale = 'vi'): PlanetGuidanceItem[] {
  return PLANET_IDS.map((id) => {
    const transit = metadata.transitPlanets.find((planet) => planet.name === id);
    const allAspects = metadata.transitAspects ?? metadata.notableTransitAspects;
    const outgoing = sortTransitAspects(
      allAspects.filter((item) => item.transitPlanet === id)
    )[0];
    const incoming = sortTransitAspects(
      allAspects.filter((item) => item.natalPlanet === id)
    )[0];
    const aspect = outgoing ?? incoming ?? null;
    const sign = transit && isZodiacId(transit.sign) ? transit.sign : null;
    return {
      id,
      sign,
      degreeInSign: transit?.degreeInSign ?? null,
      aspect,
      aspectText: aspect
        ? aspectLine(aspect, locale)
        : sign
          ? locale === 'en'
            ? `${zodiacLabel(sign, locale)} · ${transit!.degreeInSign.toFixed(1)}° today`
            : `${zodiacLabel(sign, locale)} · ${transit!.degreeInSign.toFixed(1)}° hôm nay`
          : locale === 'en' ? "Moving with today's sky" : 'Đang đồng hành trong nhịp trời hôm nay',
      natureLabel: aspect
        ? aspect.nature === 'harmony'
          ? locale === 'en' ? 'Supportive aspect' : 'Góc hỗ trợ'
          : aspect.nature === 'tension'
            ? locale === 'en' ? 'Challenging aspect' : 'Góc thử thách'
            : locale === 'en' ? 'Converging aspect' : 'Góc hội tụ'
        : locale === 'en' ? 'Neutral rhythm' : 'Nhịp trung tính',
    };
  });
}

export function getTodaySummaryCards(metadata: PureAstroFeatureMetadata, locale: AppLocale = 'vi'): TodaySummaryCard[] {
  const moonAspect = findAspect(metadata, 'Moon');
  const venusAspect = findAspect(metadata, 'Venus');
  const activeHouse = metadata.dailyContext?.activatedHouses[0];

  return [
    {
      id: 'energy',
      title: locale === 'en' ? 'Energy' : 'Năng lượng',
      value: scoreLevel(metadata.scores.fastPlanetActivity, locale),
      detail: locale === 'en'
        ? `Fast-planet activity ${Math.round(metadata.scores.fastPlanetActivity * 100)}%`
        : `Nhịp hành tinh nhanh ${Math.round(metadata.scores.fastPlanetActivity * 100)}%`,
      icon: 'sparkles',
      color: '#9B8CFF',
    },
    {
      id: 'emotion',
      title: locale === 'en' ? 'Emotion' : 'Cảm xúc',
      value: zodiacLabel(metadata.transitMoonSign, locale),
      detail: moonAspect ? aspectLine(moonAspect, locale) : locale === 'en' ? 'No notable major Moon aspects' : 'Không có góc Mặt Trăng chính nổi bật',
      icon: 'moon',
      color: '#73D7FF',
      target: { kind: 'planet', id: 'Moon' },
    },
    {
      id: 'relationships',
      title: locale === 'en' ? 'Relationships' : 'Quan hệ',
      value: venusAspect ? (locale === 'en' ? SIGNAL_LABELS_EN : SIGNAL_LABELS)[metadata.dominantSignal] : locale === 'en' ? 'Steady rhythm' : 'Nhịp ổn định',
      detail: venusAspect ? aspectLine(venusAspect, locale) : locale === 'en' ? 'No notable major Venus aspects' : 'Không có góc Sao Kim chính nổi bật',
      icon: 'heart',
      color: '#FF7BB7',
      target: { kind: 'planet', id: 'Venus' },
    },
    {
      id: 'actions',
      title: locale === 'en' ? 'Action' : 'Hành động',
      value: (locale === 'en' ? SIGNAL_LABELS_EN : SIGNAL_LABELS)[metadata.dominantSignal],
      detail: activeHouse
        ? locale === 'en'
          ? `House ${activeHouse.house} · ${HOUSE_TOPICS_EN[activeHouse.house] ?? 'Current focus'}`
          : `Nhà ${activeHouse.house} · ${activeHouse.topicVi}`
        : locale === 'en' ? SIGNAL_DETAILS_EN[metadata.dominantSignal] : metadata.vibeSummary,
      icon: 'navigate',
      color: '#FFD166',
      target: metadata.topAspect && isPlanetId(metadata.topAspect.transitPlanet)
        ? { kind: 'planet', id: metadata.topAspect.transitPlanet }
        : undefined,
    },
  ];
}

export function getEnergyFocus(metadata: PureAstroFeatureMetadata): EnergyFocusItem[] {
  return [
    { id: 'harmony', label: 'Hài hòa', value: metadata.scores.harmony, color: '#5EEAD4' },
    { id: 'tension', label: 'Thử thách', value: metadata.scores.tension, color: '#FB7185' },
    { id: 'conjunction', label: 'Hội tụ', value: metadata.scores.conjunction, color: '#FBBF24' },
    { id: 'activity', label: 'Nhịp nhanh', value: metadata.scores.fastPlanetActivity, color: '#818CF8' },
  ];
}

export function getPrecisionMessage(metadata: PureAstroFeatureMetadata, locale: AppLocale = 'vi'): string {
  if (metadata.birthDataPrecision === 'complete') {
    if (metadata.natalContext?.isLocalTimeAmbiguous) {
      return locale === 'en'
        ? 'Birth time and place are available. This time falls within a daylight-saving overlap, so the first occurrence is used.'
        : 'Đã có giờ và nơi sinh. Thời điểm này nằm trong khoảng giờ lặp do chuyển giờ mùa hè; hệ thống dùng lần xuất hiện đầu tiên.';
    }
    return locale === 'en'
      ? 'Birth time, place, and time zone are available. The Ascendant, Midheaven, and 12 houses use the Porphyry system.'
      : 'Đã có giờ, nơi sinh và múi giờ. ASC, MC và 12 nhà dùng hệ Porphyry.';
  }
  if (metadata.birthDataPrecision === 'timeWithoutLocation') {
    return locale === 'en'
      ? 'Birth time is available, but birth place and time zone are missing. UTC is used temporarily; the Ascendant, Midheaven, and 12 houses are hidden.'
      : 'Đã có giờ sinh nhưng chưa có nơi sinh/múi giờ. Vị trí hiện tạm quy chiếu UTC; ASC, MC và 12 nhà chưa được hiển thị.';
  }
  return locale === 'en'
    ? 'Exact birth time is unavailable. The chart temporarily uses 12:00; the Ascendant, Midheaven, and 12 houses are hidden.'
    : 'Chưa có giờ sinh chính xác. Lá số đang dùng mốc 12:00 tạm tính; ASC, MC và 12 nhà chưa được hiển thị.';
}

function transitAspectStrength(aspect: DetectedAspect): number {
  return aspect.weight * (TRANSIT_ACTIVITY_WEIGHTS[aspect.transitPlanet] ?? 0.25);
}

function sortTransitAspects(aspects: DetectedAspect[]): DetectedAspect[] {
  return [...aspects].sort((left, right) => (
    transitAspectStrength(right) - transitAspectStrength(left)
    || left.orb - right.orb
  ));
}

export function getNatalAspectsForPlanet(
  metadata: PureAstroFeatureMetadata,
  planet: PlanetId
): NatalAspect[] {
  return metadata.natalAspects
    .filter((aspect) => aspect.planetA === planet || aspect.planetB === planet)
    .sort((left, right) => right.weight - left.weight || left.orb - right.orb);
}

export function getIncomingTransitAspects(
  metadata: PureAstroFeatureMetadata,
  natalPlanet: PlanetId
): DetectedAspect[] {
  const aspects = metadata.transitAspects ?? metadata.notableTransitAspects;
  return sortTransitAspects(aspects.filter((aspect) => aspect.natalPlanet === natalPlanet));
}

export function getOutgoingTransitAspects(
  metadata: PureAstroFeatureMetadata,
  transitPlanet: PlanetId
): DetectedAspect[] {
  const aspects = metadata.transitAspects ?? metadata.notableTransitAspects;
  return sortTransitAspects(aspects.filter((aspect) => aspect.transitPlanet === transitPlanet));
}

export function getNatalAspectCounterpart(aspect: NatalAspect, planet: PlanetId): string {
  return aspect.planetA === planet ? aspect.planetB : aspect.planetA;
}

export function getAspectEnergyDescription(type: AspectType, locale: AppLocale = 'vi'): string {
  return locale === 'en' ? ASPECT_ENERGY_EN[type] : ASPECT_ENERGY_VI[type];
}

export function describeTransitAspect(aspect: DetectedAspect, locale: AppLocale = 'vi'): string {
  const transit = isPlanetId(aspect.transitPlanet) ? PLANET_INFO[aspect.transitPlanet] : undefined;
  const natal = isPlanetId(aspect.natalPlanet) ? PLANET_INFO[aspect.natalPlanet] : undefined;
  if (locale === 'en') {
    const transitTheme = transit && isPlanetId(aspect.transitPlanet)
      ? planetThemes(aspect.transitPlanet, locale)[0]?.toLocaleLowerCase('en-US')
      : 'current movement';
    const natalTheme = natal && isPlanetId(aspect.natalPlanet)
      ? planetThemes(aspect.natalPlanet, locale)[0]?.toLocaleLowerCase('en-US')
      : 'natal foundation';
    return `The ${transitTheme} of ${planetLabel(aspect.transitPlanet, locale)} is touching the natal ${natalTheme} of ${planetLabel(aspect.natalPlanet, locale)}. ${getAspectEnergyDescription(aspect.type, locale)}`;
  }
  const transitTheme = transit?.themes[0]?.toLocaleLowerCase('vi-VN') ?? 'chuyển động hiện tại';
  const natalTheme = natal?.themes[0]?.toLocaleLowerCase('vi-VN') ?? 'nền tảng bản mệnh';
  return `Nhịp ${transitTheme} của ${planetLabel(aspect.transitPlanet)} đang chạm vào vùng ${natalTheme} của ${planetLabel(aspect.natalPlanet)} bản mệnh. ${getAspectEnergyDescription(aspect.type)}`;
}

export function describeNatalAspect(aspect: NatalAspect, locale: AppLocale = 'vi'): string {
  const first = isPlanetId(aspect.planetA) ? PLANET_INFO[aspect.planetA] : undefined;
  const second = isPlanetId(aspect.planetB) ? PLANET_INFO[aspect.planetB] : undefined;
  if (locale === 'en') {
    const firstTheme = first && isPlanetId(aspect.planetA)
      ? planetThemes(aspect.planetA, locale)[0]?.toLocaleLowerCase('en-US')
      : 'first force';
    const secondTheme = second && isPlanetId(aspect.planetB)
      ? planetThemes(aspect.planetB, locale)[0]?.toLocaleLowerCase('en-US')
      : 'second force';
    return `In the natal chart, the ${firstTheme} of ${planetLabel(aspect.planetA, locale)} connects with the ${secondTheme} of ${planetLabel(aspect.planetB, locale)}. ${getAspectEnergyDescription(aspect.type, locale)}`;
  }
  const firstTheme = first?.themes[0]?.toLocaleLowerCase('vi-VN') ?? 'nguồn lực thứ nhất';
  const secondTheme = second?.themes[0]?.toLocaleLowerCase('vi-VN') ?? 'nguồn lực thứ hai';
  return `Trong bản mệnh, mạch ${firstTheme} của ${planetLabel(aspect.planetA)} liên hệ với mạch ${secondTheme} của ${planetLabel(aspect.planetB)}. ${getAspectEnergyDescription(aspect.type)}`;
}

export function getPlanetRuleInsights(
  metadata: PureAstroFeatureMetadata,
  planet: PlanetId,
  mode: PlanetDetailMode,
  locale: AppLocale = 'vi'
): PlanetRuleInsight[] {
  const matches = metadata.ruleEvaluation?.matches ?? [];
  const placementPrefix = `placement.planet.${planet}.`;
  const transitHousePrefix = `transit.house.${planet}.`;
  const seen = new Set<string>();

  return matches.flatMap((match) => {
    const primaryId = match.ruleIds[0] ?? '';
    // Aspect rules already have their own list below the guidance cards. Keeping
    // them here would describe the same transit twice and repeat a generic
    // caution for every aspect.
    const relevant = mode === 'natal'
      ? primaryId.startsWith(placementPrefix)
      : primaryId.startsWith(transitHousePrefix);
    if (!relevant) return [];

    const payloadKey = [
      match.payload.experience,
      match.payload.challenge,
      match.payload.supportiveExpression,
      match.payload.advice,
    ].join('|');
    if (seen.has(payloadKey)) return [];
    seen.add(payloadKey);

    let title = locale === 'en'
      ? mode === 'natal' ? `${planetLabel(planet, locale)} signature` : `Current ${planetLabel(planet, locale)} rhythm`
      : mode === 'natal' ? `Dấu ấn ${planetLabel(planet)}` : `Nhịp hiện tại của ${planetLabel(planet)}`;
    if (primaryId.includes('.sign.')) title = locale === 'en' ? 'Expression style' : 'Cách biểu đạt';
    if (primaryId.includes('.house.')) title = locale === 'en'
      ? mode === 'natal' ? 'Area of expression' : 'Transit focus'
      : mode === 'natal' ? 'Lĩnh vực biểu hiện' : 'Trọng tâm quá cảnh';

    const signMatch = primaryId.match(/\.sign\.([A-Za-z]+)$/);
    const sign = signMatch && isZodiacId(signMatch[1]) ? signMatch[1] : undefined;
    const houseMatch = primaryId.match(/\.house\.(\d+)$/);
    const house = houseMatch ? Number(houseMatch[1]) : undefined;
    const englishFocus = sign
      ? `${sign}'s ${ZODIAC_EXPRESSION_EN[sign]} style`
      : house ? `House ${house} themes of ${HOUSE_TOPICS_EN[house] ?? 'current focus'}` : 'this planetary pattern';
    const englishChallenge = mode === 'natal'
      ? `${planetLabel(planet, locale)} can become one-sided when ${englishFocus} is expressed without enough reflection or balance.`
      : `${planetLabel(planet, locale)} may temporarily intensify ${englishFocus}, making priorities feel more urgent than usual.`;
    const englishAdvice = mode === 'natal'
      ? `Give ${planetLabel(planet, locale)} a clear, constructive role and leave room for the needs represented by the rest of the chart.`
      : `Work with this transit deliberately: choose one useful action, keep the pace sustainable, and review the result before pushing further.`;

    return [{
      key: `${mode}-${planet}-${seen.size}`,
      title,
      experience: locale === 'en' ? `${planetLabel(planet, locale)} is currently emphasizing ${englishFocus}.` : match.payload.experience,
      challenge: locale === 'en' ? englishChallenge : match.payload.challenge,
      supportiveExpression: locale === 'en' ? `A balanced expression channels this energy into clear, proportionate choices.` : match.payload.supportiveExpression,
      advice: locale === 'en' ? englishAdvice : match.payload.advice,
    }];
  }).slice(0, 2);
}

export function buildPlanetPlacementInterpretation(
  planet: PlanetId,
  sign: string | undefined,
  house: number | undefined,
  mode: PlanetDetailMode,
  locale: AppLocale = 'vi'
): string[] {
  const info = PLANET_INFO[planet];
  if (locale === 'en') {
    const description = planetDescription(planet, locale);
    const normalizedDescription = `${description.charAt(0).toLocaleLowerCase('en-US')}${description.slice(1)}`;
    const paragraphs = [`${planetLabel(planet, locale)} represents ${normalizedDescription}`];
    if (sign && isZodiacId(sign)) {
      const modeLead = mode === 'natal'
        ? 'In the natal chart, this energy is expressed'
        : 'At this time, this energy is operating';
      paragraphs.push(`${modeLead} in a ${ZODIAC_EXPRESSION_EN[sign]} way as it moves through ${zodiacLabel(sign, locale)}.`);
    }
    if (house) {
      const houseDescription = HOUSE_DESCRIPTIONS_EN[house];
      if (houseDescription) {
        const houseLead = mode === 'natal'
          ? `House ${house} shows that this energy is often expressed through`
          : `While moving through House ${house} in your chart, this energy temporarily focuses on`;
        paragraphs.push(`${houseLead} ${houseDescription}.`);
      }
    }
    return paragraphs;
  }
  const normalizedDescription = `${info.description.charAt(0).toLocaleLowerCase('vi-VN')}${info.description.slice(1)}`;
  const paragraphs = [`${info.nameVi} đại diện cho ${normalizedDescription}`];
  if (sign && isZodiacId(sign)) {
    const modeLead = mode === 'natal'
      ? 'Trong bản mệnh, nguồn lực này được biểu đạt'
      : 'Ở thời điểm hiện tại, nguồn lực này đang vận hành';
    paragraphs.push(`${modeLead} theo cách ${ZODIAC_EXPRESSION_VI[sign]} khi đi qua ${zodiacLabel(sign)}.`);
  }
  const houseInfo = house ? HOUSE_INFO[house] : undefined;
  if (houseInfo) {
    const houseLead = mode === 'natal'
      ? `Nhà ${house} cho biết năng lượng này thường bộc lộ qua`
      : `Khi đi qua Nhà ${house} trong lá số của bạn, năng lượng tạm thời tập trung vào`;
    paragraphs.push(`${houseLead} ${houseInfo.description}.`);
  }
  return paragraphs;
}

export function buildPlanetModeSummary(
  metadata: PureAstroFeatureMetadata,
  planet: PlanetId,
  mode: PlanetDetailMode,
  locale: AppLocale = 'vi'
): string {
  const placement = mode === 'natal'
    ? metadata.natalPlanets.find((item) => item.name === planet)
    : metadata.transitPlanets.find((item) => item.name === planet);
  const house = mode === 'natal'
    ? metadata.natalContext?.planetHouses[planet]
    : metadata.dailyContext?.transitHouses[planet];
  const sentences = buildPlanetPlacementInterpretation(planet, placement?.sign, house, mode, locale);

  if (mode === 'natal') {
    const natalAspect = getNatalAspectsForPlanet(metadata, planet)[0];
    if (natalAspect) {
      const counterpart = getNatalAspectCounterpart(natalAspect, planet);
      sentences.push(locale === 'en'
        ? `The strongest natal aspect connects ${planetLabel(planet, locale)} with ${planetLabel(counterpart, locale)} through a ${ASPECT_NAMES_EN[natalAspect.type]}, orb ${natalAspect.orb.toFixed(1)}°.`
        : `Góc bản mệnh nổi bật nhất nối ${planetLabel(planet)} với ${planetLabel(counterpart)} qua ${natalAspect.nameVi.toLocaleLowerCase('vi-VN')}, orb ${natalAspect.orb.toFixed(1)}°.`);
    }
    const incoming = getIncomingTransitAspects(metadata, planet)[0];
    if (incoming) {
      sentences.push(locale === 'en'
        ? `The strongest current influence comes from ${planetLabel(incoming.transitPlanet, locale)} through a ${ASPECT_NAMES_EN[incoming.type]}, orb ${incoming.orb.toFixed(1)}°.`
        : `Tác động hiện tại nổi bật nhất đến từ ${planetLabel(incoming.transitPlanet)} qua ${incoming.nameVi.toLocaleLowerCase('vi-VN')}, orb ${incoming.orb.toFixed(1)}°.`);
    }
  } else {
    const outgoing = getOutgoingTransitAspects(metadata, planet)[0];
    if (outgoing) {
      sentences.push(locale === 'en'
        ? `Current ${planetLabel(planet, locale)} most strongly influences natal ${planetLabel(outgoing.natalPlanet, locale)} through a ${ASPECT_NAMES_EN[outgoing.type]}, orb ${outgoing.orb.toFixed(1)}°.`
        : `${planetLabel(planet)} hiện tác động rõ nhất lên ${planetLabel(outgoing.natalPlanet)} bản mệnh qua ${outgoing.nameVi.toLocaleLowerCase('vi-VN')}, orb ${outgoing.orb.toFixed(1)}°.`);
    }
  }

  return sentences.join(' ');
}

export function getActiveInfluences(
  metadata: PureAstroFeatureMetadata,
  target?: AstrologyDetailTarget
): DetectedAspect[] {
  if (!target) return metadata.notableTransitAspects.slice(0, 4);
  const aspects = sortTransitAspects(metadata.transitAspects ?? metadata.notableTransitAspects);
  if (target.kind === 'planet') {
    return aspects.filter(
      (aspect) => aspect.transitPlanet === target.id || aspect.natalPlanet === target.id
    ).slice(0, 4);
  }
  const planetsInSign = new Set(
    metadata.natalPlanets.filter((planet) => planet.sign === target.id).map((planet) => planet.name)
  );
  return aspects.filter(
    (aspect) => planetsInSign.has(aspect.transitPlanet) || planetsInSign.has(aspect.natalPlanet)
  ).slice(0, 4);
}

export function buildTodayInterpretation(
  metadata: PureAstroFeatureMetadata,
  target?: AstrologyDetailTarget
): string {
  const sentences = [metadata.vibeSummary];
  if (target?.kind === 'planet') {
    const natal = metadata.natalPlanets.find((planet) => planet.name === target.id);
    const transit = metadata.transitPlanets.find((planet) => planet.name === target.id);
    if (natal) {
      sentences.push(`${planetLabel(target.id)} bản mệnh ở ${zodiacLabel(natal.sign)} ${natal.degreeInSign.toFixed(1)}°.`);
    } else if (transit) {
      sentences.push(`${planetLabel(target.id)} hôm nay ở ${zodiacLabel(transit.sign)} ${transit.degreeInSign.toFixed(1)}°.`);
    }
  } else if (target?.kind === 'sign') {
    const placements = metadata.natalPlanets.filter((planet) => planet.sign === target.id);
    if (placements.length > 0) {
      sentences.push(`${zodiacLabel(target.id)} chứa ${placements.map((planet) => planetLabel(planet.name)).join(', ')} trong lá số bản mệnh.`);
    }
  }
  const relevantAspect = target
    ? getActiveInfluences(metadata, target)[0]
    : metadata.topAspect;
  if (relevantAspect) {
    sentences.push(`Góc nổi bật liên quan: ${aspectLine(relevantAspect)}.`);
  }
  const house = metadata.dailyContext?.activatedHouses[0];
  if (house) sentences.push(`Trọng tâm đang nghiêng về Nhà ${house.house} — ${house.topicVi}.`);
  return sentences.join(' ');
}

export function getCelestialInfo(target: AstrologyDetailTarget): CelestialInfo {
  const fallback: CelestialInfo = {
    id: target.id,
    nameVi: target.id,
    symbol: '✦',
    description: 'Dữ liệu chi tiết đang được tổng hợp từ lá số hiện tại.',
    themes: [],
  };
  return target.kind === 'planet'
    ? PLANET_INFO[target.id] ?? fallback
    : ZODIAC_INFO[target.id] ?? fallback;
}

export function formatAspect(aspect: DetectedAspect): string {
  return aspectLine(aspect, 'vi');
}
