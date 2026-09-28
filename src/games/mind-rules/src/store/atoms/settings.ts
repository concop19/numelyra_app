import AsyncStorage from '@react-native-async-storage/async-storage';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export type Settings = {
  haptics: boolean;
  sound: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  sound: true,
};

const storage = createJSONStorage<Settings>(() => AsyncStorage);

export const settingsAtom = atomWithStorage<Settings>(
  'mind-game.settings',
  DEFAULT_SETTINGS,
  storage,
  { getOnInit: true }
);
