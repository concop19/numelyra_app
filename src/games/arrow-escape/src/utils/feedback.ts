import * as Haptics from 'expo-haptics';
import { audioManager } from './audio';

export async function playCorrectFeedback() {
  await audioManager.playSound('correct');
}

export async function playWrongFeedback(hapticsEnabled: boolean) {
  await audioManager.playSound('wrong');
  if (hapticsEnabled) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}
