const mockMemory = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockMemory.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockMemory.delete(key); }),
  },
}));

import {
  deleteChatMessage,
  getChatHistoryPage,
  loadChatHistory,
  MAX_STORED_CHAT_MESSAGES,
  saveChatHistory,
  type StoredChatMessage,
} from './chatHistoryStorage';

const message = (id: string, sender: StoredChatMessage['sender'] = 'user'): StoredChatMessage => ({
  id,
  sender,
  text: `Message ${id}`,
  time: '10:00',
});

beforeEach(() => mockMemory.clear());

describe('chatHistoryStorage', () => {
  it('returns newest-first history pages without overlap', () => {
    const history = Array.from({ length: 25 }, (_, index) => message(String(index)));

    expect(getChatHistoryPage(history, 0, 1).map((item) => item.id)).toEqual(['24']);
    expect(getChatHistoryPage(history, 1, 10).map((item) => item.id)).toEqual([
      '23', '22', '21', '20', '19', '18', '17', '16', '15', '14',
    ]);
    expect(getChatHistoryPage(history, 11, 10).map((item) => item.id)).toEqual([
      '13', '12', '11', '10', '9', '8', '7', '6', '5', '4',
    ]);
  });

  it('keeps only the latest 100 messages', async () => {
    await saveChatHistory('owner-a', Array.from({ length: 101 }, (_, index) => message(String(index))));

    const history = await loadChatHistory('owner-a');

    expect(history).toHaveLength(MAX_STORED_CHAT_MESSAGES);
    expect(history[0].id).toBe('1');
    expect(history.at(-1)?.id).toBe('100');
  });

  it('deletes one user message without deleting its AI reply', async () => {
    await saveChatHistory('owner-a', [message('user-1'), message('mascot-1', 'mascot')]);

    await expect(deleteChatMessage('owner-a', 'user-1')).resolves.toBe(true);
    await expect(loadChatHistory('owner-a')).resolves.toEqual([
      { ...message('mascot-1', 'mascot'), isTypingCompleted: true },
    ]);
  });

  it('deletes one AI message without affecting another owner', async () => {
    await saveChatHistory('owner-a', [message('mascot-1', 'mascot')]);
    await saveChatHistory('owner-b', [message('user-2')]);

    await deleteChatMessage('owner-a', 'mascot-1');

    await expect(loadChatHistory('owner-a')).resolves.toEqual([]);
    await expect(loadChatHistory('owner-b')).resolves.toEqual([message('user-2')]);
  });
});
