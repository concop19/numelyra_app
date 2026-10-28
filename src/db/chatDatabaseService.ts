import * as SQLite from 'expo-sqlite';

export type ChatSessionStatus = 'active' | 'completed' | 'abandoned';
export type ChatSyncStatus = 'pending' | 'synced' | 'failed';

export interface LocalChatSession {
  id: string;
  userId: string;
  title: string | null;
  intent: string | null;
  mode: string;
  contextData: Record<string, unknown> | null;
  questionCount: number;
  maxQuestions: number;
  status: ChatSessionStatus;
  syncStatus: ChatSyncStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export interface LocalChatMessage {
  id: string;
  sessionId: string;
  turnIndex: number;
  sender: 'user' | 'mascot';
  text: string;
  cardPayload: unknown | null;
  syncStatus: ChatSyncStatus;
  createdAt: string;
  syncedAt: string | null;
}

type SessionRow = {
  id: string; user_id: string; title: string | null; intent: string | null; mode: string;
  context_data: string | null; question_count: number; max_questions: number;
  status: ChatSessionStatus; sync_status: ChatSyncStatus; created_at: string;
  updated_at: string; synced_at: string | null;
};

type MessageRow = {
  id: string; session_id: string; turn_index: number; sender: 'user' | 'mascot';
  text: string; card_payload: string | null; sync_status: ChatSyncStatus;
  created_at: string; synced_at: string | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();

/**
 * expo-sqlite uses a single connection and `withTransactionAsync` is not
 * exclusive: overlapping calls issue a nested BEGIN ("cannot start a
 * transaction within a transaction") and a later ROLLBACK fails because the
 * other caller already committed. `withExclusiveTransactionAsync` is not
 * supported on web, so every DB operation runs through this FIFO queue.
 */
function serialized<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const run = operationQueue.then(async () => operation(await database()));
  operationQueue = run.catch(() => undefined);
  return run;
}

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
};

const mapSession = (row: SessionRow): LocalChatSession => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  intent: row.intent,
  mode: row.mode,
  contextData: parseJson(row.context_data),
  questionCount: row.question_count,
  maxQuestions: row.max_questions,
  status: row.status,
  syncStatus: row.sync_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  syncedAt: row.synced_at,
});

const mapMessage = (row: MessageRow): LocalChatMessage => ({
  id: row.id,
  sessionId: row.session_id,
  turnIndex: row.turn_index,
  sender: row.sender,
  text: row.text,
  cardPayload: parseJson(row.card_payload),
  syncStatus: row.sync_status,
  createdAt: row.created_at,
  syncedAt: row.synced_at,
});

async function database(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('numelyra_chat.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT,
          intent TEXT,
          mode TEXT NOT NULL DEFAULT 'single',
          context_data TEXT,
          question_count INTEGER NOT NULL DEFAULT 0,
          max_questions INTEGER NOT NULL DEFAULT 10,
          status TEXT NOT NULL DEFAULT 'active',
          sync_status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          turn_index INTEGER NOT NULL,
          sender TEXT NOT NULL,
          text TEXT NOT NULL,
          card_payload TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          synced_at TEXT,
          FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_turn ON chat_messages(session_id, turn_index, created_at);
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_sync ON chat_sessions(sync_status);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_sync ON chat_messages(sync_status);
      `);
      return db;
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function initChatDatabase(): Promise<void> {
  await database();
}

export function createChatId(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

async function writeSession(db: SQLite.SQLiteDatabase, session: LocalChatSession): Promise<void> {
  await db.runAsync(
    `INSERT INTO chat_sessions (
      id, user_id, title, intent, mode, context_data, question_count, max_questions,
      status, sync_status, created_at, updated_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id=excluded.user_id, title=excluded.title, intent=excluded.intent,
      mode=excluded.mode, context_data=excluded.context_data,
      question_count=excluded.question_count, max_questions=excluded.max_questions,
      status=excluded.status, sync_status=excluded.sync_status,
      updated_at=excluded.updated_at, synced_at=excluded.synced_at`,
    session.id, session.userId, session.title, session.intent, session.mode,
    session.contextData ? JSON.stringify(session.contextData) : null,
    session.questionCount, session.maxQuestions, session.status, session.syncStatus,
    session.createdAt, session.updatedAt, session.syncedAt
  );
}

async function writeMessage(db: SQLite.SQLiteDatabase, message: LocalChatMessage): Promise<void> {
  await db.runAsync(
    `INSERT INTO chat_messages (
      id, session_id, turn_index, sender, text, card_payload, sync_status, created_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      text=excluded.text, card_payload=excluded.card_payload,
      sync_status=excluded.sync_status, synced_at=excluded.synced_at`,
    message.id, message.sessionId, message.turnIndex, message.sender, message.text,
    message.cardPayload == null ? null : JSON.stringify(message.cardPayload),
    message.syncStatus, message.createdAt, message.syncedAt
  );
}

export function upsertLocalChatSession(session: LocalChatSession): Promise<void> {
  return serialized((db) => writeSession(db, session));
}

export function upsertLocalChatMessage(message: LocalChatMessage): Promise<void> {
  return serialized((db) => writeMessage(db, message));
}

/** Writes a hydrated session and its messages atomically in one queued transaction. */
export function upsertLocalChatSnapshot(
  session: LocalChatSession,
  messages: LocalChatMessage[]
): Promise<void> {
  return serialized((db) => db.withTransactionAsync(async () => {
    await writeSession(db, session);
    for (const message of messages) await writeMessage(db, message);
  }));
}

export function getLocalChatSession(sessionId: string): Promise<LocalChatSession | null> {
  return serialized(async (db) => {
    const row = await db.getFirstAsync<SessionRow>('SELECT * FROM chat_sessions WHERE id = ?', sessionId);
    return row ? mapSession(row) : null;
  });
}

export function getLocalChatMessages(sessionId: string): Promise<LocalChatMessage[]> {
  return serialized(async (db) => {
    const rows = await db.getAllAsync<MessageRow>(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY turn_index ASC, created_at ASC',
      sessionId
    );
    return rows.map(mapMessage);
  });
}

export async function savePendingUserMessage(message: LocalChatMessage): Promise<void> {
  await upsertLocalChatMessage({ ...message, syncStatus: 'pending', syncedAt: null });
}

export async function finishLocalChatTurn(
  session: LocalChatSession,
  assistantMessage: LocalChatMessage,
  questionCount: number,
  sessionCompleted: boolean
): Promise<LocalChatSession> {
  const updated: LocalChatSession = {
    ...session,
    questionCount,
    status: sessionCompleted ? 'completed' : 'active',
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
    syncedAt: null,
  };
  // Use the unqueued writers inside the transaction; calling the public
  // (queued) helpers here would wait on this very operation and deadlock.
  await serialized((db) => db.withTransactionAsync(async () => {
    await writeMessage(db, { ...assistantMessage, syncStatus: 'pending', syncedAt: null });
    await writeSession(db, updated);
  }));
  return updated;
}

export function getPendingChatData(sessionId: string): Promise<{
  session: LocalChatSession | null;
  messages: LocalChatMessage[];
}> {
  return serialized(async (db) => {
    const sessionRow = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM chat_sessions WHERE id = ? AND sync_status IN ('pending', 'failed')`,
      sessionId
    );
    const messageRows = await db.getAllAsync<MessageRow>(
      `SELECT * FROM chat_messages WHERE session_id = ? AND sync_status IN ('pending', 'failed')`,
      sessionId
    );
    return {
      session: sessionRow ? mapSession(sessionRow) : null,
      messages: messageRows.map(mapMessage),
    };
  });
}

export function markChatDataSynced(sessionId: string, messageIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  return serialized((db) => db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE chat_sessions SET sync_status='synced', synced_at=? WHERE id=?`,
      now,
      sessionId
    );
    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE chat_messages SET sync_status='synced', synced_at=? WHERE id IN (${placeholders})`,
        now,
        ...messageIds
      );
    }
  }));
}

/** Đếm tổng số tin nhắn đang ở trạng thái pending hoặc failed cần đồng bộ */
export function getGlobalPendingMessageCount(): Promise<number> {
  return serialized(async (db) => {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM chat_messages WHERE sync_status IN ('pending', 'failed')`
    );
    return row?.count ?? 0;
  });
}

/** Lấy lô tin nhắn pending (mặc định 10 tin nhắn) */
export function getPendingMessagesBatch(limit: number = 10): Promise<LocalChatMessage[]> {
  return serialized(async (db) => {
    const rows = await db.getAllAsync<MessageRow>(
      `SELECT * FROM chat_messages WHERE sync_status IN ('pending', 'failed') ORDER BY created_at ASC LIMIT ?`,
      limit
    );
    return rows.map(mapMessage);
  });
}

/** Đánh dấu thành công (synced) cho danh sách tin nhắn sau khi server xác nhận */
export function markMessagesBatchSynced(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return Promise.resolve();
  const now = new Date().toISOString();
  return serialized((db) => db.withTransactionAsync(async () => {
    const placeholders = messageIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE chat_messages SET sync_status='synced', synced_at=? WHERE id IN (${placeholders})`,
      now,
      ...messageIds
    );
    // Cập nhật session tương ứng nếu tất cả tin nhắn trong session đã sync
    await db.runAsync(
      `UPDATE chat_sessions SET sync_status='synced', synced_at=?
       WHERE id IN (SELECT DISTINCT session_id FROM chat_messages WHERE id IN (${placeholders}))
         AND id NOT IN (SELECT DISTINCT session_id FROM chat_messages WHERE sync_status IN ('pending', 'failed'))`,
      now,
      ...messageIds
    );
  }));
}

/** Nạp (Hydrate) toàn bộ danh sách phiên và tin nhắn từ server về máy cục bộ */
export function bulkHydrateChatData(
  sessions: LocalChatSession[],
  messages: LocalChatMessage[]
): Promise<void> {
  return serialized((db) => db.withTransactionAsync(async () => {
    for (const session of sessions) {
      await writeSession(db, session);
    }
    for (const message of messages) {
      await writeMessage(db, message);
    }
  }));
}

/** Đảm bảo luôn có 1 phiên chính cho tài khoản người dùng trên ChatScreen */
export async function ensureMainUserChatSession(userId: string): Promise<LocalChatSession> {
  const sessionId = `main-chat-${userId}`;
  const existing = await getLocalChatSession(sessionId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const newSession: LocalChatSession = {
    id: sessionId,
    userId,
    title: 'Hội thoại chính',
    intent: 'general',
    mode: 'single',
    contextData: null,
    questionCount: 0,
    maxQuestions: 1000,
    status: 'active',
    syncStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  };
  await upsertLocalChatSession(newSession);
  return newSession;
}

/** Lấy tất cả tin nhắn cục bộ theo user id để hiển thị trên UI */
export function getAllLocalMessagesForUser(userId: string): Promise<LocalChatMessage[]> {
  return serialized(async (db) => {
    const rows = await db.getAllAsync<MessageRow>(
      `SELECT m.* FROM chat_messages m
       INNER JOIN chat_sessions s ON m.session_id = s.id
       WHERE s.user_id = ?
       ORDER BY m.created_at ASC`,
      userId
    );
    return rows.map(mapMessage);
  });
}


