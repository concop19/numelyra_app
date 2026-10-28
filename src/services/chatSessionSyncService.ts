import NetInfo from '@react-native-community/netinfo';
import type { User } from '@supabase/supabase-js';

import {
  bulkHydrateChatData,
  getGlobalPendingMessageCount,
  getLocalChatMessages,
  getLocalChatSession,
  getPendingChatData,
  getPendingMessagesBatch,
  markChatDataSynced,
  markMessagesBatchSynced,
  upsertLocalChatSnapshot,
  type LocalChatMessage,
  type LocalChatSession,
} from '../db/chatDatabaseService';
import {
  mergeCloudChatHistory,
  replaceChatHistory,
  updateMessagesSyncStatus,
  type StoredChatMessage,
} from './chatHistoryStorage';
import {
  clearLocalProfiles,
  saveAllProfiles,
  setProfileCacheOwnerId,
  setPrimaryProfileId,
  type ProfileItem,
} from '../store/userProfile';
import { cloudRowToProfileItem, type CloudNumerologyProfileRow } from './profileSync';
import { supabase } from './supabaseClient';

export const PENDING_SYNC_THRESHOLD = 10;

type CloudSession = {
  id: string;
  user_id: string;
  title: string | null;
  intent: string | null;
  mode: string;
  context_data: Record<string, unknown> | null;
  question_count: number;
  max_questions: number;
  status: LocalChatSession['status'];
  created_at: string;
  updated_at: string;
};

type CloudMessage = {
  id: string;
  session_id: string;
  turn_index: number;
  sender: LocalChatMessage['sender'];
  text: string;
  card_payload: unknown | null;
  created_at: string;
};

const cloudToLocalSession = (row: CloudSession): LocalChatSession => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  intent: row.intent,
  mode: row.mode,
  contextData: row.context_data,
  questionCount: row.question_count,
  maxQuestions: row.max_questions,
  status: row.status,
  syncStatus: 'synced',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  syncedAt: new Date().toISOString(),
});

const cloudToLocalMessage = (row: CloudMessage): LocalChatMessage => ({
  id: row.id,
  sessionId: row.session_id,
  turnIndex: row.turn_index,
  sender: row.sender,
  text: row.text,
  cardPayload: row.card_payload,
  syncStatus: 'synced',
  createdAt: row.created_at,
  syncedAt: new Date().toISOString(),
});

/** Nạp (Hydrate) 1 phiên từ Supabase */
export async function hydrateChatSessionFromSupabase(sessionId: string): Promise<{
  session: LocalChatSession;
  messages: LocalChatMessage[];
} | null> {
  if (!supabase) return null;
  const [{ data: session, error: sessionError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from('chat_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('turn_index').order('created_at'),
  ]);
  if (sessionError || messagesError || !session) return null;
  const localSession = cloudToLocalSession(session as CloudSession);
  const localMessages = ((messages || []) as CloudMessage[]).map(cloudToLocalMessage);
  await upsertLocalChatSnapshot(localSession, localMessages);
  return { session: localSession, messages: await getLocalChatMessages(sessionId) };
}

const inFlightSyncs = new Map<string, Promise<boolean>>();
const queuedSyncs = new Map<string, Promise<boolean>>();

function startSync(sessionId: string): Promise<boolean> {
  const run = runPendingChatSync(sessionId)
    .catch((error) => {
      console.warn('[chatSessionSync] Sync failed:', error);
      return false;
    })
    .finally(() => {
      if (inFlightSyncs.get(sessionId) === run) inFlightSyncs.delete(sessionId);
    });
  inFlightSyncs.set(sessionId, run);
  return run;
}

export function syncPendingChatSession(sessionId: string): Promise<boolean> {
  const running = inFlightSyncs.get(sessionId);
  if (!running) return startSync(sessionId);
  const queued = queuedSyncs.get(sessionId);
  if (queued) return queued;
  const followUp = running.then(() => {
    queuedSyncs.delete(sessionId);
    return startSync(sessionId);
  });
  queuedSyncs.set(sessionId, followUp);
  return followUp;
}

async function runPendingChatSync(sessionId: string): Promise<boolean> {
  if (!supabase) return false;
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const pending = await getPendingChatData(sessionId);

  if (pending.session) {
    const session = pending.session;
    const { error } = await supabase.from('chat_sessions').upsert({
      id: session.id,
      user_id: auth.user.id,
      title: session.title,
      intent: session.intent,
      mode: session.mode,
      context_data: session.contextData,
      question_count: session.questionCount,
      max_questions: session.maxQuestions,
      status: session.status,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    }, { onConflict: 'id' });
    if (error) return false;
  }
  if (pending.messages.length > 0) {
    const { error } = await supabase.from('chat_messages').upsert(pending.messages.map((message) => ({
      id: message.id,
      session_id: message.sessionId,
      turn_index: message.turnIndex,
      sender: message.sender,
      text: message.text,
      card_payload: message.cardPayload,
      created_at: message.createdAt,
    })), { onConflict: 'id' });
    if (error) return false;
  }
  await markChatDataSynced(sessionId, pending.messages.map((message) => message.id));
  return true;
}

// ============================================================================
// BATCH SYNC: Đồng bộ khi đủ 10 tin nhắn pending
// ============================================================================

let isBatchSyncRunning = false;

/**
 * Kiểm tra và thực hiện đồng bộ theo lô khi đủ 10 tin nhắn pending (hoặc khi force = true).
 * Sau khi hoàn tất thành công, trạng thái các tin nhắn được chuyển thành 'synced' (successful).
 */
export async function syncPendingMessagesBatch(
  threshold: number = PENDING_SYNC_THRESHOLD,
  force: boolean = false
): Promise<{ syncedCount: number; success: boolean }> {
  if (!supabase) return { syncedCount: 0, success: false };
  if (isBatchSyncRunning) return { syncedCount: 0, success: false };

  const pendingCount = await getGlobalPendingMessageCount();
  if (pendingCount < threshold && !force) {
    return { syncedCount: 0, success: true };
  }

  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) {
    return { syncedCount: 0, success: false };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { syncedCount: 0, success: false };

  isBatchSyncRunning = true;
  try {
    const pendingMessages = await getPendingMessagesBatch(threshold);
    if (pendingMessages.length === 0) {
      return { syncedCount: 0, success: true };
    }

    // 1. Thu thập các sessions liên quan đến danh sách tin nhắn này
    const sessionIds = Array.from(new Set(pendingMessages.map((msg) => msg.sessionId)));
    const sessionsToUpsert: LocalChatSession[] = [];
    for (const sid of sessionIds) {
      const sess = await getLocalChatSession(sid);
      if (sess) sessionsToUpsert.push(sess);
    }

    // 2. Upsert sessions lên Supabase
    if (sessionsToUpsert.length > 0) {
      const { error: sessionUpsertError } = await supabase.from('chat_sessions').upsert(
        sessionsToUpsert.map((s) => ({
          id: s.id,
          user_id: auth.user.id,
          title: s.title,
          intent: s.intent,
          mode: s.mode,
          context_data: s.contextData,
          question_count: s.questionCount,
          max_questions: s.maxQuestions,
          status: s.status,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
        })),
        { onConflict: 'id' }
      );
      if (sessionUpsertError) {
        console.warn('[chatSessionSync] Error upserting sessions:', sessionUpsertError);
        return { syncedCount: 0, success: false };
      }
    }

    // 3. Upsert messages lên Supabase
    const { error: messageUpsertError } = await supabase.from('chat_messages').upsert(
      pendingMessages.map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        turn_index: m.turnIndex,
        sender: m.sender,
        text: m.text,
        card_payload: m.cardPayload,
        created_at: m.createdAt,
      })),
      { onConflict: 'id' }
    );
    if (messageUpsertError) {
      console.warn('[chatSessionSync] Error upserting messages batch:', messageUpsertError);
      return { syncedCount: 0, success: false };
    }

    // 4. Set status thành synced / successful trong SQLite và AsyncStorage
    const messageIds = pendingMessages.map((m) => m.id);
    await markMessagesBatchSynced(messageIds);
    await updateMessagesSyncStatus(auth.user.id, messageIds, 'synced');

    return { syncedCount: messageIds.length, success: true };
  } catch (error) {
    console.warn('[chatSessionSync] Batch sync exception:', error);
    return { syncedCount: 0, success: false };
  } finally {
    isBatchSyncRunning = false;
  }
}

// ============================================================================
// FULL DOWNLOAD: Tải toàn bộ hồ sơ (profile) và tin nhắn từ máy chủ về app
// ============================================================================

/** Tải toàn bộ danh sách hồ sơ từ máy chủ về và lưu cục bộ */
export async function downloadAllCloudProfiles(user?: User | null): Promise<ProfileItem[]> {
  if (!supabase) return [];
  const currentUser = user || (await supabase.auth.getUser()).data.user;
  if (!currentUser) return [];

  const { data: remoteProfiles, error: selectError } = await supabase
    .from('user_numerology_profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (selectError || !remoteProfiles) {
    console.warn('[chatSessionSync] Could not download profiles:', selectError);
    return [];
  }

  const downloadedItems = (remoteProfiles as CloudNumerologyProfileRow[]).map(cloudRowToProfileItem);
  if (downloadedItems.length > 0) {
    await saveAllProfiles(downloadedItems);
    await setProfileCacheOwnerId(currentUser.id);
    const primary = downloadedItems.find((p) => p.isPrimary) || downloadedItems[0];
    await setPrimaryProfileId(primary.id, { pendingCloudSync: false });
  } else {
    await clearLocalProfiles();
    await setProfileCacheOwnerId(currentUser.id);
  }

  return downloadedItems;
}

/** Tải toàn bộ phiên trò chuyện và tin nhắn từ máy chủ về máy cục bộ */
export async function downloadAllCloudChatData(
  userId?: string
): Promise<{ sessionsCount: number; messagesCount: number }> {
  if (!supabase) return { sessionsCount: 0, messagesCount: 0 };
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!currentUserId) return { sessionsCount: 0, messagesCount: 0 };

  // 1. Tải toàn bộ sessions của người dùng
  const { data: cloudSessions, error: sessionErr } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: true });

  if (sessionErr || !cloudSessions) {
    console.warn('[chatSessionSync] Could not download cloud sessions:', sessionErr);
    return { sessionsCount: 0, messagesCount: 0 };
  }

  const sessionList = (cloudSessions as CloudSession[]).map(cloudToLocalSession);
  if (sessionList.length === 0) {
    return { sessionsCount: 0, messagesCount: 0 };
  }

  const sessionIds = sessionList.map((s) => s.id);

  // 2. Tải toàn bộ messages của các sessions
  const { data: cloudMessages, error: msgErr } = await supabase
    .from('chat_messages')
    .select('*')
    .in('session_id', sessionIds)
    .order('turn_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (msgErr || !cloudMessages) {
    console.warn('[chatSessionSync] Could not download cloud messages:', msgErr);
    return { sessionsCount: sessionList.length, messagesCount: 0 };
  }

  const messageList = (cloudMessages as CloudMessage[]).map(cloudToLocalMessage);

  // 3. Nạp vào SQLite
  await bulkHydrateChatData(sessionList, messageList);

  // 4. Đồng bộ chuyển đổi sang AsyncStorage ChatHistory để ChatScreen hiển thị tức thì
  const storedMessages: StoredChatMessage[] = messageList.map((m) => {
    const createdTime = new Date(m.createdAt);
    return {
      id: m.id,
      sender: m.sender,
      text: m.text,
      time: createdTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: createdTime.getTime(),
      card: m.cardPayload,
      isTypingCompleted: true,
      syncStatus: 'synced',
      syncedAt: m.syncedAt,
    };
  });
  await mergeCloudChatHistory(currentUserId, storedMessages);

  return { sessionsCount: sessionList.length, messagesCount: messageList.length };
}

/** Tải toàn bộ cả hồ sơ và tin nhắn từ máy chủ về app */
export async function downloadAndSyncAllUserData(): Promise<{
  profilesCount: number;
  sessionsCount: number;
  messagesCount: number;
}> {
  const [profiles, chat] = await Promise.all([
    downloadAllCloudProfiles(),
    downloadAllCloudChatData(),
  ]);
  return {
    profilesCount: profiles.length,
    sessionsCount: chat.sessionsCount,
    messagesCount: chat.messagesCount,
  };
}
