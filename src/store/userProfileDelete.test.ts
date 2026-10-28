jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

jest.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { deleteProfile, loadAllProfiles, saveAllProfiles, setPrimaryProfileId } from './userProfile';

const CLOUD_CHILD_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const mockGetSession = supabase!.auth.getSession as jest.Mock;
const mockFrom = supabase!.from as jest.Mock;
let mockCloudDeleteResult: jest.Mock;
let mockCloudDeleteByUser: jest.Mock;
let mockCloudDeleteById: jest.Mock;

describe('profile deletion consistency', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterAll(() => warnSpy.mockRestore());

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockCloudDeleteResult = jest.fn().mockResolvedValue({ error: null });
    mockCloudDeleteByUser = jest.fn(() => mockCloudDeleteResult());
    mockCloudDeleteById = jest.fn(() => ({ eq: mockCloudDeleteByUser }));
    mockFrom.mockReturnValue({ delete: jest.fn(() => ({ eq: mockCloudDeleteById })) });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    await saveAllProfiles([
      { id: 'self', fullName: 'Minh Anh', birthDate: '1998-10-20', gender: 'female' },
      { id: CLOUD_CHILD_ID, fullName: 'Mẹ', birthDate: '1970-02-01', gender: 'female' },
    ]);
    await setPrimaryProfileId('self', { pendingCloudSync: false });
  });

  it('removes a cloud-backed child locally only after Supabase confirms deletion', async () => {
    await expect(deleteProfile(CLOUD_CHILD_ID)).resolves.toHaveLength(1);
    await expect(loadAllProfiles()).resolves.toEqual([
      expect.objectContaining({ id: 'self' }),
    ]);
    expect(mockCloudDeleteById).toHaveBeenCalledWith('id', CLOUD_CHILD_ID);
    expect(mockCloudDeleteByUser).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('keeps the local child when Supabase deletion fails', async () => {
    mockCloudDeleteResult.mockResolvedValue({ error: { message: 'offline' } });

    await expect(deleteProfile(CLOUD_CHILD_ID)).rejects.toEqual({ message: 'offline' });
    await expect(loadAllProfiles()).resolves.toHaveLength(2);
  });
});

