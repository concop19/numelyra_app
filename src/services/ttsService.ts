import * as Speech from 'expo-speech';

export interface TTSOptions {
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
  rate?: number;
  pitch?: number;
  voice?: string;
}

const DEFAULT_VIETNAMESE_PITCH = 1.15;

function normalizeVoiceLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function voiceGenderScore(voice: Speech.Voice): number {
  const label = normalizeVoiceLabel(`${voice.name} ${voice.identifier}`);
  const maleHint = /(^|[\s._-])(male|masculine|nam|vim|minh|duc|phong|son|huy|tuan|quang|long|khang)(?=$|[\s._-])/;
  const femaleHint = /(^|[\s._-])(female|feminine|nu|vif|linh|mai|lan|hoa|huong|thao)(?=$|[\s._-])/;

  if (maleHint.test(label)) return 100;
  if (femaleHint.test(label)) return -100;
  return 0;
}

/** Pick a Vietnamese male voice when the device exposes enough voice metadata. */
export function selectPreferredVietnameseMaleVoice(voices: Speech.Voice[]): string | undefined {
  const vietnameseVoices = voices.filter((voice) =>
    voice.language.toLowerCase().replace('_', '-').startsWith('vi')
  );

  return vietnameseVoices
    .map((voice, index) => ({
      voice,
      index,
      score:
        voiceGenderScore(voice) +
        (voice.quality === Speech.VoiceQuality.Enhanced ? 10 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.voice.identifier;
}

/** Convert the formatted chat answer into readable Vietnamese prose. */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';

  return raw
    .replace(/\[([^\]]+)\]\((?:https?:\/\/)?[^)]+\)/gi, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/gm, '')
    .replace(/(?:\*\*|__|~~|`)/g, '')
    .replace(/✦/g, '')
    .replace(/(?:KẾT LUẬN(?: NHANH)?|VÌ SAO|NÊN LÀM GÌ)\s*:/gi, (heading) => `${heading.replace(/\s*:/, '')}.`)
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1 phần trăm')
    .replace(/[|]+/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([.!?]){2,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitLongSentence(sentence: string, maxLength: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxLength) {
      if (current) chunks.push(current);
      current = '';
      for (let offset = 0; offset < word.length; offset += maxLength) {
        chunks.push(word.slice(offset, offset + maxLength));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function splitSpeechText(text: string, maxLength = 3500): string[] {
  const safeLimit = Math.max(1, Math.floor(maxLength));
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]*|[.!?。！？]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length > safeLimit) {
      if (current) chunks.push(current);
      current = '';
      chunks.push(...splitLongSentence(sentence, safeLimit));
      continue;
    }

    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > safeLimit) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

class TTSService {
  private currentMessageId: string | null = null;
  private generation = 0;
  private resolveCurrentChunk: (() => void) | null = null;
  private currentOptions: TTSOptions | null = null;
  private preferredVietnameseVoice: Promise<string | undefined> | null = null;

  private getPreferredVietnameseVoice(): Promise<string | undefined> {
    if (!this.preferredVietnameseVoice) {
      this.preferredVietnameseVoice = Speech.getAvailableVoicesAsync()
        .then(selectPreferredVietnameseMaleVoice)
        .catch(() => undefined);
    }

    return this.preferredVietnameseVoice;
  }

  async speak(messageId: string, text: string, options: TTSOptions = {}): Promise<boolean> {
    if (this.currentMessageId === messageId) {
      await this.stop();
      return false;
    }

    await this.stop();
    const clean = cleanTextForSpeech(text);
    if (!clean) return false;

    const maxLength = Number.isFinite(Speech.maxSpeechInputLength)
      ? Math.max(1, Math.min(3500, Speech.maxSpeechInputLength))
      : 3500;
    const chunks = splitSpeechText(clean, maxLength);
    if (!chunks.length) return false;

    const token = ++this.generation;
    this.currentMessageId = messageId;
    this.currentOptions = options;

    const resolvedOptions: TTSOptions = {
      ...options,
      voice: options.voice ?? (await this.getPreferredVietnameseVoice()),
    };
    if (token !== this.generation) return false;

    this.currentOptions = resolvedOptions;
    void this.playChunks(token, chunks, resolvedOptions);
    return true;
  }

  private async playChunks(token: number, chunks: string[], options: TTSOptions): Promise<void> {
    try {
      for (const chunk of chunks) {
        if (token !== this.generation) return;
        await new Promise<void>((resolve) => {
          let settled = false;
          const finishChunk = () => {
            if (settled) return;
            settled = true;
            if (this.resolveCurrentChunk === finishChunk) this.resolveCurrentChunk = null;
            resolve();
          };
          this.resolveCurrentChunk = finishChunk;

          try {
            Speech.speak(chunk, {
              language: 'vi-VN',
              voice: options.voice,
              pitch: options.pitch ?? DEFAULT_VIETNAMESE_PITCH,
              rate: options.rate ?? 1.05,
              onStart: () => {
                if (token === this.generation) options.onStart?.();
              },
              onDone: finishChunk,
              onStopped: finishChunk,
              onError: (error) => {
                if (token === this.generation) {
                  this.generation += 1;
                  this.currentMessageId = null;
                  this.currentOptions = null;
                  options.onError?.(error);
                }
                finishChunk();
              },
            });
          } catch (error) {
            if (token === this.generation) {
              this.generation += 1;
              this.currentMessageId = null;
              this.currentOptions = null;
              options.onError?.(error instanceof Error ? error : new Error('Không thể phát giọng đọc.'));
            }
            finishChunk();
          }
        });
      }

      if (token === this.generation) {
        this.currentMessageId = null;
        this.currentOptions = null;
        options.onDone?.();
      }
    } finally {
      if (token === this.generation) this.resolveCurrentChunk = null;
    }
  }

  async stop(): Promise<void> {
    const wasActive = this.currentMessageId !== null;
    const stoppedOptions = this.currentOptions;
    const finishChunk = this.resolveCurrentChunk;
    this.generation += 1;
    this.currentMessageId = null;
    this.currentOptions = null;
    this.resolveCurrentChunk = null;

    try {
      if (wasActive) await Speech.stop();
    } catch {
      // Keep the service state cleared even if the native engine is unavailable.
    } finally {
      finishChunk?.();
      if (wasActive) stoppedOptions?.onStopped?.();
    }
  }

  getCurrentSpeakingId(): string | null {
    return this.currentMessageId;
  }
}

export const ttsService = new TTSService();
