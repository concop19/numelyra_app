import React, { useEffect, useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { DrawnCardResult } from '../services/tarotService';
import { getTarotCardImage, TAROT_AMBIENT_AUDIO } from '../services/tarotAssets';
import HighlightedAnswerText from '../components/chat/HighlightedAnswerText';
import LoveCompatibilityDetail from '../components/chat/love/LoveCompatibilityDetail';
import { getLoveReadingViewModel } from '../components/chat/love/loveReadingModel';
import { canSetAudioPlayerVolume } from '../services/audioPlatform';
import type { MessageItem } from './ChatScreen';

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
  const { message, previousQuestion } = route.params;
  const ambientPlayer = useAudioPlayer(TAROT_AMBIENT_AUDIO, { keepAudioSessionActive: true });

  useEffect(() => {
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
          accessibilityLabel="Quay lại trò chuyện"
        >
          <Ionicons name="arrow-back" color="#FFF4D8" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>NUMELYRA</Text>
          <Text style={styles.title}>Luận giải chi tiết</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {question ? (
          <View style={styles.questionCard}>
            <Text style={styles.sectionLabel}>CÂU HỎI CỦA BẠN</Text>
            <Text style={styles.question}>{question}</Text>
          </View>
        ) : null}

        {cards.length > 0 ? (
          <View style={styles.cardsSection}>
            <Text style={styles.sectionLabel}>TAROT ĐÃ RÚT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {cards.map((drawnCard, index) => (
                <View key={`${message.id}-${drawnCard.card.id}-${index}`} style={styles.tarotCard}>
                  <Image
                    source={getTarotCardImage(drawnCard.card.id)}
                    style={[styles.tarotImage, drawnCard.isReversed && styles.tarotImageReversed]}
                    resizeMode="cover"
                  />
                  <Text numberOfLines={1} style={styles.tarotCaption}>
                    {drawnCard.position?.nameVi || drawnCard.card.nameVi}
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

        {continueReading ? (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={continueReading}
            accessibilityRole="button"
            accessibilityLabel="Tiếp tục trò chuyện về bài luận giải này"
            style={styles.continueButton}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF8E7" />
            <Text style={styles.continueButtonText}>Tiếp tục trò chuyện</Text>
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
  continueButton: {
    minHeight: 52, borderRadius: 26, paddingHorizontal: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#7440A5',
    borderWidth: 1, borderColor: 'rgba(255, 226, 160, 0.72)',
  },
  continueButtonText: { flex: 1, color: '#FFF8E7', fontSize: 15, fontWeight: '900', textAlign: 'center' },
});
