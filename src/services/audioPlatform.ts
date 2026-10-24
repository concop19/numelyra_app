import { Platform } from 'react-native';

/**
 * Safari on iOS only allows media volume to be changed with the device buttons.
 * Assigning AudioPlayer.volume there is ignored and emits an expo-audio warning.
 */
export function canSetAudioPlayerVolume(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof navigator === 'undefined') return true;
  return !/iPad|iPhone|iPod/.test(navigator.userAgent);
}
