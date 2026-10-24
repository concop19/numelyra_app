export interface CaDaoContextQuery {
  categories: string[];
  keywords: string[];
  seed: string;
  excludeIds?: number[];
  excludeContents?: string[];
}

export type CaDaoQueryParameter = string | number;

export interface CaDaoSqlQuery {
  sql: string;
  parameters: CaDaoQueryParameter[];
}

function stablePositiveSeed(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Builds the deterministic SQLite query used to select a contextual daily verse. */
export function buildContextualCaDaoSqlQuery(
  date: Date,
  query: CaDaoContextQuery
): CaDaoSqlQuery | null {
  const categories = [...new Set(query.categories.filter(Boolean))].slice(0, 4);
  const keywords = [...new Set(
    query.keywords.map((item) => item.trim()).filter(Boolean)
  )].slice(0, 10);
  const excludeIds = [...new Set(
    (query.excludeIds ?? []).filter((id) => Number.isSafeInteger(id) && id > 0)
  )].slice(0, 14);
  const excludeContents = [...new Set(
    (query.excludeContents ?? []).map((item) => item.trim()).filter(Boolean)
  )].slice(0, 14);
  if (categories.length === 0) return null;

  const categorySlots = categories.map(() => '?').join(', ');
  const excludedIdClause = excludeIds.length > 0
    ? `\n         AND id NOT IN (${excludeIds.map(() => '?').join(', ')})`
    : '';
  const excludedContentClause = excludeContents.length > 0
    ? `\n         AND content NOT IN (${excludeContents.map(() => '?').join(', ')})`
    : '';
  const relevance = keywords.length > 0
    ? keywords.map(() => '(CASE WHEN title LIKE ? OR content LIKE ? THEN 1 ELSE 0 END)').join(' + ')
    : '0';
  const categoryPriority = categories
    .map((_, index) => `WHEN ? THEN ${index}`)
    .join(' ');
  const keywordParameters = keywords.flatMap((keyword) => [`%${keyword}%`, `%${keyword}%`]);
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const seed = stablePositiveSeed(`${dateKey}|${query.seed}`);

  return {
    sql: `SELECT id, title, content, category, url
       FROM cadao
       WHERE category IN (${categorySlots})
         AND length(trim(content)) BETWEEN 20 AND 600${excludedIdClause}${excludedContentClause}
       ORDER BY CASE category ${categoryPriority} ELSE ${categories.length} END,
         (${relevance}) DESC,
         abs(((id * 1103515245) + ?) % 2147483647),
         id
       LIMIT 1`,
    parameters: [
      ...categories,
      ...excludeIds,
      ...excludeContents,
      ...categories,
      ...keywordParameters,
      seed,
    ],
  };
}
