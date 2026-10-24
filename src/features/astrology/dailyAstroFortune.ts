import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { ASTRO_ENGINE_VERSION } from '../../services/astro/astroVersion';
import type { AppLocale } from '../../i18n/translations';

const LEGACY_V4_ENGINE_VERSION = 'astrology-v2-porphyry-1';
const LEGACY_V5_ENGINE_VERSION = 'astrology-v3-porphyry-1';

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

export interface RefreshedAstroFortune {
  fortune: AstroFortuneSlip;
  metadataChanged: boolean;
}

export interface RecentAstroCaDao {
  id?: number;
  content: string;
}

export function refreshCachedAstroMetadata(
  fortune: AstroFortuneSlip,
  metadata: PureAstroFeatureMetadata
): RefreshedAstroFortune {
  const cachedMetadata = fortune.astroMetadata;
  const metadataChanged = cachedMetadata?.engineVersion !== metadata.engineVersion
    || !cachedMetadata?.natalPlanets
    || !cachedMetadata?.transitAspects
    || !cachedMetadata?.notableTransitAspects
    || !cachedMetadata?.natalAspects
    || (!!metadata.ruleEvaluation && !cachedMetadata?.ruleEvaluation);

  return {
    fortune: { ...fortune, astroMetadata: metadata },
    metadataChanged,
  };
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

function getAstrologyProfileFingerprintForEngine(
  profile: AstroProfileIdentity | null | undefined,
  engineVersion: string
): string {
  if (!profile) {
    return hashProfileKey(`guest|unknown-date|unknown-time|unknown-place|unknown|porphyry|${engineVersion}`);
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
    engineVersion,
  ].join('|'));
}

export function getAstrologyProfileFingerprint(
  profile?: AstroProfileIdentity | null
): string {
  return getAstrologyProfileFingerprintForEngine(profile, ASTRO_ENGINE_VERSION);
}

export function getAstroFortuneStorageKey(
  date: Date,
  profile?: AstroProfileIdentity | null,
  locale: AppLocale = 'vi',
): string {
  return `@astro_fortune_v7_${locale}_${formatLocalDateKey(date)}_${getAstrologyProfileFingerprint(profile)}`;
}

export function getAstroFortuneV5StorageKey(
  date: Date,
  profile?: AstroProfileIdentity | null
): string {
  return `@astro_fortune_v5_${formatLocalDateKey(date)}_${getAstrologyProfileFingerprintForEngine(profile, LEGACY_V5_ENGINE_VERSION)}`;
}

export function getAstroFortuneV4StorageKey(
  date: Date,
  profile?: AstroProfileIdentity | null
): string {
  return `@astro_fortune_v4_${formatLocalDateKey(date)}_${getAstrologyProfileFingerprintForEngine(profile, LEGACY_V4_ENGINE_VERSION)}`;
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
  profile?: AstroProfileIdentity | null,
  locale: AppLocale = 'vi',
): Promise<CachedAstroFortune | null> {
  const currentKey = getAstroFortuneStorageKey(date, profile, locale);
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
  limit = 7,
  locale: AppLocale = 'vi',
): Promise<string[]> {
  const recentAdvice: string[] = [];
  const seen = new Set<string>();

  for (let offset = 1; offset <= limit; offset += 1) {
    const previousDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
    const candidateKeys = [
      getAstroFortuneStorageKey(previousDate, profile, locale),
      getAstroFortuneV5StorageKey(previousDate, profile),
      getAstroFortuneV4StorageKey(previousDate, profile),
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

export async function loadRecentAstroCaDao(
  storage: KeyValueStorage,
  date: Date,
  profile?: AstroProfileIdentity | null,
  limit = 14,
  locale: AppLocale = 'vi',
): Promise<RecentAstroCaDao[]> {
  const recentCaDao: RecentAstroCaDao[] = [];
  const seen = new Set<string>();

  for (let offset = 1; offset <= limit; offset += 1) {
    const previousDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
    const candidateKeys = [
      getAstroFortuneStorageKey(previousDate, profile, locale),
      getAstroFortuneV5StorageKey(previousDate, profile),
      getAstroFortuneV4StorageKey(previousDate, profile),
      getAstroFortuneV3StorageKey(previousDate, profile),
      getAstroFortuneV2StorageKey(previousDate, profile),
    ];

    for (const key of candidateKeys) {
      try {
        const stored = await storage.getItem(key);
        if (!stored) continue;
        const parsed: unknown = JSON.parse(stored);
        if (!isAstroFortuneSlip(parsed)) continue;
        const content = parsed.anchorCaDao.content.trim();
        const identity = typeof parsed.anchorCaDao.id === 'number'
          ? `id:${parsed.anchorCaDao.id}`
          : `content:${content.toLocaleLowerCase('vi-VN')}`;
        if (content && !seen.has(identity)) {
          seen.add(identity);
          recentCaDao.push({ id: parsed.anchorCaDao.id, content });
        }
        break;
      } catch {
        // Continue with the next compatible history key.
      }
    }
  }

  return recentCaDao.slice(0, limit);
}

export async function saveCachedAstroFortune(
  storage: KeyValueStorage,
  date: Date,
  profile: AstroProfileIdentity | null | undefined,
  fortune: AstroFortuneSlip,
  locale: AppLocale = 'vi',
): Promise<void> {
  await storage.setItem(getAstroFortuneStorageKey(date, profile, locale), JSON.stringify(fortune));
}
