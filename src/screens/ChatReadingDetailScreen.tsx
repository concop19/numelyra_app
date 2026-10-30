import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  type DrawnCardResult,
  getTarotCardName,
  getTarotPositionName,
} from '../services/tarotService';
import { getTarotCardImage, TAROT_AMBIENT_AUDIO } from '../services/tarotAssets';
import HighlightedAnswerText from '../components/chat/HighlightedAnswerText';
import LoveCompatibilityDetail from '../components/chat/love/LoveCompatibilityDetail';
import { getLoveReadingViewModel } from '../components/chat/love/loveReadingModel';
import { canAutoPlayAmbientAudio, canSetAudioPlayerVolume } from '../services/audioPlatform';
import {
  getLocalChatMessages,
  initChatDatabase,
  type LocalChatMessage,
  type LocalChatSession,
} from '../db/chatDatabaseService';
import { hydrateChatSessionFromSupabase } from '../services/chatSessionSyncService';
import type { MessageItem } from './ChatScreen';
import { useLocalization } from '../i18n/LocalizationContext';

export type ChatReadingDetailParams = {
  message: MessageItem;
  previousQuestion?: string;
};

type ChatReadingDetailStackParamList = {
  Main: undefined;
  ChatReadingDetail: ChatReadingDetailParams;
  ChatContinuation: { sessionId: string; title?: string };
};

type Props = NativeStackScreenProps<ChatReadingDetailStackParamList, 'ChatReadingDetail'>;

const withoutQuickConclusionHeading = (text: string) => text
  .replace(/^\s*[✦★✨•-]*\s*KẾT\s+LUẬN\s+NHANH\s*:\s*/i, '')
  .trim();

const getDrawnCards = (card: unknown): DrawnCardResult[] => {
  if (!card || typeof card !== 'object') return [];
  const payload = card as { drawnCards?: unknown; cards?: unknown };
  const candidates = Array.isArray(payload.drawnCards)
    ? payload.drawnCards
    : Array.isArray(payload.cards)
      ? payload.cards
      : [];

  return candidates.filter((item): item is DrawnCardResult => (
    !!item && typeof item === 'object' && 'card' in item
  ));
};

export default function ChatReadingDetailScreen({ navigation, route }: Props) {
  const { t, l } = useLocalization();
  const { message, previousQuestion } = route.params;
  const ambientPlayer = useAudioPlayer(TAROT_AMBIENT_AUDIO, { keepAudioSessionActive: true });
  const conversationLoadedRef = useRef(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [conversationSession, setConversationSession] = useState<LocalChatSession | null>(null);
  const [conversationMessages, setConversationMessages] = useState<LocalChatMessage[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!canAutoPlayAmbientAudio()) return;

    try {
      void setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      }).catch(() => undefined);
      ambientPlayer.loop = true;
      if (canSetAudioPlayerVolume()) ambientPlayer.volume = 0.09;
      void ambientPlayer.seekTo(0).catch(() => undefined);
      ambientPlayer.play();
    } catch {}

    return () => {
      try {
        ambientPlayer.pause();
      } catch {}
    };
  }, [ambientPlayer]);

  const cards = useMemo(() => getDrawnCards(message.card), [message.card]);
  const loveReading = useMemo(
    () => getLoveReadingViewModel(message.card, message.text, previousQuestion),
    [message.card, message.text, previousQuestion],
  );
  const question = typeof (message.card as { questionText?: unknown } | undefined)?.questionText === 'string'
    ? (message.card as { questionText: string }).questionText
    : previousQuestion;
  const sessionId = typeof (message.card as { sessionId?: unknown } | undefined)?.sessionId === 'string'
    ? (message.card as { sessionId: string }).sessionId
    : undefined;
  const canContinue = Boolean(sessionId && (message.card as { canContinue?: unknown } | undefined)?.canContinue);
  const continueReading = canContinue && sessionId
    ? () => navigation.navigate('ChatContinuation', { sessionId, title: question })
    : undefined;

  const loadConversation = useCallback(async () => {
    if (!sessionId || conversationLoadedRef.current) return;
    conversationLoadedRef.current = true;
    setConversationLoading(true);
    setConversationError(null);
    try {
      await initChatDatabase();
      const localMessages = await getLocalChatMessages(sessionId);
      if (localMessages.length > 0) setConversationMessages(localMessages);

      const remote = await hydrateChatSessionFromSupabase(sessionId);
      if (remote) {
        setConversationSession(remote.session);
        setConversationMessages(remote.messages);
      } else if (localMessages.length === 0) {
        setConversationError(l('Chưa tải được lịch sử của phiên trò chuyện này.', 'This conversation history could not be loaded.'));
      }
    } catch (error) {
      console.warn('[ChatReadingDetailScreen] Could not load conversation:', error);
      setConversationError(l('Không thể tải toàn bộ cuộc trò chuyện lúc này.', 'The full conversation is unavailable right now.'));
      conversationLoadedRef.current = false;
    } finally {
      setConversationLoading(false);
    }
  }, [l, sessionId]);

  const toggleConversation = useCallback(() => {
    setConversationOpen((open) => {
      const next = !open;
      if (next) void loadConversation();
      return next;
    });
  }, [loadConversation]);

  const toggleMessage = useCallback((messageId: string) => {
    setExpandedMessages((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);
  const close = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  if (loveReading) {
    return (
      <LoveCompatibilityDetail
        model={loveReading}
        onClose={close}
        onContinue={continueReading}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={close}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" color="#FFF4D8" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>NUMELYRA</Text>
          <Text style={styles.title}>{l('Luận giải chi tiết', 'Detailed reading')}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {question ? (
          <View style={styles.questionCard}>
            <Text style={styles.sectionLabel}>{l('CÂU HỎI CỦA BẠN', 'YOUR QUESTION')}</Text>
            <Text style={styles.question}>{question}</Text>
          </View>
        ) : null}

        {cards.length > 0 ? (
          <View style={styles.cardsSection}>
            <Text style={styles.sectionLabel}>{l('TAROT ĐÃ RÚT', 'DRAWN TAROT CARDS')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {cards.map((drawnCard, index) => (
                <View key={`${message.id}-${drawnCard.card.id}-${index}`} style={styles.tarotCard}>
                  <Image
                    source={getTarotCardImage(drawnCard.card.id)}
                    style={[styles.tarotImage, drawnCard.isReversed && styles.tarotImageReversed]}
                    resizeMode="cover"
                  />
                  <Text numberOfLines={1} style={styles.tarotCaption}>
                    {drawnCard.position
                      ? getTarotPositionName(drawnCard.position, drawnCard.localeAtCreation ?? 'vi')
                      : getTarotCardName(drawnCard.card, drawnCard.localeAtCreation ?? 'vi')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.answerCard}>
          <View style={styles.answerHeader}>
            <View style={styles.senderDot} />
            <Text style={styles.senderName}>Numelyra</Text>
          </View>
          <HighlightedAnswerText
            text={withoutQuickConclusionHeading(message.text)}
            style={styles.answerText}
            emphasisStyle={styles.answerEmphasis}
          />
        </View>

        {sessionId ? (
          <View style={styles.conversationSection}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={toggleConversation}
              accessibilityRole="button"
              accessibilityState={{ expanded: conversationOpen }}
              accessibilityLabel={l('Xem toàn bộ cuộc trò chuyện', 'View the full conversation')}
              style={styles.conversationToggle}
            >
              <View style={styles.conversationIcon}>
                <Ionicons name="chatbubbles-outline" size={20} color="#F7D183" />
              </View>
              <View style={styles.conversationToggleCopy}>
                <Text style={styles.conversationToggleTitle}>
                  {conversationOpen
                    ? l('Thu gọn cuộc trò chuyện', 'Collapse conversation')
                    : l('Xem toàn bộ cuộc trò chuyện', 'View full conversation')}
                </Text>
                <Text style={styles.conversationToggleSubtitle}>
                  {conversationSession
                    ? l(`${conversationSession.questionCount}/${conversationSession.maxQuestions} câu tiếp nối`, `${conversationSession.questionCount}/${conversationSession.maxQuestions} follow-up questions`)
                    : l('Bài đọc gốc và các câu hỏi tiếp nối', 'Original reading and follow-up questions')}
                </Text>
              </View>
              <Ionicons name={conversationOpen ? 'chevron-up' : 'chevron-down'} size={21} color="#E8DDF5" />
            </TouchableOpacity>

            {conversationOpen ? (
              <View style={styles.conversationPanel}>
                {conversationLoading ? (
                  <View style={styles.conversationLoading}>
                    <ActivityIndicator size="small" color="#D69BFF" />
                    <Text style={styles.conversationLoadingText}>{l('Đang tải cuộc trò chuyện…', 'Loading conversation…')}</Text>
                  </View>
                ) : null}

                {!conversationLoading && conversationError ? (
                  <Text style={styles.conversationError}>{conversationError}</Text>
                ) : null}

                {conversationMessages.map((chatMessage) => {
                  const expanded = expandedMessages.has(chatMessage.id);
                  const canExpand = chatMessage.text.length > 180;
                  const isUser = chatMessage.sender === 'user';
                  return (
                    <TouchableOpacity
                      key={chatMessage.id}
                      activeOpacity={canExpand ? 0.8 : 1}
                      onPress={canExpand ? () => toggleMessage(chatMessage.id) : undefined}
                      accessibilityRole={canExpand ? 'button' : undefined}
                      accessibilityState={canExpand ? { expanded } : undefined}
                      style={[styles.historyMessage, isUser ? styles.historyUserMessage : styles.historyMascotMessage]}
                    >
                      <View style={styles.historyMessageHeader}>
                        <Text style={[styles.historySender, isUser && styles.historyUserSender]}>
                          {chatMessage.turnIndex === 0
                            ? (isUser ? l('Câu hỏi gốc', 'Original question') : l('Numelyra · Bài đọc gốc', 'Numelyra · Original reading'))
                            : (isUser ? l(`Bạn · Câu ${chatMessage.turnIndex}`, `You · Question ${chatMessage.turnIndex}`) : l(`Numelyra · Lượt ${chatMessage.turnIndex}`, `Numelyra · Turn ${chatMessage.turnIndex}`))}
                        </Text>
                        {canExpand ? (
                          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#CDBDE0" />
                        ) : null}
                      </View>
                      <Text numberOfLines={expanded ? undefined : 3} style={styles.historyMessageText}>
                        {chatMessage.text}
                      </Text>
                      {canExpand ? (
                              <Text style={styles.historyExpandText}>{expanded ? l('Thu gọn', 'Collapse') : l('Xem đầy đủ', 'View full message')}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                {!conversationLoading && !conversationError && conversationMessages.length === 0 ? (
                    <Text style={styles.conversationEmpty}>{l('Phiên này chưa có tin nhắn tiếp nối.', 'This session has no follow-up messages yet.')}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {continueReading ? (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={continueReading}
            accessibilityRole="button"
            accessibilityLabel={l('Tiếp tục trò chuyện về bài luận giải này', 'Continue chatting about this reading')}
            style={styles.continueButton}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF8E7" />
            <Text style={styles.continueButtonText}>{l('Tiếp tục trò chuyện', 'Continue conversation')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF8E7" />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#120A2A' },
  header: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(235, 207, 255, 0.12)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerSpacer: { width: 40 },
  eyebrow: { color: '#F7BF77', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textAlign: 'center' },
  title: { color: '#FFF8EA', fontSize: 17, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 36, gap: 16 },
  questionCard: { backgroundColor: '#26163E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(215, 175, 255, 0.18)' },
  sectionLabel: { color: '#F5C879', fontSize: 11, fontWeight: '800', letterSpacing: 1.05, marginBottom: 8 },
  question: { color: '#F8F2FC', fontSize: 16, lineHeight: 23, fontStyle: 'italic' },
  cardsSection: { gap: 8 },
  cardsRow: { gap: 12, paddingRight: 16 },
  tarotCard: { width: 112, borderRadius: 12, overflow: 'hidden', backgroundColor: '#28163F', borderWidth: 1, borderColor: 'rgba(250, 209, 126, 0.6)' },
  tarotImage: { width: 110, height: 168 },
  tarotImageReversed: { transform: [{ rotate: '180deg' }] },
  tarotCaption: { color: '#FFF0C9', fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 8, textAlign: 'center' },
  answerCard: { backgroundColor: '#F6DEC4', borderRadius: 28, padding: 18 },
  answerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  senderDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF6782', marginRight: 7 },
  senderName: { color: '#D64F6A', fontSize: 15, fontWeight: '800' },
  answerText: { color: '#301934', fontSize: 16, lineHeight: 25 },
  answerEmphasis: { color: '#7C305A', fontWeight: '900' },
  conversationSection: { gap: 10 },
  conversationToggle: {
    minHeight: 66, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#25143C', borderWidth: 1, borderColor: 'rgba(214, 155, 255, 0.3)',
  },
  conversationIcon: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(126, 65, 170, 0.34)', marginRight: 11,
  },
  conversationToggleCopy: { flex: 1, paddingRight: 8 },
  conversationToggleTitle: { color: '#FFF8EA', fontSize: 14, fontWeight: '900' },
  conversationToggleSubtitle: { color: '#AA9BBC', fontSize: 10.5, marginTop: 4 },
  conversationPanel: {
    gap: 10, borderRadius: 20, padding: 11, backgroundColor: 'rgba(25, 13, 45, 0.84)',
    borderWidth: 1, borderColor: 'rgba(214, 155, 255, 0.18)',
  },
  conversationLoading: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  conversationLoadingText: { color: '#CBBBDD', fontSize: 12 },
  conversationError: { color: '#F1B5B5', fontSize: 12, lineHeight: 18, textAlign: 'center', paddingVertical: 12 },
  conversationEmpty: { color: '#B8AAC8', fontSize: 12, textAlign: 'center', paddingVertical: 14 },
  historyMessage: { borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1 },
  historyUserMessage: { backgroundColor: '#30223F', borderColor: 'rgba(255,255,255,0.08)' },
  historyMascotMessage: { backgroundColor: '#59298A', borderColor: 'rgba(224, 176, 255, 0.28)' },
  historyMessageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  historySender: { flex: 1, color: '#F5D48D', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },
  historyUserSender: { color: '#D8CDDF' },
  historyMessageText: { color: '#FBF8FF', fontSize: 13, lineHeight: 20 },
  historyExpandText: { color: '#E2BAFF', fontSize: 10.5, fontWeight: '800', marginTop: 7 },
  continueButton: {
    minHeight: 52, borderRadius: 26, paddingHorizontal: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#7440A5',
    borderWidth: 1, borderColor: 'rgba(255, 226, 160, 0.72)',
  },
  continueButtonText: { flex: 1, color: '#FFF8E7', fontSize: 15, fontWeight: '900', textAlign: 'center' },
});
