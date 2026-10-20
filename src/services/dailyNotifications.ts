import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { UserProfile } from '../store/userProfile';
import { buildDailyInsight } from '../features/daily-insight/dailyInsight';
import { translate, type AppLocale } from '../i18n/translations';

const SETTINGS_KEY = 'numelyra:daily-reminder:v2';
const LEGACY_SETTINGS_KEY = 'numelyra:daily-reminder:v1';
const CHANNEL_ID = 'daily-insight';
const SCHEDULE_DAYS = 30;

export interface DailyReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  luckyTimeEnabled: boolean;
  quietStart: number;
  quietEnd: number;
  notificationIds: string[];
}

export interface DailyNotificationContext {
  profile: UserProfile;
  locale: AppLocale;
}

export const DEFAULT_DAILY_REMINDER_SETTINGS: DailyReminderSettings = {
  enabled: false,
  hour: 8,
  minute: 0,
  luckyTimeEnabled: true,
  quietStart: 7,
  quietEnd: 22,
  notificationIds: [],
};

type NotificationsModule = typeof import('expo-notifications');

/**
 * Some Android Expo Go builds do not bundle SDK 57's topic module. Because
 * expo-notifications re-exports that module eagerly, requiring the package in
 * those clients would throw before local-notification APIs can be reached.
 */
export const canUseNativeNotifications = Platform.OS !== 'web'
  && (Platform.OS !== 'android' || Boolean(requireOptionalNativeModule('ExpoTopicSubscriptionModule')));

export function getNotifications(): NotificationsModule | null {
  if (!canUseNativeNotifications) return null;
  return require('expo-notifications') as NotificationsModule;
}

function normalizeSettings(value: Partial<DailyReminderSettings>, migrated = false): DailyReminderSettings {
  return {
    enabled: value.enabled === true,
    hour: Number.isInteger(value.hour) && value.hour! >= 0 && value.hour! <= 23 ? value.hour! : 8,
    minute: Number.isInteger(value.minute) && value.minute! >= 0 && value.minute! <= 59 ? value.minute! : 0,
    // Existing users opted into one alert. They can explicitly enable the second one.
    luckyTimeEnabled: migrated ? false : value.luckyTimeEnabled !== false,
    quietStart: Number.isInteger(value.quietStart) ? Math.max(0, Math.min(23, value.quietStart!)) : 7,
    quietEnd: Number.isInteger(value.quietEnd) ? Math.max(1, Math.min(24, value.quietEnd!)) : 22,
    notificationIds: Array.isArray(value.notificationIds)
      ? value.notificationIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export async function loadDailyReminderSettings(): Promise<DailyReminderSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) return normalizeSettings(JSON.parse(stored) as Partial<DailyReminderSettings>);

    const legacy = await AsyncStorage.getItem(LEGACY_SETTINGS_KEY);
    if (legacy) {
      const migrated = normalizeSettings(JSON.parse(legacy) as Partial<DailyReminderSettings>, true);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // Fall through to a safe default when a stale payload is corrupt.
  }
  return { ...DEFAULT_DAILY_REMINDER_SETTINGS };
}

async function cancelOwnedNotifications(Notifications: NotificationsModule, identifiers: string[]): Promise<void> {
  await Promise.all(identifiers.map((identifier) => (
    Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
  )));
}

function notificationDate(date: Date, hour: number, minute = 0): Date {
  const value = new Date(date);
  value.setHours(hour, minute, 0, 0);
  return value;
}

export interface PlannedDailyNotification {
  kind: 'daily-insight' | 'lucky-time';
  date: Date;
  title: string;
  body: string;
  data: { url: string; dateKey: string; kind: 'daily-insight' | 'lucky-time' };
}

export function createDailyInsightNotificationPlan(
  settings: DailyReminderSettings,
  context: DailyNotificationContext,
  now = new Date(),
  days = SCHEDULE_DAYS,
): PlannedDailyNotification[] {
  const plan: PlannedDailyNotification[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
    const insight = buildDailyInsight(context.profile, date, context.locale);
    const summaryDate = notificationDate(date, settings.hour, settings.minute);
    const data = { url: `numelyra://daily/${insight.dateKey}`, dateKey: insight.dateKey, kind: 'daily-insight' as const };
    if (summaryDate.getTime() > now.getTime()) {
      plan.push({
        kind: 'daily-insight',
        date: summaryDate,
        title: translate(context.locale, 'daily.notificationTitle'),
        body: translate(context.locale, 'daily.notificationBody', {
          time: insight.luckyTime?.range ?? translate(context.locale, 'daily.noLuckyTime'),
          direction: insight.directions.wealth,
          avoid: insight.avoid[0] ?? '—',
        }),
        data,
      });
    }
    if (settings.luckyTimeEnabled && insight.luckyTime) {
      const luckyDate = notificationDate(date, insight.luckyTime.startHour);
      if (luckyDate.getTime() > now.getTime()) {
        plan.push({
          kind: 'lucky-time',
          date: luckyDate,
          title: translate(context.locale, 'daily.luckyNotificationTitle'),
          body: translate(context.locale, 'daily.luckyNotificationBody', {
            time: insight.luckyTime.range,
            direction: insight.directions.joy,
          }),
          data: { ...data, kind: 'lucky-time' },
        });
      }
    }
  }
  return plan;
}

export async function scheduleDailyInsightNotifications(
  settings: DailyReminderSettings,
  context: DailyNotificationContext,
): Promise<DailyReminderSettings> {
  const Notifications = getNotifications();
  if (!Notifications) return { ...settings, enabled: false, notificationIds: [] };

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  await cancelOwnedNotifications(Notifications, settings.notificationIds);
  if (!settings.enabled) return { ...settings, notificationIds: [] };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: context.locale === 'en' ? 'Daily insights' : 'Thông điệp hằng ngày',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.status === 'granted'
    ? currentPermission
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return { ...settings, enabled: false, notificationIds: [] };

  const identifiers: string[] = [];
  for (const planned of createDailyInsightNotificationPlan(settings, context)) {
    identifiers.push(await Notifications.scheduleNotificationAsync({
        content: { title: planned.title, body: planned.body, data: planned.data },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: planned.date,
          channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        },
      }));
  }
  return { ...settings, enabled: true, notificationIds: identifiers };
}

export async function saveDailyReminderSettings(
  next: DailyReminderSettings,
  context?: DailyNotificationContext,
): Promise<DailyReminderSettings> {
  let stored = normalizeSettings(next);
  if (context) stored = await scheduleDailyInsightNotifications(stored, context);
  else if (!stored.enabled) {
    const Notifications = getNotifications();
    if (Notifications) await cancelOwnedNotifications(Notifications, stored.notificationIds);
    stored = { ...stored, notificationIds: [] };
  }
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
  return stored;
}

export async function refreshDailyInsightNotifications(context: DailyNotificationContext): Promise<void> {
  const settings = await loadDailyReminderSettings();
  if (!settings.enabled) return;
  const refreshed = await scheduleDailyInsightNotifications(settings, context);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(refreshed));
}
