import type { ProfileItem } from '../store/userProfile';
import {
  cloudRowToProfileItem,
  mergeCloudAndLocalProfiles,
  profileItemToCloudPayload,
  isProfileStateReadyForIdentity,
  reconcileSelectedProfiles,
} from './profileSync';

const remoteSelf: ProfileItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'Minh Anh',
  birthDate: '1998-10-20',
  gender: 'female',
  isPrimary: true,
};

describe('mobile profile cloud synchronization', () => {
  it('hydrates every portable profile field from a cloud row', () => {
    expect(cloudRowToProfileItem({
      id: remoteSelf.id,
      name: remoteSelf.fullName,
      birth_date: remoteSelf.birthDate,
      gender: 'female',
      is_primary: true,
      birth_time: '14:30',
      birth_place: 'Hà Nội',
      birth_time_accuracy: 'exact',
      birth_location: {
        placeId: 'hn',
        userLabel: 'Hà Nội',
        latitude: 21.0285,
        longitude: 105.8542,
        timeZoneIdentifier: 'Asia/Bangkok',
        resolvedAt: '2026-10-28T00:00:00.000Z',
      },
    })).toMatchObject({
      ...remoteSelf,
      birthTime: '14:30',
      birthPlace: 'Hà Nội',
      birthTimeAccuracy: 'exact',
      birthLocation: { placeId: 'hn' },
    });
  });

  it('returns the complete cloud set on a fresh device', () => {
    const mother = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      fullName: 'Mẹ',
      birthDate: '1970-02-01',
      gender: 'female' as const,
    };
    const result = mergeCloudAndLocalProfiles([remoteSelf, mother], [], true);
    expect(result.profiles).toEqual([remoteSelf, mother]);
    expect(result.pendingLocalCreates).toEqual([]);
  });

  it('does not resurrect a cloud UUID deleted on another device', () => {
    const staleDeleted = {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      fullName: 'Đã xóa',
      birthDate: '1980-01-01',
    };
    const result = mergeCloudAndLocalProfiles([remoteSelf], [remoteSelf, staleDeleted], true);
    expect(result.profiles).toEqual([remoteSelf]);
    expect(result.pendingLocalCreates).toEqual([]);
  });

  it('queues a guest/offline profile once and keeps its full payload', () => {
    const offline = {
      id: 'prof-offline-1',
      fullName: 'Ba',
      birthDate: '1968-03-04',
      gender: 'male' as const,
      birthTime: '08:15',
      birthPlace: 'Huế',
    };
    const result = mergeCloudAndLocalProfiles([remoteSelf], [offline], true);
    expect(result.pendingLocalCreates).toEqual([offline]);
    expect(profileItemToCloudPayload(offline, 'user-1')).toMatchObject({
      user_id: 'user-1',
      birth_time: '08:15',
      birth_place: 'Huế',
    });
  });

  it('never claims local profiles when the cache belongs to another account', () => {
    const otherAccountProfile = {
      id: 'prof-other-user',
      fullName: 'Private A',
      birthDate: '1990-01-01',
    };
    const result = mergeCloudAndLocalProfiles([remoteSelf], [otherAccountProfile], false);
    expect(result.profiles).toEqual([remoteSelf]);
    expect(result.pendingLocalCreates).toEqual([]);
  });

  it('reconciles selected profiles with refreshed cloud objects and preserves couple order', () => {
    const partner = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      fullName: 'Partner updated',
      birthDate: '1997-04-12',
    };
    const stalePartner = { ...partner, fullName: 'Partner old' };
    const refreshedSelf = { ...remoteSelf, fullName: 'Minh Anh updated' };

    expect(reconcileSelectedProfiles(
      [stalePartner, remoteSelf],
      [refreshedSelf, partner],
      refreshedSelf,
    )).toEqual([partner, refreshedSelf]);
  });

  it('falls back to the primary profile when every selected profile was deleted', () => {
    expect(reconcileSelectedProfiles(
      [{ id: 'deleted', fullName: 'Deleted', birthDate: '1990-01-01' }],
      [remoteSelf],
      remoteSelf,
    )).toEqual([remoteSelf]);
  });

  it('invalidates guest readiness synchronously when a signed-in identity appears', () => {
    expect(isProfileStateReadyForIdentity(true, 'guest', 'user-123')).toBe(false);
    expect(isProfileStateReadyForIdentity(true, 'user-123', 'user-123')).toBe(true);
    expect(isProfileStateReadyForIdentity(true, 'guest', null)).toBe(true);
  });
});

