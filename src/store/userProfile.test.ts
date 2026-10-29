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
  updateProfile,
} from './userProfile';
import {
  birthDateInputToIso,
  birthDateToInputValue,
  formatBirthDateInput,
  formatBirthTimeInput,
} from '../utils/birthInputFormatting';

describe('profile birth input formatting', () => {
  it('inserts separators immediately and supports deleting them', () => {
    expect(formatBirthDateInput('12', '1')).toBe('12/');
    expect(formatBirthDateInput('12/08', '12/0')).toBe('12/08/');
    expect(formatBirthDateInput('12', '12/')).toBe('1');
    expect(formatBirthTimeInput('08', '0')).toBe('08:');
    expect(formatBirthTimeInput('08', '08:')).toBe('0');
  });

  it('converts between display and stored birth-date formats', () => {
    expect(birthDateToInputValue('1998-10-20')).toBe('20/10/1998');
    expect(birthDateInputToIso('20/10/1998')).toBe('1998-10-20');
    expect(birthDateInputToIso('31/02/1998')).toBeNull();
  });
});

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

  it('updates optional birth time and place details', async () => {
    const created = await addProfile({ fullName: 'Minh Anh', birthDate: '1998-10-20', gender: 'female' });
    const birthLocation = {
      placeId: 'hanoi',
      userLabel: 'Hà Nội, Việt Nam',
      latitude: 21.0285,
      longitude: 105.8542,
      timeZoneIdentifier: 'Asia/Bangkok',
      resolvedAt: '2026-10-29T00:00:00.000Z',
    };

    const updated = await updateProfile(created.id, {
      fullName: created.fullName,
      birthDate: created.birthDate,
      gender: 'female',
      birthTime: '08:30',
      birthPlace: birthLocation.userLabel,
      birthLocation,
      birthTimeAccuracy: 'exact',
    });

    expect(updated).toMatchObject({
      birthTime: '08:30',
      birthPlace: 'Hà Nội, Việt Nam',
      birthLocation,
      birthTimeAccuracy: 'exact',
    });
    await expect(loadAllProfiles()).resolves.toEqual([
      expect.objectContaining({ id: created.id, birthTime: '08:30', birthPlace: 'Hà Nội, Việt Nam' }),
    ]);
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
