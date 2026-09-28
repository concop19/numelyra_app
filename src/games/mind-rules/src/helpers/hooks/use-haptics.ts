import { useSettings } from '@/src/store/hooks/use-settings';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/** Haptic helpers that respect the user's haptics setting. */
export const useHaptics = () => {
  const { settings } = useSettings();
  const enabled = settings.haptics;

  const tap = useCallback(() => {
    if (enabled) Haptics.selectionAsync();
  }, [enabled]);

  const success = useCallback(() => {
    if (enabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [enabled]);

  const error = useCallback(() => {
    if (enabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [enabled]);

  return { tap, success, error };
};
