import { cleanTextForSpeech } from './ttsService';

describe('cleanTextForSpeech', () => {
  test('normalizes Vietnamese headings and percentages', () => {
    expect(cleanTextForSpeech('**KẾT LUẬN:** Tốt 75%.', 'vi-VN'))
      .toBe('KẾT LUẬN. Tốt 75 phần trăm.');
  });

  test('normalizes English headings without Vietnamese speech substitutions', () => {
    expect(cleanTextForSpeech('## QUICK CONCLUSION: Focus is 75%.', 'en-US'))
      .toBe('QUICK CONCLUSION. Focus is 75 percent.');
  });
});
