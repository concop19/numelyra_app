import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import {
  formatLocalDateKey,
  getAstroFortuneStorageKey,
  getAstroFortuneV2StorageKey,
  getAstrologyProfileKey,
  loadCachedAstroFortune,
  loadRecentAstroAdvice,
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
  });

  it('uses v3 and invalidates a same-day v2 fortune', async () => {
    const v2Key = getAstroFortuneV2StorageKey(date, profile);
    const { storage } = createStorage({ [v2Key]: JSON.stringify(fortune) });

    expect(getAstroFortuneStorageKey(date, profile)).toContain('@astro_fortune_v3_');
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

  it('reads v3 first and v2 only as prior-day anti-repetition history', async () => {
    const yesterday = new Date(2026, 9, 4, 12, 0, 0);
    const twoDaysAgo = new Date(2026, 9, 3, 12, 0, 0);
    const v3Fortune = { ...fortune, advice: 'Gọi một cuộc điện thoại quan trọng.' };
    const v2Fortune = { ...fortune, advice: 'Viết ba việc cần hoàn thành.' };
    const { storage } = createStorage({
      [getAstroFortuneStorageKey(yesterday, profile)]: JSON.stringify(v3Fortune),
      [getAstroFortuneV2StorageKey(twoDaysAgo, profile)]: JSON.stringify(v2Fortune),
    });

    await expect(loadRecentAstroAdvice(storage, date, profile)).resolves.toEqual([
      v3Fortune.advice,
      v2Fortune.advice,
    ]);
  });

  it('saves the corrected fortune under the v3 key', async () => {
    const { storage, values } = createStorage();
    await saveCachedAstroFortune(storage, date, profile, fortune);
    expect(JSON.parse(values.get(getAstroFortuneStorageKey(date, profile))!)).toEqual(fortune);
  });
});
