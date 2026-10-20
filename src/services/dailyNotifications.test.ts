jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDailyInsightNotificationPlan,
  DEFAULT_DAILY_REMINDER_SETTINGS,
  loadDailyReminderSettings,
} from './dailyNotifications';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('daily notification planning', () => {
  const profile = { fullName: 'Test User', birthDate: '1998-06-15', gender: 'female' as const };

  beforeEach(() => {
    storage.getItem.mockReset();
    storage.setItem.mockReset();
  });

  test('migrates v1 settings without silently enabling the second alert', async () => {
    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ enabled: true, hour: 9, minute: 30 }));

    const migrated = await loadDailyReminderSettings();

    expect(migrated).toMatchObject({ enabled: true, hour: 9, minute: 30, luckyTimeEnabled: false });
    expect(storage.setItem).toHaveBeenCalledWith(
      'numelyra:daily-reminder:v2',
      expect.stringContaining('"luckyTimeEnabled":false'),
    );
  });

  test('creates a localized summary and lucky-time alert inside awake hours', () => {
    const now = new Date(2026, 1, 17, 6);
    const plan = createDailyInsightNotificationPlan(
      { ...DEFAULT_DAILY_REMINDER_SETTINGS, enabled: true, hour: 8, luckyTimeEnabled: true },
      { profile, locale: 'en' },
      now,
      1,
    );
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ kind: 'daily-insight', data: { dateKey: '2026-02-17' } });
    expect(plan[0].body).toContain('Lucky time');
    expect(plan[1].kind).toBe('lucky-time');
    expect(plan[1].date.getHours()).toBeGreaterThanOrEqual(7);
    expect(plan[1].date.getHours()).toBeLessThan(22);
  });

  test('keeps migrated-style settings at one alert', () => {
    const plan = createDailyInsightNotificationPlan(
      { ...DEFAULT_DAILY_REMINDER_SETTINGS, enabled: true, luckyTimeEnabled: false },
      { profile, locale: 'vi' },
      new Date(2026, 1, 17, 6),
      1,
    );
    expect(plan).toHaveLength(1);
  });
});
