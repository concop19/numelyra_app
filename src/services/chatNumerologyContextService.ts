/**
 * chatNumerologyContextService.ts
 * Dịch vụ cung cấp dữ liệu luận giải Thần số học súc tích cho Chat Agent
 * Nạp trực tiếp từ assets/rule/ChatNumerologyContext.v1.json (không truy vấn SQLite cadao.db hay Supabase).
 */
import chatContextJson from '../../assets/rule/ChatNumerologyContext.v1.json';
import type { KnowledgeReadingResult } from './numerologyKnowledge';

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

/**
 * Kiểm tra xem một key có thuộc 9 chỉ số được định nghĩa trong ChatNumerologyContext hay không.
 */
export function isChatContextIndicator(key: string): key is ChatIndicatorKey {
  return Object.prototype.hasOwnProperty.call(indicatorsData, key);
}

/**
 * Lấy tên tiếng Việt của chỉ số trong bộ 9 chỉ số.
 */
export function getChatIndicatorName(key: string): string | undefined {
  return indicatorsData[key]?.name;
}

/**
 * Lấy câu luận giải ngắn gọn (1-2 câu súc tích) cho một chỉ số và giá trị cụ thể.
 * @param key Mã chỉ số (ví dụ 'walksOfLife', 'mission', 'soul')
 * @param value Giá trị số (ví dụ 1, 7, 11, '22')
 */
export function getConciseIndicatorMeaning(
  key: string,
  value: string | number
): string | undefined {
  const indicator = indicatorsData[key];
  if (!indicator?.values) return undefined;

  const rawStr = String(value).trim();
  return indicator.values[rawStr];
}

/**
 * Chuyển đổi dữ liệu súc tích thành KnowledgeReadingResult để tương thích với
 * MysticIndicatorDetailModal và IndicatorDetailModal mà không cần gọi SQLite cadao.db.
 */
export function getConciseIndicatorReading(
  key: string,
  value: string | number,
  cardNameVi?: string
): KnowledgeReadingResult | null {
  const meaning = getConciseIndicatorMeaning(key, value);
  if (!meaning) return null;

  const indicatorName = indicatorsData[key]?.name || cardNameVi || key;
  return {
    title: `${indicatorName} ${value}`,
    source: 'offline-archetype',
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
