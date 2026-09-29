import { getDailyChallenge, getLocalDateKey, getYesterdayKey } from './gameHub';

describe('Game Hub daily challenge', () => {
  it('uses a stable local date key', () => {
    expect(getLocalDateKey(new Date(2026, 8, 28, 23, 59))).toBe('2026-09-28');
    expect(getYesterdayKey('2026-03-01')).toBe('2026-02-28');
  });

  it('keeps the same daily challenge throughout a day and rotates game providers', () => {
    const morning = getDailyChallenge(new Date(2026, 8, 28, 8));
    const evening = getDailyChallenge(new Date(2026, 8, 28, 22));
    const tomorrow = getDailyChallenge(new Date(2026, 8, 29, 8));
    expect(morning).toEqual(evening);
    expect(tomorrow.id).not.toBe(morning.id);
    expect(['zip', 'mind-rules', 'sudoku', 'game-2048', 'arrow-escape']).toContain(morning.gameId);
  });
});
