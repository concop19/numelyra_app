import manifest from '../data/numerologyKnowledgeManifest.json';
import { NUMEROLOGY_KNOWLEDGE_CONTRACT } from './numerologyKnowledgeContract';

export const NUMEROLOGY_DATABASE_VERSION = manifest.version;

export interface KnowledgeCatalogRecord {
  indicator_key: string;
  number_value: string;
  locale: string;
  review_status: string;
  source_revision: string;
  title: string;
  content: string;
  reviewed_by: string;
}

/** Reject a same-sized catalog containing duplicate, stale, draft, or foreign keys. */
export function isKnowledgeCatalogValid(rows: KnowledgeCatalogRecord[]): boolean {
  const revisions: Record<string, string> = manifest.revisions;
  const required = new Set(NUMEROLOGY_KNOWLEDGE_CONTRACT.flatMap((entry) =>
    entry.requiredValues.map((value) => `${entry.key}|${value}`)
  ));
  const seen = new Set<string>();
  if (rows.length !== required.size * 2) return false;
  for (const row of rows) {
    const key = `${row.indicator_key}|${row.number_value}`;
    const localizedKey = `${row.locale}|${key}`;
    if (!required.has(key) || !['vi', 'en'].includes(row.locale) || seen.has(localizedKey)
      || row.review_status !== 'approved' || !row.reviewed_by?.trim()
      || row.source_revision !== revisions[key] || !row.title?.trim() || row.content?.trim().length < 100) return false;
    seen.add(localizedKey);
  }
  return seen.size === required.size * 2;
}
