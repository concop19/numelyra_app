import AsyncStorage from '@react-native-async-storage/async-storage';

import { GAME_IDS, getYesterdayKey, type GameHubProgress, type GameId, type GameProgressSummary } from './gameHub';

const KEY = 'numelyra:game-hub:v1';

const DEFAULT_PROGRESS: GameHubProgress = { version: 1, streak: 0, lastDailyDate: null, games: {} };

export async function loadGameHubProgress(): Promise<GameHubProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<GameHubProgress>;
    return {
      version: 1,
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      lastDailyDate: typeof parsed.lastDailyDate === 'string' ? parsed.lastDailyDate : null,
      games: parsed.games && typeof parsed.games === 'object' ? parsed.games : {},
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

async function save(progress: GameHubProgress): Promise<GameHubProgress> {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
  return progress;
}

export async function recordGameActivity(gameId: GameId, update: Partial<GameProgressSummary> = {}): Promise<GameHubProgress> {
  const current = await loadGameHubProgress();
  const previous = current.games[gameId] ?? { playedAt: null, completed: 0, total: null };
  return save({
    ...current,
    games: {
      ...current.games,
      [gameId]: { ...previous, ...update, playedAt: new Date().toISOString() },
    },
  });
}

export async function completeDailyChallenge(dateKey: string, gameId: GameId): Promise<GameHubProgress> {
  const current = await loadGameHubProgress();
  const game = current.games[gameId] ?? { playedAt: null, completed: 0, total: null };
  const alreadyDone = current.lastDailyDate === dateKey;
  return save({
    ...current,
    streak: alreadyDone ? current.streak : current.lastDailyDate === getYesterdayKey(dateKey) ? current.streak + 1 : 1,
    lastDailyDate: alreadyDone ? current.lastDailyDate : dateKey,
    games: {
      ...current.games,
      [gameId]: { ...game, completed: alreadyDone ? game.completed : game.completed + 1, playedAt: new Date().toISOString() },
    },
  });
}

export function emptyGameSummaries(): Record<GameId, GameProgressSummary> {
  return GAME_IDS.reduce((summaries, id) => {
    summaries[id] = { playedAt: null, completed: 0, total: null };
    return summaries;
  }, {} as Record<GameId, GameProgressSummary>);
}
