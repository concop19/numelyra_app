import {
  PENDING_SYNC_THRESHOLD,
  downloadAllCloudChatData,
  downloadAllCloudProfiles,
  syncPendingMessagesBatch,
} from './chatSessionSyncService';
import * as chatDb from '../db/chatDatabaseService';
import * as chatHistory from './chatHistoryStorage';
import * as userProfile from '../store/userProfile';
import { supabase } from './supabaseClient';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

jest.mock('../db/chatDatabaseService', () => ({
  getGlobalPendingMessageCount: jest.fn(),
  getPendingMessagesBatch: jest.fn(),
  getLocalChatSession: jest.fn(),
  markMessagesBatchSynced: jest.fn(),
  bulkHydrateChatData: jest.fn(),
  getLocalChatMessages: jest.fn(),
  getPendingChatData: jest.fn(),
  markChatDataSynced: jest.fn(),
  upsertLocalChatSnapshot: jest.fn(),
}));

jest.mock('./chatHistoryStorage', () => ({
  mergeCloudChatHistory: jest.fn(),
  updateMessagesSyncStatus: jest.fn(),
  replaceChatHistory: jest.fn(),
}));

jest.mock('../store/userProfile', () => ({
  clearLocalProfiles: jest.fn().mockResolvedValue(undefined),
  loadAllProfiles: jest.fn().mockResolvedValue([]),
  saveAllProfiles: jest.fn().mockResolvedValue(undefined),
  setProfileCacheOwnerId: jest.fn().mockResolvedValue(undefined),
  setPrimaryProfileId: jest.fn().mockResolvedValue(undefined),
  isProfileGender: jest.fn((g) => g === 'male' || g === 'female'),
  isMissingPrimaryColumnError: jest.fn(() => false),
  isMissingGenderColumnError: jest.fn(() => false),
}));

jest.mock('./supabaseClient', () => {
  const upsertSessionsMock = jest.fn().mockResolvedValue({ error: null });
  const upsertMessagesMock = jest.fn().mockResolvedValue({ error: null });

  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-123', email: 'test@numelyra.com' } },
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'chat_sessions') {
          return {
            upsert: upsertSessionsMock,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'sess-1',
                      user_id: 'test-user-123',
                      title: 'Phiên 1',
                      intent: 'general',
                      mode: 'single',
                      context_data: null,
                      question_count: 2,
                      max_questions: 10,
                      status: 'active',
                      created_at: '2026-10-27T10:00:00Z',
                      updated_at: '2026-10-27T10:05:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'chat_messages') {
          return {
            upsert: upsertMessagesMock,
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'msg-1',
                        session_id: 'sess-1',
                        turn_index: 0,
                        sender: 'user',
                        text: 'Chào bạn',
                        card_payload: null,
                        created_at: '2026-10-27T10:00:00Z',
                      },
                      {
                        id: 'msg-2',
                        session_id: 'sess-1',
                        turn_index: 0,
                        sender: 'mascot',
                        text: 'Chào bạn, tôi là Numelyra',
                        card_payload: null,
                        created_at: '2026-10-27T10:01:00Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'user_numerology_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'prof-1',
                      name: 'Nguyễn Văn A',
                      birth_date: '1995-05-15',
                      gender: 'male',
                      is_primary: true,
                      created_at: '2026-10-27T08:00:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }),
    },
  };
});

describe('chatSessionSyncService - 10-message batch sync & full download', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT trigger sync when pending message count is less than 10', async () => {
    (chatDb.getGlobalPendingMessageCount as jest.Mock).mockResolvedValue(5);

    const result = await syncPendingMessagesBatch(PENDING_SYNC_THRESHOLD);

    expect(result).toEqual({ syncedCount: 0, success: true });
    expect(chatDb.getPendingMessagesBatch).not.toHaveBeenCalled();
    expect(chatDb.markMessagesBatchSynced).not.toHaveBeenCalled();
  });

  it('triggers batch sync when pending message count reaches 10', async () => {
    (chatDb.getGlobalPendingMessageCount as jest.Mock).mockResolvedValue(10);
    const mockMessages = Array.from({ length: 10 }, (_, i) => ({
      id: `msg-${i + 1}`,
      sessionId: 'sess-1',
      turnIndex: i,
      sender: i % 2 === 0 ? 'user' : 'mascot',
      text: `Message ${i + 1}`,
      cardPayload: null,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      syncedAt: null,
    }));
    (chatDb.getPendingMessagesBatch as jest.Mock).mockResolvedValue(mockMessages);
    (chatDb.getLocalChatSession as jest.Mock).mockResolvedValue({
      id: 'sess-1',
      userId: 'test-user-123',
      title: 'Hội thoại chính',
      intent: 'general',
      mode: 'single',
      contextData: null,
      questionCount: 5,
      maxQuestions: 10,
      status: 'active',
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: null,
    });

    const result = await syncPendingMessagesBatch(PENDING_SYNC_THRESHOLD);

    expect(result).toEqual({ syncedCount: 10, success: true });
    expect(chatDb.getPendingMessagesBatch).toHaveBeenCalledWith(10);
    expect(chatDb.markMessagesBatchSynced).toHaveBeenCalledWith(mockMessages.map((m) => m.id));
    expect(chatHistory.updateMessagesSyncStatus).toHaveBeenCalledWith(
      'test-user-123',
      mockMessages.map((m) => m.id),
      'synced'
    );
  });

  it('allows forced sync even when pending message count is less than 10', async () => {
    (chatDb.getGlobalPendingMessageCount as jest.Mock).mockResolvedValue(3);
    const mockMessages = Array.from({ length: 3 }, (_, i) => ({
      id: `msg-${i + 1}`,
      sessionId: 'sess-1',
      turnIndex: i,
      sender: 'user',
      text: `Message ${i + 1}`,
      cardPayload: null,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      syncedAt: null,
    }));
    (chatDb.getPendingMessagesBatch as jest.Mock).mockResolvedValue(mockMessages);

    const result = await syncPendingMessagesBatch(10, true);

    expect(result).toEqual({ syncedCount: 3, success: true });
    expect(chatDb.markMessagesBatchSynced).toHaveBeenCalledWith(['msg-1', 'msg-2', 'msg-3']);
  });

  it('downloads all profiles from cloud and saves them locally', async () => {
    const profiles = await downloadAllCloudProfiles();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].fullName).toBe('Nguyễn Văn A');
    expect(userProfile.saveAllProfiles).toHaveBeenCalled();
  });

  it('downloads all chat sessions and messages from cloud into SQLite and AsyncStorage', async () => {
    const result = await downloadAllCloudChatData('test-user-123');

    expect(result).toEqual({ sessionsCount: 1, messagesCount: 2 });
    expect(chatDb.bulkHydrateChatData).toHaveBeenCalled();
    expect(chatHistory.mergeCloudChatHistory).toHaveBeenCalledWith(
      'test-user-123',
      expect.arrayContaining([
        expect.objectContaining({ id: 'msg-1', syncStatus: 'synced' }),
        expect.objectContaining({ id: 'msg-2', syncStatus: 'synced' }),
      ])
    );
  });
});
