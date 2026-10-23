import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
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

const CHAT_BACKGROUND = require('../../assets/giao_dien/giaodien1/chat_continue/background.png');

interface Props {
  sessionId: string;
  initialTitle?: string;
  onBack: () => void;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
});

function ChatMessageCard({ item, isSending }: { item: LocalChatMessage; isSending: boolean }) {
  const isUser = item.sender === 'user';
  const messageText = item.text || (isSending && !isUser ? 'Numelyra đang suy ngẫm…' : '');

  const content = (
    <>
      <Text style={styles.messageText}>{messageText}</Text>
      <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
    </>
  );

  return (
    <View style={styles.messageBlock}>
      <View style={styles.senderRow}>
        {isUser ? (
          <View style={[styles.avatar, styles.userAvatar]}>
            <Ionicons name="person" size={13} color="#F4F2FF" />
          </View>
        ) : (
          <LinearGradient colors={['#A936FF', '#6821D5']} style={[styles.avatar, styles.mascotAvatar]}>
            <Ionicons name="sparkles" size={13} color="#FFF7D6" />
          </LinearGradient>
        )}
        <Text style={styles.senderName}>{isUser ? 'Bạn' : 'Numelyra AI'}</Text>
        {item.turnIndex === 0 ? (
          <Text style={styles.rootBadge}>{isUser ? 'CÂU HỎI GỐC' : 'BÀI ĐỌC GỐC'}</Text>
        ) : null}
      </View>

      {isUser ? (
        <View style={[styles.bubble, styles.userBubble]}>{content}</View>
      ) : (
        <LinearGradient
          colors={['#5410AF', '#7D12C7', '#9416D1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.mascotBubble]}
        >
          {content}
        </LinearGradient>
      )}
    </View>
  );
}

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
    <ImageBackground source={CHAT_BACKGROUND} resizeMode="cover" style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundScrim} />
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton} accessibilityLabel="Quay lại bài luận giải">
            <Ionicons name="chevron-back" size={22} color="#F8F6FF" />
            <Text style={styles.backText}>Quay lại</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Numelyra AI</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{session?.title || initialTitle || 'Tiếp tục bài luận giải'}</Text>
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
            renderItem={({ item }) => <ChatMessageCard item={item} isSending={isSending} />}
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
              placeholder="Nhắn tin cho Numelyra…"
              placeholderTextColor="rgba(235, 232, 248, 0.42)"
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
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="arrow-up" size={21} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 3, 20, 0.38)' },
  header: { minHeight: 76, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(4,4,15,0.82)' },
  headerButton: { width: 86, height: 42, flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#DCD8EC', fontSize: 12, fontWeight: '600', marginLeft: 1 },
  headerCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
  subtitle: { color: '#8D88A5', fontSize: 10, marginTop: 3, maxWidth: 190 },
  quotaBadge: { width: 46, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D1930', borderWidth: 1, borderColor: 'rgba(171,91,255,0.34)' },
  quotaText: { color: '#C995FF', fontSize: 11, fontWeight: '900' },
  progressTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: 2, backgroundColor: '#8A22D4' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: '#A9A3BD', fontSize: 13 },
  messageList: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 24, gap: 18 },
  messageBlock: { width: '100%' },
  senderRow: { minHeight: 26, flexDirection: 'row', alignItems: 'center', marginBottom: 7, paddingHorizontal: 2 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  userAvatar: { backgroundColor: '#3A394C', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  mascotAvatar: { borderWidth: 1, borderColor: 'rgba(255,230,168,0.42)' },
  senderName: { color: '#F1EFF8', fontSize: 12, fontWeight: '800' },
  bubble: { width: '100%', borderRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 11 },
  userBubble: { backgroundColor: '#29283A', borderTopLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)' },
  mascotBubble: { borderTopLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(213,155,255,0.28)' },
  rootBadge: { marginLeft: 'auto', color: '#A49CB8', fontSize: 8, letterSpacing: 1.05, fontWeight: '900' },
  messageText: { color: '#FBFAFF', fontSize: 15, lineHeight: 23 },
  timeText: { color: 'rgba(241,237,250,0.42)', fontSize: 9, marginTop: 8, textAlign: 'right' },
  emptyText: { color: '#D8CBE8', textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  errorText: { color: '#F1B5B5', fontSize: 11, textAlign: 'center', paddingHorizontal: 18, paddingVertical: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(5,5,15,0.98)' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 13, color: '#FFFFFF', backgroundColor: '#222132', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C22CF', borderWidth: 1, borderColor: 'rgba(210,155,255,0.34)' },
  sendButtonDisabled: { opacity: 0.42 },
  completedBox: { paddingHorizontal: 18, paddingTop: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(163,76,231,0.25)', backgroundColor: 'rgba(5,5,15,0.98)' },
  completedTitle: { color: '#D2A4FF', fontSize: 15, fontWeight: '900' },
  completedText: { color: '#A9A3BD', fontSize: 12, marginTop: 5, marginBottom: 12 },
  newReadingButton: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 18, backgroundColor: '#7C22CF' },
  newReadingText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});

