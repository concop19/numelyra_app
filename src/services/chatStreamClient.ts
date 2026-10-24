import { fetch } from 'expo/fetch';

import { API_ENDPOINTS } from './apiConfig';
import { supabase } from './supabaseClient';
import type { AppLocale } from '../i18n/translations';

export interface ChatStreamDoneEvent {
  done: true;
  accepted: boolean;
  persisted?: boolean;
  turnIndex: number;
  remaining: number;
  sessionCompleted: boolean;
  userMessageId?: string;
  assistantMessageId?: string;
  code?: string;
}

type StreamEvent = Partial<ChatStreamDoneEvent> & { content?: string; error?: string };

export function parseSseBlock(block: string): StreamEvent | null {
  const value = block.split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();
  if (!value || value === '[DONE]') return null;
  try { return JSON.parse(value) as StreamEvent; } catch { return null; }
}

export async function streamContinuedChat(
  payload: {
    sessionId: string;
    message: string;
    turnIndex: number;
    userMessageId: string;
    assistantMessageId: string;
    locale: AppLocale;
    timeZone?: string;
  },
  onChunk: (fullText: string) => void
): Promise<{ text: string; done: ChatStreamDoneEvent }> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const english = payload.locale === 'en';
  if (!data.session?.access_token) throw new Error(english ? 'Sign in to continue this chat.' : 'Bạn cần đăng nhập để tiếp tục trò chuyện.');

  const controller = new AbortController();
  let timeout = setTimeout(() => controller.abort(), 45_000);
  const refreshTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 45_000);
  };

  try {
    const response = await fetch(API_ENDPOINTS.CHAT_CONTINUE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.body) throw new Error(english ? `No answer stream was received (${response.status}).` : `Không nhận được luồng trả lời (${response.status}).`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let doneEvent: ChatStreamDoneEvent | null = null;

    const consume = (block: string) => {
      const event = parseSseBlock(block);
      if (!event) return;
      if (typeof event.content === 'string') {
        text += event.content;
        onChunk(text);
      }
      if (event.done) {
        doneEvent = {
          done: true,
          accepted: event.accepted !== false,
          persisted: event.persisted,
          turnIndex: typeof event.turnIndex === 'number' ? event.turnIndex : payload.turnIndex,
          remaining: typeof event.remaining === 'number' ? event.remaining : Math.max(0, 10 - payload.turnIndex),
          sessionCompleted: Boolean(event.sessionCompleted),
          userMessageId: event.userMessageId,
          assistantMessageId: event.assistantMessageId,
          code: event.code,
        };
      }
      if (event.error && !event.content) throw new Error(event.error);
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        refreshTimeout();
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        blocks.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
    } finally {
      reader.releaseLock();
    }

    const finalEvent = doneEvent as ChatStreamDoneEvent | null;
    if (!finalEvent) throw new Error(english ? 'The answer stream ended unexpectedly.' : 'Luồng trả lời kết thúc không hợp lệ.');
    if (!response.ok && finalEvent.accepted) throw new Error(english ? `The server returned error ${response.status}.` : `Máy chủ trả về lỗi ${response.status}.`);
    return { text, done: finalEvent };
  } catch (error) {
    if (controller.signal.aborted) throw new Error(english ? 'The answer connection timed out.' : 'Kết nối trả lời đã hết thời gian chờ.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

