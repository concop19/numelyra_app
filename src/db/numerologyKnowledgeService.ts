/**
 * Truy vấn kho luận giải thần số học nằm trong SQLite cadao.db.
 * Dữ liệu được đóng gói cùng ứng dụng, không cần mạng hay Supabase lúc chạy.
 */
import { openCaDaoDatabase } from './cadaoService';
import type { AppLocale } from '../i18n/translations';

export interface NumerologyKnowledgeDbRow {
  indicator_key: string;
  number_value: string;
  title: string;
  content: string;
  locale: AppLocale;
  review_status: 'draft' | 'approved';
}

export async function fetchNumerologyKnowledgeRows(
  indicatorKey: string,
  numberValues: string[],
  locale: AppLocale,
): Promise<NumerologyKnowledgeDbRow[]> {
  if (numberValues.length === 0) return [];

  const db = await openCaDaoDatabase();
  const placeholders = numberValues.map(() => '?').join(', ');
  return db.getAllAsync<NumerologyKnowledgeDbRow>(
    `SELECT indicator_key, number_value, title, content, locale, review_status
     FROM numerology_knowledge
     WHERE indicator_key = ? AND locale = ? AND number_value IN (${placeholders})`,
    [indicatorKey, locale, ...numberValues]
  );
}

export async function getNumerologyKnowledgeCount(locale?: AppLocale): Promise<number> {
  const db = await openCaDaoDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    locale
      ? 'SELECT COUNT(*) AS total FROM numerology_knowledge WHERE locale = ?'
      : 'SELECT COUNT(*) AS total FROM numerology_knowledge',
    locale ? [locale] : [],
  );
  return result?.total ?? 0;
}
