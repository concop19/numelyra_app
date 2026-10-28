import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_STORED_CHAT_MESSAGES = 100;

export type ChatMessageSyncStatus = 'pending' | 'synced' | 'failed';

export interface StoredChatMessage {
  id: string;
  sender: 'user' | 'mascot';
  text: string;
  time: string;
  /** Stable identity shared by one user question and its assistant reply. */
  turnId?: string;
  /** Absolute creation time; `time` is display-only and contains no date. */
  createdAt?: number;
  card?: unknown;
  isTypingCompleted?: boolean;
  syncStatus?: ChatMessageSyncStatus;
  syncedAt?: string | null;
}

const HISTORY_KEY_PREFIX = '@numelyra_chat_history:v1';
const pendingWrites = new Map<string, Promise<unknown>>();

const getHistoryKey = (ownerId: string) => `${HISTORY_KEY_PREFIX}:${ownerId || 'guest'}`;

const enqueueWrite = <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  const previous = pendingWrites.get(key) || Promise.resolve();
  const queued = previous.catch(() => undefined).then(operation);

  pendingWrites.set(key, queued);
  void queued.then(
    () => {
      if (pendingWrites.get(key) === queued) pendingWrites.delete(key);
    },
    () => {
      if (pendingWrites.get(key) === queued) pendingWrites.delete(key);
    }
  );

  return queued;
};

const isStoredChatMessage = (value: unknown): value is StoredChatMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<StoredChatMessage>;
  return (
    typeof message.id === 'string' &&
    (message.sender === 'user' || message.sender === 'mascot') &&
    typeof message.text === 'string' &&
    typeof message.time === 'string'
  );
};

const getMessageTimestamp = (message: StoredChatMessage): number | null => {
  if (typeof message.createdAt === 'number' && Number.isFinite(message.createdAt)) {
    return message.createdAt;
  }

  // Legacy chat messages used `user-<epoch>` and `mascot-<epoch>` ids.
  const legacyTimestamp = message.id.match(/^(?:user|mascot)-(\d{10,})/i)?.[1];
  if (!legacyTimestamp) return null;

  const parsed = Number(legacyTimestamp);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLinkedQuestionText = (message: StoredChatMessage): string | null => {
  if (!message.card || typeof message.card !== 'object') return null;
  const questionText = (message.card as { questionText?: unknown }).questionText;
  return typeof questionText === 'string' && questionText.trim() ? questionText : null;
};

const normalizeQuestion = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

/**
 * Restore the actual turn order instead of trusting response completion order.
 *
 * New records use `turnId`. For legacy records, assistant card payloads already
 * contain `questionText`, which lets us put a delayed reply immediately after
 * the question it belongs to. Unlinked legacy records keep their stable order.
 */
export function orderChatHistoryMessages<T extends StoredChatMessage>(messages: T[]): T[] {
  const ordered = messages
    .map((message, originalIndex) => ({
      message,
      originalIndex,
      timestamp: getMessageTimestamp(message),
    }))
    .sort((left, right) => {
      if (left.timestamp !== null && right.timestamp !== null && left.timestamp !== right.timestamp) {
        return left.timestamp - right.timestamp;
      }
      return left.originalIndex - right.originalIndex;
    });

  const users = ordered.filter(({ message }) => message.sender === 'user');
  const usedUserIndexes = new Set<number>();
  const linkedAssistantIndexes = new Set<number>();
  const repliesByUserIndex = new Map<number, typeof ordered>();

  ordered.forEach((assistantEntry) => {
    const assistant = assistantEntry.message;
    if (assistant.sender !== 'mascot') return;

    let matchingUser = assistant.turnId
      ? users.find(({ message, originalIndex }) => (
          !usedUserIndexes.has(originalIndex) && message.turnId === assistant.turnId
        ))
      : undefined;

    if (!matchingUser) {
      const linkedQuestion = getLinkedQuestionText(assistant);
      if (linkedQuestion) {
        const normalizedLinkedQuestion = normalizeQuestion(linkedQuestion);
        matchingUser = users.find(({ message, originalIndex }) => (
          !usedUserIndexes.has(originalIndex)
          && normalizeQuestion(message.text) === normalizedLinkedQuestion
        ));
      }
    }

    if (!matchingUser) return;

    usedUserIndexes.add(matchingUser.originalIndex);
    linkedAssistantIndexes.add(assistantEntry.originalIndex);
    const replies = repliesByUserIndex.get(matchingUser.originalIndex) || [];
    replies.push(assistantEntry);
    repliesByUserIndex.set(matchingUser.originalIndex, replies);
  });

  const result: T[] = [];
  ordered.forEach((entry) => {
    if (linkedAssistantIndexes.has(entry.originalIndex)) return;

    result.push(entry.message);
    if (entry.message.sender !== 'user') return;

    const replies = repliesByUserIndex.get(entry.originalIndex);
    if (replies) result.push(...replies.map(({ message }) => message));
  });

  return result;
}

const normalizeMessages = (messages: StoredChatMessage[]): StoredChatMessage[] => (
  orderChatHistoryMessages(messages).slice(-MAX_STORED_CHAT_MESSAGES).map((message) => ({
    ...message,
    // A restored response must never replay its typewriter animation.
    isTypingCompleted: message.sender === 'mascot' ? true : message.isTypingCompleted,
  }))
);

/**
 * The persisted array stays chronological; the chat viewport is newest-first.
 * `offset` is counted from the newest item so subsequent pages never overlap.
 */
export function getChatHistoryPage<T extends StoredChatMessage>(
  messages: T[],
  offset: number,
  limit: number
): T[] {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(0, limit);
  const end = Math.max(0, messages.length - safeOffset);
  const start = Math.max(0, end - safeLimit);
  return messages.slice(start, end).reverse();
}

export async function loadChatHistory(ownerId: string): Promise<StoredChatMessage[]> {
  const key = getHistoryKey(ownerId);

  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Stored chat history is not an array.');

    return normalizeMessages(parsed.filter(isStoredChatMessage));
  } catch (error) {
    console.warn('[chatHistoryStorage] Ignoring unreadable local history:', error);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // The app can still start with an empty history if cleanup fails.
    }
    return [];
  }
}

export async function saveChatHistory(
  ownerId: string,
  messages: StoredChatMessage[]
): Promise<void> {
  const key = getHistoryKey(ownerId);
  const normalized = normalizeMessages(messages.filter(isStoredChatMessage));

  try {
    await enqueueWrite(key, () => AsyncStorage.setItem(key, JSON.stringify(normalized)));
  } catch (error) {
    console.warn('[chatHistoryStorage] Could not save local history:', error);
  }
}

/** Remove only the selected item and serialize with saves for the same owner. */
export async function deleteChatMessage(ownerId: string, messageId: string): Promise<boolean> {
  const key = getHistoryKey(ownerId);

  try {
    return await enqueueWrite(key, async () => {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return false;

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return false;

      const history = normalizeMessages(parsed.filter(isStoredChatMessage));
      const next = history.filter((message) => message.id !== messageId);
      if (next.length === history.length) return false;

      await AsyncStorage.setItem(key, JSON.stringify(next));
      return true;
    });
  } catch (error) {
    console.warn('[chatHistoryStorage] Could not delete local chat message:', error);
    return false;
  }
}

export async function clearChatHistory(ownerId: string): Promise<boolean> {
  const key = getHistoryKey(ownerId);

  try {
    await enqueueWrite(key, () => AsyncStorage.removeItem(key));
    return true;
  } catch (error) {
    console.warn('[chatHistoryStorage] Could not clear local history:', error);
    return false;
  }
}

/** Cập nhật syncStatus và syncedAt cho danh sách messageIds trong AsyncStorage */
export async function updateMessagesSyncStatus(
  ownerId: string,
  messageIds: string[],
  syncStatus: ChatMessageSyncStatus,
  syncedAt: string = new Date().toISOString()
): Promise<void> {
  if (messageIds.length === 0) return;
  const key = getHistoryKey(ownerId);
  const targetIdSet = new Set(messageIds);

  try {
    await enqueueWrite(key, async () => {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const history = parsed.filter(isStoredChatMessage);
      let changed = false;
      const updated = history.map((msg) => {
        if (targetIdSet.has(msg.id)) {
          changed = true;
          return {
            ...msg,
            syncStatus,
            syncedAt: syncStatus === 'synced' ? syncedAt : (msg.syncedAt ?? null),
          };
        }
        return msg;
      });

      if (changed) {
        await AsyncStorage.setItem(key, JSON.stringify(normalizeMessages(updated)));
      }
    });
  } catch (error) {
    console.warn('[chatHistoryStorage] Could not update sync status:', error);
  }
}

/** Thay thế toàn bộ lịch sử trò chuyện (dùng khi nạp từ server về) */
export async function replaceChatHistory(
  ownerId: string,
  messages: StoredChatMessage[]
): Promise<void> {
  const key = getHistoryKey(ownerId);
  const normalized = normalizeMessages(messages.filter(isStoredChatMessage));

  try {
    await enqueueWrite(key, () => AsyncStorage.setItem(key, JSON.stringify(normalized)));
  } catch (error) {
    console.warn('[chatHistoryStorage] Could not replace local history:', error);
  }
}

/**
 * Hợp nhất tin nhắn tải từ server với tin nhắn cục bộ (giữ nguyên pending messages)
 */
export async function mergeCloudChatHistory(
  ownerId: string,
  cloudMessages: StoredChatMessage[]
): Promise<StoredChatMessage[]> {
  const key = getHistoryKey(ownerId);

  try {
    return await enqueueWrite(key, async () => {
      const raw = await AsyncStorage.getItem(key);
      const localList: StoredChatMessage[] = raw
        ? (JSON.parse(raw) as unknown[]).filter(isStoredChatMessage)
        : [];

      const mergedMap = new Map<string, StoredChatMessage>();

      // Đưa local messages vào map trước
      for (const msg of localList) {
        mergedMap.set(msg.id, msg);
      }

      // Hợp nhất cloud messages vào map
      for (const cloudMsg of cloudMessages) {
        if (mergedMap.has(cloudMsg.id)) {
          const local = mergedMap.get(cloudMsg.id)!;
          mergedMap.set(cloudMsg.id, {
            ...local,
            ...cloudMsg,
            syncStatus: 'synced',
            syncedAt: cloudMsg.syncedAt || new Date().toISOString(),
          });
        } else {
          mergedMap.set(cloudMsg.id, {
            ...cloudMsg,
            syncStatus: 'synced',
          });
        }
      }

      const mergedList = normalizeMessages(Array.from(mergedMap.values()));
      await AsyncStorage.setItem(key, JSON.stringify(mergedList));
      return mergedList;
    });
  } catch (error) {
    console.warn('[chatHistoryStorage] Could not merge cloud history:', error);
    return [];
  }
}

