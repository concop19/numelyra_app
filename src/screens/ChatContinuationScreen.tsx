import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createChatId,
  finishLocalChatTurn,
  getLocalChatMessages,
  getLocalChatSession,
  initChatDatabase,
  savePendingUserMessage,
  type LocalChatMessage,
  type LocalChatSession,
} from '../db/chatDatabaseService';
import { streamContinuedChat } from '../services/chatStreamClient';
import {
  hydrateChatSessionFromSupabase,
  syncPendingChatSession,
} from '../services/chatSessionSyncService';

interface Props {
  sessionId: string;
  initialTitle?: string;
  onBack: () => void;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
});

export default function ChatContinuationScreen({ sessionId, initialTitle, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<LocalChatMessage>>(null);
  const [session, setSession] = useState<LocalChatSession | null>(null);
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
  }, []);

  const loadSession = useCallback(async () => {
    setError(null);
    try {
      await initChatDatabase();
      const [localSession, localMessages] = await Promise.all([
        getLocalChatSession(sessionId),
        getLocalChatMessages(sessionId),
      ]);
      if (localSession) setSession(localSession);
      if (localMessages.length > 0) setMessages(localMessages);

      const remote = await hydrateChatSessionFromSupabase(sessionId);
      if (remote) {
        setSession(remote.session);
        setMessages(remote.messages);
      } else if (!localSession) {
        setError('Không tìm thấy phiên trò chuyện hoặc bạn chưa đăng nhập đúng tài khoản.');
      }
    } catch (loadError) {
      console.warn('[ChatContinuationScreen] Could not load session:', loadError);
      setError('Không thể tải phiên trò chuyện. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setIsLoading(false);
      scrollToEnd();
    }
  }, [scrollToEnd, sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void syncPendingChatSession(sessionId);
    }
  }), [sessionId]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !session || isSending || session.status !== 'active') return;
    const requestedTurn = session.questionCount + 1;
    if (requestedTurn > session.maxQuestions) return;

    const now = new Date().toISOString();
    const userMessageId = createChatId();
    const assistantMessageId = createChatId();
    const userMessage: LocalChatMessage = {
      id: userMessageId,
      sessionId,
      turnIndex: requestedTurn,
      sender: 'user',
      text,
      cardPayload: null,
      syncStatus: 'pending',
      createdAt: now,
      syncedAt: null,
    };
    const assistantPlaceholder: LocalChatMessage = {
      id: assistantMessageId,
      sessionId,
      turnIndex: requestedTurn,
      sender: 'mascot',
      text: '',
      cardPayload: { type: 'follow_up', streaming: true },
      syncStatus: 'pending',
      createdAt: new Date(Date.now() + 1).toISOString(),
      syncedAt: null,
    };

    setInput('');
    setError(null);
    setIsSending(true);
    setMessages((current) => [...current, userMessage, assistantPlaceholder]);
    scrollToEnd();

    try {
      await savePendingUserMessage(userMessage);
      const result = await streamContinuedChat({
        sessionId,
        message: text,
        turnIndex: requestedTurn,
        userMessageId,
        assistantMessageId,
        timeZone: (() => {
          try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
          catch { return undefined; }
        })(),
      }, (fullText) => {
        setMessages((current) => current.map((message) => (
          message.id === assistantMessageId ? { ...message, text: fullText } : message
        )));
        scrollToEnd();
      });

      const answer = result.text.trim() || 'Tiểu Linh Miêu chưa nhận được nội dung trả lời.';
      const acceptedCount = result.done.accepted ? result.done.turnIndex : session.questionCount;
      const assistantMessage: LocalChatMessage = {
        ...assistantPlaceholder,
        text: answer,
        cardPayload: {
          type: 'follow_up',
          turnIndex: result.done.turnIndex,
          remaining: result.done.remaining,
          sessionCompleted: result.done.sessionCompleted,
        },
      };
      setMessages((current) => current.map((message) => (
        message.id === assistantMessageId ? assistantMessage : message
      )));
      const updatedSession = await finishLocalChatTurn(
        session,
        assistantMessage,
        acceptedCount,
        result.done.sessionCompleted
      );
      setSession(updatedSession);
      await syncPendingChatSession(sessionId);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Không thể gửi câu hỏi.';
      const failedAssistant: LocalChatMessage = {
        ...assistantPlaceholder,
        text: `⚠️ ${message}`,
        cardPayload: { type: 'follow_up', interrupted: true },
      };
      setMessages((current) => current.map((item) => (
        item.id === assistantMessageId ? failedAssistant : item
      )));
      await finishLocalChatTurn(session, failedAssistant, session.questionCount, false).catch(() => undefined);
      setError('Luồng trả lời bị gián đoạn. Nội dung cục bộ đã được giữ lại.');
      const remote = await hydrateChatSessionFromSupabase(sessionId).catch(() => null);
      if (remote) {
        setSession(remote.session);
        setMessages(remote.messages);
      }
    } finally {
      setIsSending(false);
      scrollToEnd();
    }
  }, [input, isSending, scrollToEnd, session, sessionId]);

  const isCompleted = session?.status === 'completed' || Boolean(
    session && session.questionCount >= session.maxQuestions
  );

  return (
    <LinearGradient colors={['#100A22', '#1B1034', '#080711']} style={styles.screen}>
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton} accessibilityLabel="Quay lại bài luận giải">
            <Ionicons name="chevron-back" size={25} color="#F6D486" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.title}>{session?.title || initialTitle || 'Tiếp tục chiêm nghiệm'}</Text>
            <Text style={styles.subtitle}>Trò chuyện trong bối cảnh bài đọc trước</Text>
          </View>
          <View style={styles.quotaBadge}>
            <Text style={styles.quotaText}>{session?.questionCount ?? 0}/{session?.maxQuestions ?? 10}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${Math.min(100, ((session?.questionCount ?? 0) / (session?.maxQuestions ?? 10)) * 100)}%` },
          ]} />
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#F6C768" size="large" />
            <Text style={styles.centerText}>Đang mở lại bối cảnh bài đọc…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={[
                styles.messageRow,
                item.sender === 'user' ? styles.userRow : styles.mascotRow,
              ]}>
                <View style={[
                  styles.bubble,
                  item.sender === 'user' ? styles.userBubble : styles.mascotBubble,
                ]}>
                  {item.turnIndex === 0 && (
                    <Text style={styles.rootBadge}>{item.sender === 'user' ? 'CÂU HỎI GỐC' : 'BÀI ĐỌC GỐC'}</Text>
                  )}
                  <Text style={styles.messageText}>
                    {item.text || (isSending && item.sender === 'mascot' ? 'Tiểu Linh Miêu đang suy ngẫm…' : '')}
                  </Text>
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={error ? <Text style={styles.emptyText}>{error}</Text> : null}
          />
        )}

        {error && messages.length > 0 ? <Text style={styles.errorText}>{error}</Text> : null}

        {isCompleted ? (
          <View style={[styles.completedBox, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Text style={styles.completedTitle}>Phiên chiêm nghiệm đã hoàn thành</Text>
            <Text style={styles.completedText}>Bạn đã đi hết 10 câu hỏi tiếp nối của bài đọc này.</Text>
            <TouchableOpacity onPress={onBack} style={styles.newReadingButton}>
              <Text style={styles.newReadingText}>Bắt đầu bài đọc mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              editable={!isSending && Boolean(session)}
              placeholder="Hỏi sâu hơn về bài đọc này…"
              placeholderTextColor="rgba(226, 216, 243, 0.48)"
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={() => void sendMessage()}
              disabled={!input.trim() || isSending || !session}
              style={[styles.sendButton, (!input.trim() || isSending || !session) && styles.sendButtonDisabled]}
            >
              {isSending
                ? <ActivityIndicator size="small" color="#271A39" />
                : <Ionicons name="arrow-up" size={21} color="#271A39" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(205,166,255,0.14)' },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(90,58,140,0.35)' },
  headerCopy: { flex: 1, paddingHorizontal: 12 },
  title: { color: '#FFF8E7', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#B8A7D0', fontSize: 11, marginTop: 3 },
  quotaBadge: { minWidth: 48, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(246,199,104,0.14)', borderWidth: 1, borderColor: 'rgba(246,199,104,0.42)' },
  quotaText: { color: '#F6D486', fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)' },
  progressFill: { height: 3, backgroundColor: '#D79AF7' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: '#C8B8DD', fontSize: 13 },
  messageList: { paddingHorizontal: 14, paddingVertical: 18, gap: 10 },
  messageRow: { width: '100%', flexDirection: 'row' },
  userRow: { justifyContent: 'flex-end' },
  mascotRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  userBubble: { backgroundColor: '#6D3DA0', borderBottomRightRadius: 5 },
  mascotBubble: { backgroundColor: 'rgba(39,27,65,0.96)', borderWidth: 1, borderColor: 'rgba(190,144,241,0.22)', borderBottomLeftRadius: 5 },
  rootBadge: { color: '#F6C768', fontSize: 9, letterSpacing: 1.2, fontWeight: '900', marginBottom: 6 },
  messageText: { color: '#FBF8FF', fontSize: 14, lineHeight: 21 },
  timeText: { color: 'rgba(229,220,242,0.48)', fontSize: 9, marginTop: 6, textAlign: 'right' },
  emptyText: { color: '#D8CBE8', textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  errorText: { color: '#F1B5B5', fontSize: 11, textAlign: 'center', paddingHorizontal: 18, paddingVertical: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(205,166,255,0.14)', backgroundColor: 'rgba(9,7,17,0.94)' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 24, paddingHorizontal: 17, paddingVertical: 13, color: '#FFF', backgroundColor: 'rgba(65,43,101,0.72)', borderWidth: 1, borderColor: 'rgba(190,144,241,0.28)', fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6C768' },
  sendButtonDisabled: { opacity: 0.42 },
  completedBox: { paddingHorizontal: 18, paddingTop: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(246,199,104,0.22)', backgroundColor: 'rgba(20,12,38,0.98)' },
  completedTitle: { color: '#F6D486', fontSize: 15, fontWeight: '900' },
  completedText: { color: '#CBBBDD', fontSize: 12, marginTop: 5, marginBottom: 12 },
  newReadingButton: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 20, backgroundColor: '#7B49A8' },
  newReadingText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});

