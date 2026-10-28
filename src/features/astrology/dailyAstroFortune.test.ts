import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { ASTRO_ENGINE_VERSION } from '../../services/astro/astroVersion';
import {
  formatLocalDateKey,
  getAstroFortuneStorageKey,
  getAstroFortuneV2StorageKey,
  getAstroFortuneV4StorageKey,
  getAstroFortuneV5StorageKey,
  getAstrologyProfileKey,
  loadCachedAstroFortune,
  loadRecentAstroAdvice,
  loadRecentAstroCaDao,
  refreshCachedAstroMetadata,
  saveCachedAstroFortune,
  type KeyValueStorage,
} from './dailyAstroFortune';

const fortune: AstroFortuneSlip = {
  title: 'Quẻ thử',
  verse: 'Một câu thơ thử nghiệm',
  mirror: 'Một tấm gương',
  advice: 'Một kế sách',
  anchorCaDao: { content: 'Một câu ca dao', category: 'thế sự' },
};

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
  return { storage, values };
}

function hashProfileKey(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('daily astrology fortune cache', () => {
  const date = new Date(2026, 9, 5, 23, 45, 0);
  const profile = { fullName: '  An Nguyễn  ', birthDate: '1998-10-20' };

  it('uses a local calendar date and normalized profile identity', () => {
    expect(formatLocalDateKey(date)).toBe('2026-10-05');
    expect(getAstrologyProfileKey(profile)).toBe('an nguyễn|1998-10-20');
  });

  it('keeps the key stable for one profile/day and separates profiles and days', () => {
    const sameDay = new Date(2026, 9, 5, 1, 0, 0);
    const nextDay = new Date(2026, 9, 6, 0, 0, 0);

    expect(getAstroFortuneStorageKey(date, profile))
      .toBe(getAstroFortuneStorageKey(sameDay, profile));
    expect(getAstroFortuneStorageKey(nextDay, profile))
      .not.toBe(getAstroFortuneStorageKey(date, profile));
    expect(getAstroFortuneStorageKey(date, { ...profile, fullName: 'Bình Trần' }))
      .not.toBe(getAstroFortuneStorageKey(date, profile));
    expect(getAstroFortuneStorageKey(date, { ...profile, id: 'profile-a' }))
      .toBe(getAstroFortuneStorageKey(date, { ...profile, id: 'profile-b' }));
  });

  it('keeps the cache stable when local profile IDs are replaced by cloud IDs', () => {
    const localProfile = {
      ...profile,
      id: 'prof-local',
      birthTime: '14:30',
      birthTimeAccuracy: 'exact' as const,
      birthLocation: { placeId: 'hanoi' },
    };
    const cloudProfile = { ...localProfile, id: '54c437a9-4ca7-45c4-a9c7-d238576bfa54' };

    expect(getAstroFortuneStorageKey(date, localProfile))
      .toBe(getAstroFortuneStorageKey(date, cloudProfile));
  });

  it('reads and migrates the previous ID-bound v7 cache key', async () => {
    const idBoundProfile = {
      ...profile,
      id: 'profile-a',
      birthTime: '14:30',
      birthTimeAccuracy: 'exact' as const,
      birthLocation: { placeId: 'hanoi' },
    };
    const oldFingerprint = hashProfileKey([
      idBoundProfile.id,
      idBoundProfile.birthDate,
      idBoundProfile.birthTime,
      idBoundProfile.birthLocation.placeId,
      'exact',
      'porphyry',
      ASTRO_ENGINE_VERSION,
    ].join('|'));
    const oldKey = `@astro_fortune_v7_vi_${formatLocalDateKey(date)}_${oldFingerprint}`;
    const currentKey = getAstroFortuneStorageKey(date, idBoundProfile);
    const { storage, values } = createStorage({ [oldKey]: JSON.stringify(fortune) });

    await expect(loadCachedAstroFortune(storage, date, idBoundProfile)).resolves.toEqual({
      fortune,
      currentKey,
    });
    expect(JSON.parse(values.get(currentKey)!)).toEqual(fortune);
  });

  it('uses locale-aware v7 and invalidates a same-day v5 fortune', async () => {
    const v5Key = getAstroFortuneV5StorageKey(date, profile);
    const v2Key = getAstroFortuneV2StorageKey(date, profile);
    const { storage } = createStorage({
      [v5Key]: JSON.stringify(fortune),
      [v2Key]: JSON.stringify(fortune),
    });

    expect(getAstroFortuneStorageKey(date, profile)).toContain('@astro_fortune_v7_vi_');
    await expect(loadCachedAstroFortune(storage, date, profile)).resolves.toBeNull();
  });

  it('ignores a corrupt current cache instead of falling back to an old key', async () => {
    const currentKey = getAstroFortuneStorageKey(date, profile);
    const { storage } = createStorage({
      [currentKey]: '{not-json',
      [getAstroFortuneV2StorageKey(date, profile)]: JSON.stringify(fortune),
    });

    await expect(loadCachedAstroFortune(storage, date, profile)).resolves.toBeNull();
  });

  it('reads v6, legacy v5, v4, and v2 as prior-day anti-repetition history', async () => {
    const yesterday = new Date(2026, 9, 4, 12, 0, 0);
    const twoDaysAgo = new Date(2026, 9, 3, 12, 0, 0);
    const threeDaysAgo = new Date(2026, 9, 2, 12, 0, 0);
    const fourDaysAgo = new Date(2026, 9, 1, 12, 0, 0);
    const v6Fortune = { ...fortune, advice: 'Gọi một cuộc điện thoại quan trọng.' };
    const v5Fortune = { ...fortune, advice: 'Đi bộ chậm trong mười phút.' };
    const v4Fortune = { ...fortune, advice: 'Viết ba việc cần hoàn thành.' };
    const v2Fortune = { ...fortune, advice: 'Sắp lại góc bàn trước bữa tối.' };
    const { storage } = createStorage({
      [getAstroFortuneStorageKey(yesterday, profile)]: JSON.stringify(v6Fortune),
      [getAstroFortuneV5StorageKey(twoDaysAgo, profile)]: JSON.stringify(v5Fortune),
      [getAstroFortuneV4StorageKey(threeDaysAgo, profile)]: JSON.stringify(v4Fortune),
      [getAstroFortuneV2StorageKey(fourDaysAgo, profile)]: JSON.stringify(v2Fortune),
    });

    await expect(loadRecentAstroAdvice(storage, date, profile)).resolves.toEqual([
      v6Fortune.advice,
      v5Fortune.advice,
      v4Fortune.advice,
      v2Fortune.advice,
    ]);
  });

  it('loads up to fourteen recent ca dao anchors and supports legacy anchors without IDs', async () => {
    const yesterday = new Date(2026, 9, 4, 12, 0, 0);
    const twoDaysAgo = new Date(2026, 9, 3, 12, 0, 0);
    const currentFortune = {
      ...fortune,
      anchorCaDao: { id: 42, content: 'Câu ca dao có ID', category: 'thế sự' },
    };
    const legacyFortune = {
      ...fortune,
      anchorCaDao: { content: 'Câu ca dao cache cũ', category: 'thế sự' },
    };
    const { storage } = createStorage({
      [getAstroFortuneStorageKey(yesterday, profile)]: JSON.stringify(currentFortune),
      [getAstroFortuneV5StorageKey(twoDaysAgo, profile)]: JSON.stringify(legacyFortune),
    });

    await expect(loadRecentAstroCaDao(storage, date, profile)).resolves.toEqual([
      { id: 42, content: 'Câu ca dao có ID' },
      { id: undefined, content: 'Câu ca dao cache cũ' },
    ]);
  });

  it('saves the contextual-ca-dao fortune under the current v7 key', async () => {
    const { storage, values } = createStorage();
    await saveCachedAstroFortune(storage, date, profile, fortune);
    expect(JSON.parse(values.get(getAstroFortuneStorageKey(date, profile))!)).toEqual(fortune);
  });

  it('invalidates the cache when exact birth time or place changes', () => {
    const complete = {
      ...profile,
      birthTime: '14:30',
      birthTimeAccuracy: 'exact' as const,
      birthLocation: { placeId: 'hanoi' },
    };
    expect(getAstroFortuneStorageKey(date, complete)).not.toBe(
      getAstroFortuneStorageKey(date, profile)
    );
    expect(getAstroFortuneStorageKey(date, {
      ...complete,
      birthLocation: { placeId: 'danang' },
    })).not.toBe(getAstroFortuneStorageKey(date, complete));
  });

  it('keeps a cached narrative but rebuilds its astrology metadata', () => {
    const currentMetadata = {
      engineVersion: 'astrology-v2-porphyry-1',
      natalPlanets: [],
      notableTransitAspects: [],
      natalAspects: [],
    } as unknown as PureAstroFeatureMetadata;
    const refreshed = refreshCachedAstroMetadata(fortune, currentMetadata);

    expect(refreshed.metadataChanged).toBe(true);
    expect(refreshed.fortune).toMatchObject({
      title: fortune.title,
      mirror: fortune.mirror,
      astroMetadata: currentMetadata,
    });
    expect(fortune.astroMetadata).toBeUndefined();
  });
});
