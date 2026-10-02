import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useGameStore } from '../state/gameStore';

// Static imports for audio files
const correctSoundAsset = require('../../assets/music/arrow_move_sound.wav');
const wrongSoundAsset = require('../../assets/music/wrong_escape-negative-tone.wav');
const victorySoundAsset = require('../../assets/music/eaglaxle-gaming-victory-464016 (1).mp3');
const outOfMoveSoundAsset = require('../../assets/music/outofmoves_sound.mp3');
const bgMusicAsset = require('../../assets/music/bg_constant_sound.mp3');

class AudioManager {
  private bgMusic: AudioPlayer | null = null;
  private soundEffects: Record<string, AudioPlayer> = {};
  private isInitialized = false;
  private isInitializing = false;
  private subscriptionUnsubscribe: (() => void) | null = null;
  private lastMusicState: boolean | null = null;
  private lifecycleToken = 0;

  async init() {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    const initializationToken = ++this.lifecycleToken;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch (e) {
      console.warn('Failed to set audio mode', e);
    }

    // If the game was closed while the audio mode request was pending, do not
    // create a new background player after cleanup has already run.
    if (initializationToken !== this.lifecycleToken) {
      return;
    }

    try {
      this.soundEffects = {
        correct: createAudioPlayer(correctSoundAsset),
        wrong: createAudioPlayer(wrongSoundAsset),
        victory: createAudioPlayer(victorySoundAsset),
        outOfMove: createAudioPlayer(outOfMoveSoundAsset),
      };

      const bgPlayer = createAudioPlayer(bgMusicAsset);
      if (bgPlayer) {
        bgPlayer.loop = true;
        bgPlayer.volume = 0.4;
        this.bgMusic = bgPlayer;
      }
    } catch (e) {
      console.warn('Failed to initialize audio players', e);
    }

    this.isInitialized = true;
    this.isInitializing = false;

    // Zustand subscription
    if (!this.subscriptionUnsubscribe) {
      this.subscriptionUnsubscribe = useGameStore.subscribe((state) => {
        if (this.isInitialized && state.musicEnabled !== this.lastMusicState) {
          this.handleMusicToggle(state.musicEnabled);
        }
      });
    }

    const musicEnabled = useGameStore.getState().musicEnabled;
    this.handleMusicToggle(musicEnabled);
  }

  private handleMusicToggle(enabled: boolean) {
    if (!this.bgMusic || this.lastMusicState === enabled) {
      return;
    }

    try {
      if (enabled) {
        this.bgMusic.play();
      } else {
        this.bgMusic.pause();
      }
      this.lastMusicState = enabled;
    } catch (e) {
      console.warn('Failed to toggle music', e);
    }
  }

  async playSound(name: 'correct' | 'wrong' | 'victory' | 'outOfMove') {
    const soundEnabled = useGameStore.getState().soundEnabled;
    if (!soundEnabled) {
      return;
    }

    if (!this.isInitialized) {
      await this.init();
    }

    const sound = this.soundEffects[name];
    if (!sound) {
      return;
    }

    try {
      sound.seekTo(0).catch(() => {});
      sound.play();
    } catch (e) {
      console.warn(`Failed to play sound: ${name}`, e);
    }
  }

  async cleanup() {
    // Invalidate a pending init before releasing the players it may have made.
    this.lifecycleToken++;
    try {
      for (const sound of Object.values(this.soundEffects)) {
        try {
          sound?.remove?.();
        } catch {}
      }
      this.soundEffects = {};

      if (this.bgMusic) {
        try {
          this.bgMusic.pause();
          this.bgMusic.remove?.();
        } catch {}
        this.bgMusic = null;
      }

      if (this.subscriptionUnsubscribe) {
        this.subscriptionUnsubscribe();
        this.subscriptionUnsubscribe = null;
      }

      this.isInitialized = false;
      this.isInitializing = false;
      this.lastMusicState = null;
    } catch (e) {
      console.warn('Failed to cleanup audio manager', e);
    }
  }
}

export const audioManager = new AudioManager();
