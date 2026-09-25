/**
 * voiceService.ts - Dịch vụ nhận diện giọng nói chuyển thành văn bản (Speech-to-Text)
 * Hỗ trợ Web Speech API (vi-VN) cho trình duyệt và Expo Web/Webview,
 * có cơ chế tự động xử lý kết quả thời gian thực và quản lý trạng thái nghe.
 */
import { Platform } from 'react-native';

export interface VoiceListenOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
}

let activeRecognition: any = null;

export function isVoiceSupported(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }
  return false;
}

export function startVoiceListening(options: VoiceListenOptions): (() => void) {
  const { onTranscript, onError, onEnd, lang = 'vi-VN' } = options;

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    onError?.('Tính năng nhận diện giọng nói hiện hỗ trợ tốt nhất trên nền tảng Web / trình duyệt.');
    onEnd?.();
    return () => {};
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Bạn có thể sử dụng Chrome/Safari/Edge hoặc gõ phím.');
    onEnd?.();
    return () => {};
  }

  // Dừng phiên trước đó nếu đang chạy
  stopVoiceListening();

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      // Đã bắt đầu lắng nghe
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      const resultText = (finalTranscript || interimTranscript).trim();
      if (resultText) {
        onTranscript(resultText, Boolean(finalTranscript));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[voiceService] Error:', event.error);
      if (event.error === 'not-allowed') {
        onError?.('Quyền sử dụng Micro đã bị từ chối. Vui lòng cấp quyền Micro trong cài đặt trình duyệt.');
      } else if (event.error !== 'no-speech') {
        onError?.(`Lỗi giọng nói: ${event.error || 'Không thể nhận diện'}`);
      }
    };

    recognition.onend = () => {
      activeRecognition = null;
      onEnd?.();
    };

    recognition.start();
    activeRecognition = recognition;

    return () => {
      stopVoiceListening();
    };
  } catch (err: any) {
    console.error('[voiceService] Failed to start:', err);
    onError?.(err?.message || 'Không thể kích hoạt micro.');
    onEnd?.();
    return () => {};
  }
}

export function stopVoiceListening(): void {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // Bỏ qua lỗi nếu đã dừng
    }
    activeRecognition = null;
  }
}
