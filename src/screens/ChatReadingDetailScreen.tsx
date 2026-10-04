import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawnCardResult } from '../services/tarotService';
import { getTarotCardImage } from '../services/tarotAssets';
import HighlightedAnswerText from '../components/chat/HighlightedAnswerText';
import type { MessageItem } from './ChatScreen';

export type ChatReadingDetailParams = {
  message: MessageItem;
  previousQuestion?: string;
};

type Props = NativeStackScreenProps<{ ChatReadingDetail: ChatReadingDetailParams }, 'ChatReadingDetail'>;

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
  const cards = useMemo(() => getDrawnCards(message.card), [message.card]);
  const question = typeof (message.card as { questionText?: unknown } | undefined)?.questionText === 'string'
    ? (message.card as { questionText: string }).questionText
    : previousQuestion;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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
});
