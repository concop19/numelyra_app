jest.mock('./apiConfig', () => ({
  API_ENDPOINTS: { CHAT_CONTINUE: 'https://example.test/api/chat/continue' },
}));

jest.mock('./supabaseClient', () => ({
  supabase: null,
}));

import { parseSseBlock } from './chatStreamClient';

describe('chatStreamClient SSE parser', () => {
  it('parses content and completion events', () => {
    expect(parseSseBlock('data: {"content":"Xin chào"}')).toEqual({ content: 'Xin chào' });
    expect(parseSseBlock('data: {"done":true,"turnIndex":2,"remaining":8}')).toEqual({
      done: true,
      turnIndex: 2,
      remaining: 8,
    });
  });

  it('ignores malformed and provider completion blocks', () => {
    expect(parseSseBlock('data: [DONE]')).toBeNull();
    expect(parseSseBlock('data: not-json')).toBeNull();
  });
});

