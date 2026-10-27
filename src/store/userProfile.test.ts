jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));
jest.mock('../services/supabaseClient', () => ({ supabase: null }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addProfile,
  ensurePrimaryProfileId,
  getPrimaryProfileId,
  getPrimaryProfileState,
  saveAllProfiles,
  setPrimaryProfileId,
} from './userProfile';

describe('primary profile storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('migrates the legacy default profile before the old active selection', async () => {
    await saveAllProfiles([
      { id: 'self', fullName: 'Minh Anh', birthDate: '1998-10-20', gender: 'female', isDefault: true },
      { id: 'mother', fullName: 'Mẹ', birthDate: '1970-02-01', gender: 'female' },
    ]);
    await AsyncStorage.setItem('@numelyra_active_profile_id', 'mother');

    await expect(ensurePrimaryProfileId()).resolves.toBe('self');
    await expect(getPrimaryProfileState()).resolves.toEqual({ id: 'self', pendingCloudSync: true });
  });

  it('does not replace the primary profile when another profile is added', async () => {
    await saveAllProfiles([
      { id: 'self', fullName: 'Minh Anh', birthDate: '1998-10-20', gender: 'female' },
    ]);
    await setPrimaryProfileId('self', { pendingCloudSync: false });

    await addProfile({ fullName: 'Mẹ', birthDate: '1970-02-01', gender: 'female' });

    await expect(getPrimaryProfileId()).resolves.toBe('self');
  });

  it('automatically makes the first created profile primary', async () => {
    const created = await addProfile({ fullName: 'Minh Anh', birthDate: '1998-10-20', gender: 'female' });
    await expect(getPrimaryProfileId()).resolves.toBe(created.id);
  });
});
