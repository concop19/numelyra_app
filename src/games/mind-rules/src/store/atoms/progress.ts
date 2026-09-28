import AsyncStorage from '@react-native-async-storage/async-storage';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

/** Maps a level id (as string key) to the best star count earned (1–3). */
export type ProgressMap = Record<string, number>;

const storage = createJSONStorage<ProgressMap>(() => AsyncStorage);

export const progressAtom = atomWithStorage<ProgressMap>(
  'mind-game.progress',
  {},
  storage,
  { getOnInit: true }
);
