import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

type GameSoundOptions = {
  /** Prevent a rapid input stream from repeatedly restarting the same clip. */
  minimumIntervalMs?: number;
  volume?: number;
};

/**
 * Configure short game effects to play through the device's silent mode while
 * mixing with other media. This avoids taking audio focus away from music or a
 * video the player may already be listening to.
 */
export function useGameAudioMode() {
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
  }, []);
}

/**
 * A screen-scoped, preloaded sound effect. `useAudioPlayer` disposes its native
 * player when the owning game screen unmounts, unlike a global player cache.
 */
export function useGameSound(
  source: number,
  { minimumIntervalMs = 0, volume = 1 }: GameSoundOptions = {},
) {
  const player = useAudioPlayer(source, { keepAudioSessionActive: true });
  const lastPlayedAtRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastPlayedAtRef.current < minimumIntervalMs) return;
    lastPlayedAtRef.current = now;

    try {
      player.volume = volume;
      void player.seekTo(0).catch(() => undefined);
      player.play();
    } catch {
      // Audio must never interrupt gameplay if a device cannot play a clip.
    }
  }, [minimumIntervalMs, player, volume]);
}
