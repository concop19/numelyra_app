jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));
jest.mock('../services/supabaseClient', () => ({ supabase: null }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addProfile,
  clearLocalProfiles,
  ensurePrimaryProfileId,
  getProfileCacheOwnerId,
  getPrimaryProfileId,
  getPrimaryProfileState,
  loadAllProfiles,
  profileItemToUserProfile,
  saveAllProfiles,
  saveProfile,
  setProfileCacheOwnerId,
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

  it('syncs saveProfile into profiles list and sets primary profile', async () => {
    await saveProfile({
      fullName: 'Test Explorer',
      birthDate: '1995-05-15',
      gender: 'male',
      birthPlace: 'Hà Nội',
    });

    const list = await loadAllProfiles();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].fullName).toBe('Test Explorer');
    expect(list[0].gender).toBe('male');

    const profile = profileItemToUserProfile(list[0]);
    expect(profile).not.toBeNull();
    expect(profile?.fullName).toBe('Test Explorer');
  });

  it('profileItemToUserProfile defaults gender to female if missing', () => {
    const profile = profileItemToUserProfile({
      id: 'legacy-item',
      fullName: 'Old Profile',
      birthDate: '1990-01-01',
    });
    expect(profile).not.toBeNull();
    expect(profile?.gender).toBe('female');
  });

  it('clears account-scoped profile data on sign-out', async () => {
    await saveAllProfiles([
      { id: 'self', fullName: 'Minh Anh', birthDate: '1998-10-20', gender: 'female' },
    ]);
    await setPrimaryProfileId('self', { pendingCloudSync: false });
    await setProfileCacheOwnerId('user-a');

    await clearLocalProfiles();

    await expect(loadAllProfiles()).resolves.toEqual([]);
    await expect(getPrimaryProfileId()).resolves.toBeNull();
    await expect(getProfileCacheOwnerId()).resolves.toBeNull();
  });
});
