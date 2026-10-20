/**
 * Truy vấn kho luận giải thần số học nằm trong SQLite cadao.db.
 * Dữ liệu được đóng gói cùng ứng dụng, không cần mạng hay Supabase lúc chạy.
 */
import { openCaDaoDatabase } from './cadaoService';

export interface NumerologyKnowledgeDbRow {
  indicator_key: string;
  number_value: string;
  title: string;
  content: string;
}

export async function fetchNumerologyKnowledgeRows(
  indicatorKey: string,
  numberValues: string[]
): Promise<NumerologyKnowledgeDbRow[]> {
  if (numberValues.length === 0) return [];

  const db = await openCaDaoDatabase();
  const placeholders = numberValues.map(() => '?').join(', ');
  return db.getAllAsync<NumerologyKnowledgeDbRow>(
    `SELECT indicator_key, number_value, title, content
     FROM numerology_knowledge
     WHERE indicator_key = ? AND number_value IN (${placeholders})`,
    [indicatorKey, ...numberValues]
  );
}

export async function getNumerologyKnowledgeCount(): Promise<number> {
  const db = await openCaDaoDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM numerology_knowledge'
  );
  return result?.total ?? 0;
}
