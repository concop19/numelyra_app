import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const SETTINGS_KEY = 'numelyra:daily-reminder:v1';
const CHANNEL_ID = 'daily-challenge';

export type DailyReminderSettings = { enabled: boolean; hour: number; minute: number };
const DEFAULT_SETTINGS: DailyReminderSettings = { enabled: false, hour: 20, minute: 0 };

type NotificationsModule = typeof import('expo-notifications');

/** Expo Go on Android cannot initialise the push-notification module. */
export const canUseNativeNotifications = Platform.OS !== 'web' && Constants.appOwnership !== 'expo';

export function getNotifications(): NotificationsModule | null {
  if (!canUseNativeNotifications) return null;
  // Keep this require behind the Expo Go guard. A static import crashes Expo Go
  // before the app can render, even though this feature only needs local alerts.
  return require('expo-notifications') as NotificationsModule;
}

export async function loadDailyReminderSettings(): Promise<DailyReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const value = JSON.parse(raw) as Partial<DailyReminderSettings>;
    return {
      enabled: value.enabled === true,
      hour: Number.isInteger(value.hour) && value.hour! >= 0 && value.hour! <= 23 ? value.hour! : 20,
      minute: Number.isInteger(value.minute) && value.minute! >= 0 && value.minute! <= 59 ? value.minute! : 0,
    };
  } catch { return DEFAULT_SETTINGS; }
}

export async function saveDailyReminderSettings(settings: DailyReminderSettings): Promise<DailyReminderSettings> {
  const Notifications = getNotifications();
  if (!Notifications) {
    const stored = { ...settings, enabled: false };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
    return stored;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  let enabled = settings.enabled;
  if (enabled) {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Thử thách hằng ngày', importance: Notifications.AndroidImportance.DEFAULT });
    }
    const permission = await Notifications.getPermissionsAsync();
    const status = permission.status === 'granted' ? permission : await Notifications.requestPermissionsAsync();
    enabled = status.status === 'granted';
    if (enabled) {
      const trigger = Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: settings.hour, minute: settings.minute, channelId: CHANNEL_ID }
        : { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: settings.hour, minute: settings.minute, repeats: true };
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Thử thách hôm nay đã sẵn sàng ✦', body: 'Giữ chuỗi chơi của bạn cùng NUMELYRA.', data: { url: 'numelyra://games/daily' } },
        trigger: trigger as never,
      });
    }
  }
  const stored = { ...settings, enabled };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
  return stored;
}
