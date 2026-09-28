import { TOTAL_LEVELS } from '@/src/data/puzzles';
import { useAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import { progressAtom, type ProgressMap } from '../atoms/progress';

/**
 * Coerce a stored progress value into a numeric star count. Guards against
 * legacy/corrupted entries (e.g. an object was persisted under a level key),
 * which would otherwise turn `totalStars` into the string "[object Object]".
 */
const toStarCount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value && typeof value === 'object' && 'stars' in value) {
    const stars = (value as { stars: unknown }).stars;
    return typeof stars === 'number' && Number.isFinite(stars) ? stars : 0;
  }
  return 0;
};

export const useProgress = () => {
  const [progressState, setProgress] = useAtom(progressAtom);

  // `getOnInit` guarantees a synchronous value; the Promise in the type is
  // spurious. Normalize every entry to a number so all star math stays numeric.
  const progress = useMemo<ProgressMap>(() => {
    const raw = (progressState ?? {}) as Record<string, unknown>;
    const normalized: ProgressMap = {};
    for (const [level, value] of Object.entries(raw)) {
      normalized[level] = toStarCount(value);
    }
    return normalized;
  }, [progressState]);

  const starsFor = useCallback(
    (level: number) => progress[String(level)] ?? 0,
    [progress]
  );

  const isCompleted = useCallback(
    (level: number) => starsFor(level) > 0,
    [starsFor]
  );

  const isUnlocked = useCallback(
    (level: number) => level === 1 || isCompleted(level - 1),
    [isCompleted]
  );

  const recordStars = useCallback(
    (level: number, stars: number) => {
      setProgress((prev) => {
        const raw = (prev ?? {}) as Record<string, unknown>;
        const next: ProgressMap = {};
        for (const [key, value] of Object.entries(raw)) {
          next[key] = toStarCount(value);
        }
        next[String(level)] = Math.max(next[String(level)] ?? 0, stars);
        return next;
      });
    },
    [setProgress]
  );

  const reset = useCallback(() => setProgress({}), [setProgress]);

  const totalStars = useMemo(
    () => Object.values(progress).reduce((sum, value) => sum + value, 0),
    [progress]
  );

  const completedCount = useMemo(
    () => Object.values(progress).filter((value) => value > 0).length,
    [progress]
  );

  /** Lowest level that hasn't been cleared yet (capped at the last level). */
  const nextLevel = useMemo(() => {
    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      if ((progress[String(level)] ?? 0) === 0) return level;
    }
    return TOTAL_LEVELS;
  }, [progress]);

  const hasStarted = completedCount > 0;

  return {
    progress,
    starsFor,
    isCompleted,
    isUnlocked,
    recordStars,
    reset,
    totalStars,
    completedCount,
    nextLevel,
    hasStarted,
  };
};
