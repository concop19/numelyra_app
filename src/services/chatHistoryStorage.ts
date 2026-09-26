import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_STORED_CHAT_MESSAGES = 100;

export interface StoredChatMessage {
  id: string;
  sender: 'user' | 'mascot';
  text: string;
  time: string;
  card?: unknown;
  isTypingCompleted?: boolean;
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

const normalizeMessages = (messages: StoredChatMessage[]): StoredChatMessage[] => (
  messages.slice(-MAX_STORED_CHAT_MESSAGES).map((message) => ({
    ...message,
    // A restored response must never replay its typewriter animation.
    isTypingCompleted: message.sender === 'mascot' ? true : message.isTypingCompleted,
  }))
);

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
