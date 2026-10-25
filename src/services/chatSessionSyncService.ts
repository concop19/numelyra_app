import NetInfo from '@react-native-community/netinfo';

import {
  getLocalChatMessages,
  getPendingChatData,
  markChatDataSynced,
  upsertLocalChatSnapshot,
  type LocalChatMessage,
  type LocalChatSession,
} from '../db/chatDatabaseService';
import { supabase } from './supabaseClient';

type CloudSession = {
  id: string; user_id: string; title: string | null; intent: string | null; mode: string;
  context_data: Record<string, unknown> | null; question_count: number; max_questions: number;
  status: LocalChatSession['status']; created_at: string; updated_at: string;
};

type CloudMessage = {
  id: string; session_id: string; turn_index: number; sender: LocalChatMessage['sender'];
  text: string; card_payload: unknown | null; created_at: string;
};

const cloudToLocalSession = (row: CloudSession): LocalChatSession => ({
  id: row.id, userId: row.user_id, title: row.title, intent: row.intent, mode: row.mode,
  contextData: row.context_data, questionCount: row.question_count, maxQuestions: row.max_questions,
  status: row.status, syncStatus: 'synced', createdAt: row.created_at, updatedAt: row.updated_at,
  syncedAt: new Date().toISOString(),
});

const cloudToLocalMessage = (row: CloudMessage): LocalChatMessage => ({
  id: row.id, sessionId: row.session_id, turnIndex: row.turn_index, sender: row.sender,
  text: row.text, cardPayload: row.card_payload, syncStatus: 'synced', createdAt: row.created_at,
  syncedAt: new Date().toISOString(),
});

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
  // Keep locally queued messages that have not reached Supabase yet.
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

/**
 * Several triggers (NetInfo reconnect, end of a turn) can request a sync at
 * the same moment. Keep at most one running sync plus one queued follow-up
 * per session so they never race, while data written during a running sync
 * is still pushed by the follow-up.
 */
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
      id: session.id, user_id: auth.user.id, title: session.title, intent: session.intent,
      mode: session.mode, context_data: session.contextData, question_count: session.questionCount,
      max_questions: session.maxQuestions, status: session.status,
      created_at: session.createdAt, updated_at: session.updatedAt,
    }, { onConflict: 'id' });
    if (error) return false;
  }
  if (pending.messages.length > 0) {
    const { error } = await supabase.from('chat_messages').upsert(pending.messages.map((message) => ({
      id: message.id, session_id: message.sessionId, turn_index: message.turnIndex,
      sender: message.sender, text: message.text, card_payload: message.cardPayload,
      created_at: message.createdAt,
    })), { onConflict: 'id' });
    if (error) return false;
  }
  await markChatDataSynced(sessionId, pending.messages.map((message) => message.id));
  return true;
}

