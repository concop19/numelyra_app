import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';

export interface AstroProfileIdentity {
  id?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthTimeAccuracy?: 'exact' | 'unknown' | null;
  birthLocation?: { placeId?: string | null } | null;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface CachedAstroFortune {
  fortune: AstroFortuneSlip;
  currentKey: string;
}

export function formatLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getAstrologyProfileKey(profile?: AstroProfileIdentity | null): string {
  const fullName = profile?.fullName?.trim().toLocaleLowerCase('vi-VN') || 'guest';
  const birthDate = profile?.birthDate?.trim() || 'unknown-date';
  return `${fullName}|${birthDate}`;
}

function hashProfileKey(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function getAstrologyProfileFingerprint(
  profile?: AstroProfileIdentity | null
): string {
  if (!profile) {
    return hashProfileKey('guest|unknown-date|unknown-time|unknown-place|unknown|porphyry|astrology-v2-porphyry-1');
  }
  const hasExactTime = profile.birthTimeAccuracy
    ? profile.birthTimeAccuracy === 'exact'
    : !!profile.birthTime?.trim();
  return hashProfileKey([
    profile.id?.trim() || getAstrologyProfileKey(profile),
    profile.birthDate?.trim() || 'unknown-date',
    profile.birthTime?.trim() || 'unknown-time',
    profile.birthLocation?.placeId || 'unknown-place',
    hasExactTime ? 'exact' : 'unknown',
    'porphyry',
    'astrology-v2-porphyry-1',
  ].join('|'));
}

export function getAstroFortuneStorageKey(
  date: Date,
  profile?: AstroProfileIdentity | null
): string {
  return `@astro_fortune_v4_${formatLocalDateKey(date)}_${getAstrologyProfileFingerprint(profile)}`;
}

export function getAstroFortuneV3StorageKey(
  date: Date,
  profile?: AstroProfileIdentity | null
): string {
  return `@astro_fortune_v3_${formatLocalDateKey(date)}_${hashProfileKey(getAstrologyProfileKey(profile))}`;
}

export function getAstroFortuneV2StorageKey(
  date: Date,
  profile?: AstroProfileIdentity | null
): string {
  return `@astro_fortune_v2_${formatLocalDateKey(date)}_${hashProfileKey(getAstrologyProfileKey(profile))}`;
}

function isAstroFortuneSlip(value: unknown): value is AstroFortuneSlip {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AstroFortuneSlip>;
  return typeof candidate.verse === 'string'
    && typeof candidate.mirror === 'string'
    && typeof candidate.advice === 'string'
    && !!candidate.anchorCaDao
    && typeof candidate.anchorCaDao.content === 'string';
}

export async function loadCachedAstroFortune(
  storage: KeyValueStorage,
  date: Date,
  profile?: AstroProfileIdentity | null
): Promise<CachedAstroFortune | null> {
  const currentKey = getAstroFortuneStorageKey(date, profile);
  try {
    const stored = await storage.getItem(currentKey);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (isAstroFortuneSlip(parsed)) {
      return { fortune: parsed, currentKey };
    }
  } catch {
    // A corrupt v3 entry is ignored so the corrected fortune can be regenerated.
  }

  return null;
}

export async function loadRecentAstroAdvice(
  storage: KeyValueStorage,
  date: Date,
  profile?: AstroProfileIdentity | null,
  limit = 7
): Promise<string[]> {
  const recentAdvice: string[] = [];
  const seen = new Set<string>();

  for (let offset = 1; offset <= limit; offset += 1) {
    const previousDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
    const candidateKeys = [
      getAstroFortuneStorageKey(previousDate, profile),
      getAstroFortuneV3StorageKey(previousDate, profile),
      getAstroFortuneV2StorageKey(previousDate, profile),
    ];

    for (const key of candidateKeys) {
      try {
        const stored = await storage.getItem(key);
        if (!stored) continue;
        const parsed: unknown = JSON.parse(stored);
        if (!isAstroFortuneSlip(parsed)) continue;
        const normalizedAdvice = parsed.advice.trim().toLocaleLowerCase('vi-VN');
        if (normalizedAdvice && !seen.has(normalizedAdvice)) {
          seen.add(normalizedAdvice);
          recentAdvice.push(parsed.advice.trim().slice(0, 500));
        }
        break;
      } catch {
        // Continue with the next compatible history key.
      }
    }
  }

  return recentAdvice.slice(0, limit);
}

export async function saveCachedAstroFortune(
  storage: KeyValueStorage,
  date: Date,
  profile: AstroProfileIdentity | null | undefined,
  fortune: AstroFortuneSlip
): Promise<void> {
  await storage.setItem(getAstroFortuneStorageKey(date, profile), JSON.stringify(fortune));
}
