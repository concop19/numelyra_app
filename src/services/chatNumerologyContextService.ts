/**
 * chatNumerologyContextService.ts
 * Dịch vụ cung cấp dữ liệu luận giải Thần số học súc tích cho Chat Agent
 * Nạp trực tiếp từ assets/rule/ChatNumerologyContext.v1.json (không truy vấn SQLite cadao.db hay Supabase).
 */
import chatContextJson from '../../assets/rule/ChatNumerologyContext.v1.json';
import type { KnowledgeReadingResult } from './numerologyKnowledge';
import type { AppLocale } from '../i18n/translations';

export type ChatIndicatorKey =
  | 'walksOfLife'
  | 'mission'
  | 'soul'
  | 'personality'
  | 'dateOfBirth'
  | 'mature'
  | 'rationalThinking'
  | 'yearIndividual'
  | 'attitude';

interface IndicatorDefinition {
  name: string;
  values: Record<string, string>;
}

const indicatorsData = (chatContextJson.indicators || {}) as Record<string, IndicatorDefinition>;
const INDICATOR_NAMES_EN: Record<string, string> = {
  walksOfLife: 'Life Path', mission: 'Destiny', soul: 'Soul Urge', personality: 'Personality',
  dateOfBirth: 'Birthday Number', mature: 'Maturity Number', rationalThinking: 'Rational Thought',
  yearIndividual: 'Personal Year', attitude: 'Attitude',
};
const VALUE_THEMES_EN: Record<string, string> = {
  '0': 'an unavailable value that should be interpreted only after the source data is verified',
  '1': 'initiative, independence, and clear self-direction',
  '2': 'cooperation, sensitivity, and patient connection',
  '3': 'creative expression, communication, and social vitality',
  '4': 'structure, discipline, and dependable progress',
  '5': 'freedom, adaptability, and learning through experience',
  '6': 'care, responsibility, and the creation of harmony',
  '7': 'analysis, contemplation, and inner knowledge',
  '8': 'achievement, authority, and responsible stewardship',
  '9': 'compassion, completion, and a broad human perspective',
  '11': 'heightened intuition, inspiration, and perceptive sensitivity',
  '22': 'the Master Builder pattern of turning a large vision into durable form',
  '33': 'the Master Teacher pattern of compassionate service within healthy limits',
};

/**
 * Kiểm tra xem một key có thuộc 9 chỉ số được định nghĩa trong ChatNumerologyContext hay không.
 */
export function isChatContextIndicator(key: string): key is ChatIndicatorKey {
  return Object.prototype.hasOwnProperty.call(indicatorsData, key);
}

/**
 * Lấy tên tiếng Việt của chỉ số trong bộ 9 chỉ số.
 */
export function getChatIndicatorName(key: string, locale: AppLocale = 'vi'): string | undefined {
  return locale === 'en' ? INDICATOR_NAMES_EN[key] : indicatorsData[key]?.name;
}

/**
 * Lấy câu luận giải ngắn gọn (1-2 câu súc tích) cho một chỉ số và giá trị cụ thể.
 * @param key Mã chỉ số (ví dụ 'walksOfLife', 'mission', 'soul')
 * @param value Giá trị số (ví dụ 1, 7, 11, '22')
 */
export function getConciseIndicatorMeaning(
  key: string,
  value: string | number,
  locale: AppLocale = 'vi',
): string | undefined {
  const indicator = indicatorsData[key];
  if (!indicator?.values) return undefined;

  const rawStr = String(value).trim();
  if (locale === 'en') {
    const theme = VALUE_THEMES_EN[rawStr] || VALUE_THEMES_EN[String(parseInt(rawStr, 10))];
    const name = INDICATOR_NAMES_EN[key];
    return theme && name
      ? `${name} ${rawStr} emphasizes ${theme}. Use this as a reflection pattern rather than a fixed prediction.`
      : undefined;
  }
  return indicator.values[rawStr];
}

/**
 * Chuyển đổi dữ liệu súc tích thành KnowledgeReadingResult để tương thích với
 * MysticIndicatorDetailModal và IndicatorDetailModal mà không cần gọi SQLite cadao.db.
 */
export function getConciseIndicatorReading(
  key: string,
  value: string | number,
  cardName?: string,
  locale: AppLocale = 'vi',
): KnowledgeReadingResult | null {
  const meaning = getConciseIndicatorMeaning(key, value, locale);
  if (!meaning) return null;

  const indicatorName = getChatIndicatorName(key, locale) || cardName || key;
  return {
    title: `${indicatorName} ${value}`,
    source: 'computed-overview',
    overview: meaning,
    strengths: [],
    challenges: [],
    advice: '',
    fullContent: meaning,
  };
}

/**
 * Lấy toàn bộ danh sách 9 chỉ số và dữ liệu định nghĩa.
 */
export function getAllChatIndicators(): Record<string, IndicatorDefinition> {
  return indicatorsData;
}
