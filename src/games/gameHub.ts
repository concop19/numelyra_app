export const GAME_IDS = [
  'arrow-escape',
  'mind-rules',
  'o-an-quan',
  'dots-boxes',
  'sudoku',
  'game-2048',
  'zip',
] as const;

export type GameId = (typeof GAME_IDS)[number];

export type GameProgressSummary = {
  playedAt: string | null;
  completed: number;
  total: number | null;
  bestScore?: number;
};

export type DailyChallenge = {
  id: string;
  dateKey: string;
  gameId: Extract<GameId, 'arrow-escape' | 'mind-rules' | 'sudoku' | 'game-2048' | 'zip'>;
  title: string;
  subtitle: string;
};

export type DailyChallengeProvider = {
  gameId: DailyChallenge['gameId'];
  getChallenge: (date: Date) => DailyChallenge;
};

export type GameHubProgress = {
  version: 1;
  streak: number;
  lastDailyDate: string | null;
  games: Partial<Record<GameId, GameProgressSummary>>;
};

export type GameHubRouteParams = { gameId?: GameId; entry?: 'daily' };

export function getLocalDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const DAILY_GAMES: DailyChallenge['gameId'][] = ['zip', 'mind-rules', 'sudoku', 'game-2048', 'arrow-escape'];

const DAILY_COPY: Record<DailyChallenge['gameId'], Pick<DailyChallenge, 'title' | 'subtitle'>> = {
  zip: { title: 'Zip Daily', subtitle: 'Nối toàn bộ ô trong một đường đi.' },
  'mind-rules': { title: 'Mind Rules Daily', subtitle: 'Khám phá quy luật số của hôm nay.' },
  sudoku: { title: 'Sudoku Daily', subtitle: 'Một ván Sudoku mới cho hành trình hôm nay.' },
  'game-2048': { title: '2048 Daily', subtitle: 'Chạm mốc 128 để hoàn thành thử thách.' },
  'arrow-escape': { title: 'Arrow Escape Daily', subtitle: 'Thoát khỏi bàn mũi tên của ngày hôm nay.' },
};

export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
  const dateKey = getLocalDateKey(date);
  const ordinal = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000);
  const gameId = DAILY_GAMES[((ordinal % DAILY_GAMES.length) + DAILY_GAMES.length) % DAILY_GAMES.length];
  return { id: `${gameId}:${dateKey}`, dateKey, gameId, ...DAILY_COPY[gameId] };
}

export function getYesterdayKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
}
