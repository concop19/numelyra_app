import { Platform } from 'react-native';

/**
 * Browsers can reject autoplay and surface an unhandled AbortError when a
 * modal pauses while play() is still pending. Native players do not have that
 * browser gesture restriction, so automatic ambient playback stays enabled
 * on Android and iOS only.
 */
export function canAutoPlayAmbientAudio(): boolean {
  return Platform.OS !== 'web';
}

/**
 * Safari on iOS only allows media volume to be changed with the device buttons.
 * Assigning AudioPlayer.volume there is ignored and emits an expo-audio warning.
 */
export function canSetAudioPlayerVolume(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof navigator === 'undefined') return true;
  return !/iPad|iPhone|iPod/.test(navigator.userAgent);
}
