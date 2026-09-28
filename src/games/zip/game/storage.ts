/**
 * Tiny AsyncStorage wrapper for persisting completed-puzzle records, the
 * daily streak, and the date the streak was last advanced.
 *
 * All reads return safe defaults — a corrupted blob never crashes the app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PersistedProgress } from './types';

const KEY = 'zip:progress:v1';

const DEFAULT: PersistedProgress = {
  completed: {},
  streak: 0,
  lastDailyDate: null,
  hasSeenTutorial: false,
};

export async function loadProgress(): Promise<PersistedProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    const completed = Object.fromEntries(
      Object.entries(parsed.completed ?? {}).map(([puzzleId, record]) => [
        puzzleId,
        {
          bestTimeSec: record?.bestTimeSec ?? 0,
          bestMoves: record?.bestMoves ?? 0,
          bestBacktracks: record?.bestBacktracks ?? 0,
        },
      ]),
    );
    return {
      completed,
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      lastDailyDate: parsed.lastDailyDate ?? null,
      hasSeenTutorial: parsed.hasSeenTutorial === true,
    };
  } catch {
    return DEFAULT;
  }
}

export async function saveProgress(progress: PersistedProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Swallow — persistence is best-effort.
  }
}

/**
 * Record a completed puzzle, keeping the best (lowest) time and move count.
 * Returns the updated progress object so callers can refresh UI state.
 */
export async function recordCompletion(args: {
  puzzleId: string;
  timeSec: number;
  moves: number;
  backtracks: number;
}): Promise<PersistedProgress> {
  const current = await loadProgress();
  const prev = current.completed[args.puzzleId];
  const bestTimeSec = prev ? Math.min(prev.bestTimeSec, args.timeSec) : args.timeSec;
  const bestMoves = prev ? Math.min(prev.bestMoves, args.moves) : args.moves;
  const bestBacktracks = prev
    ? Math.min(prev.bestBacktracks, args.backtracks)
    : args.backtracks;

  const next: PersistedProgress = {
    ...current,
    completed: {
      ...current.completed,
      [args.puzzleId]: { bestTimeSec, bestMoves, bestBacktracks },
    },
  };
  await saveProgress(next);
  return next;
}

/**
 * Advance the daily streak when the user completes today's daily puzzle.
 * Streak resets to 1 if a day was skipped, increments if yesterday's daily
 * was the previous record, no-ops if today's daily was already completed.
 */
export async function advanceDailyStreak(args: {
  todayKey: string;
}): Promise<PersistedProgress> {
  const current = await loadProgress();
  if (current.lastDailyDate === args.todayKey) return current;

  const yesterday = (() => {
    const d = new Date(args.todayKey + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  const continued = current.lastDailyDate === yesterday;
  const next: PersistedProgress = {
    ...current,
    streak: continued ? current.streak + 1 : 1,
    lastDailyDate: args.todayKey,
  };
  await saveProgress(next);
  return next;
}

export async function markTutorialSeen(): Promise<PersistedProgress> {
  const current = await loadProgress();
  if (current.hasSeenTutorial) return current;

  const next: PersistedProgress = {
    ...current,
    hasSeenTutorial: true,
  };
  await saveProgress(next);
  return next;
}
