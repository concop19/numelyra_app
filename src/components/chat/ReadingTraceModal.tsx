import React, { useMemo } from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NUMEROLOGY_CARDS, type NumerologyCardMeta } from '../../config/numerologyCards';
import { DrawnCardResult, TAROT_SPREADS } from '../../services/tarotService';
import { getTarotCardImage } from '../../services/tarotAssets';
import { IndicatorInfo } from '../../services/numerology24Service';
import { CalculatedIndicator } from '../../services/numerologyEngine';
import HighlightedAnswerText from './HighlightedAnswerText';

const TRACE_BACKGROUND = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/readingTrace/reading_trace_background.png');
const TRACE_LETTER = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/readingTrace/reading_trace_letter.png');

interface ReadingTraceMessage {
  id: string;
  text: string;
  card?: any;
}

interface Props {
  visible: boolean;
  message: ReadingTraceMessage | null;
  previousQuestion?: string;
  onClose: () => void;
  onOpenTarotCard: (card: DrawnCardResult) => void;
  onOpenIndicator: (indicator: CalculatedIndicator) => void;
}

interface IndicatorRow {
  meta: NumerologyCardMeta;
  profile1?: IndicatorInfo;
  profile2?: IndicatorInfo;
}

export default function ReadingTraceModal({
  visible,
  message,
  previousQuestion,
  onClose,
  onOpenTarotCard,
  onOpenIndicator,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const letterMinHeight = Math.max(330, (windowWidth - 32) * 1.2);
  const letterHorizontalPadding = Math.max(20, windowWidth * 0.08);
  const letterVerticalPadding = Math.max(42, windowWidth * 0.14);
  const card = message?.card || {};
  const decision = card.decision || {};
  const indicators1: IndicatorInfo[] = Array.isArray(card.indicators1) ? card.indicators1 : [];
  const indicators2: IndicatorInfo[] = Array.isArray(card.indicators2) ? card.indicators2 : [];
  const drawnCards: DrawnCardResult[] = Array.isArray(card.drawnCards) ? card.drawnCards : [];
  const profiles: Array<{ fullName?: string }> = Array.isArray(card.profiles) ? card.profiles : [];
  const question = typeof card.questionText === 'string' && card.questionText.trim()
    ? card.questionText
    : previousQuestion;

  const indicatorRows = useMemo(() => {
    const sourceKeys = [...indicators1, ...indicators2].map((indicator) => indicator.key);
    const keys = Array.from(new Set(sourceKeys)).slice(0, 5);
    return keys.flatMap((key) => {
      const meta = NUMEROLOGY_CARDS.find((item) => item.key === key);
      if (!meta) return [];
      return [{
        meta,
        profile1: indicators1.find((item) => item.key === key),
        profile2: indicators2.find((item) => item.key === key),
      }];
    });
  }, [indicators1, indicators2]);

  const makeCalculatedIndicator = (meta: NumerologyCardMeta, info: IndicatorInfo): CalculatedIndicator => ({
    ...meta,
    value: info.value,
    displayValue: String(info.value),
    isMaster: [11, 22, 33].includes(Number(info.value)),
  });

  const spreadId = typeof decision.spreadId === 'string' ? decision.spreadId : '';
  const spreadName = TAROT_SPREADS[spreadId]?.nameVi || (drawnCards.length ? 'Trải bài Tarot' : 'Không dùng Tarot');
  const intentName = typeof decision.intent === 'string'
    ? decision.intent.replace(/_/g, ' ')
    : 'Luận giải tổng hợp';
  const tuViBazi = card.tuViBazi || card.baziResult;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <ImageBackground source={TRACE_BACKGROUND} resizeMode="cover" style={StyleSheet.absoluteFill}>
          <View style={styles.backgroundShade} />
        </ImageBackground>

        <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Quay lại cuộc trò chuyện"
            >
              <Ionicons name="arrow-back" size={23} color="#FFF8E9" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>AI đã đối chiếu</Text>
              <Text style={styles.headerSubtitle}>Căn cứ của lời luận giải</Text>
            </View>
            <View style={styles.headerButtonSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {indicatorRows.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeadingRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Thần số học</Text>
                    <Text style={styles.sectionHint}>Các chỉ số đã được chọn cho câu hỏi này</Text>
                  </View>
                  <Ionicons name="sparkles" size={20} color="#F8CB7B" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicatorList}>
                  {indicatorRows.map(({ meta, profile1, profile2 }) => {
                    const selectedIndicator = profile1 || profile2;
                    if (!selectedIndicator) return null;
                    return (
                      <TouchableOpacity
                        key={meta.key}
                        style={styles.indicatorCard}
                        activeOpacity={0.82}
                        onPress={() => onOpenIndicator(makeCalculatedIndicator(meta, selectedIndicator))}
                        accessibilityRole="button"
                        accessibilityLabel={`${meta.nameVi}, giá trị ${profile1?.value ?? profile2?.value}`}
                      >
                        <Image source={meta.image} style={styles.indicatorImage} resizeMode="cover" />
                        <View style={styles.indicatorInfo}>
                          <Text style={styles.indicatorName} numberOfLines={2}>{meta.nameVi}</Text>
                          {!!profile1 && (
                            <Text style={styles.indicatorValue} numberOfLines={1}>
                              {profile2 ? `P1 · ${profile1.value}` : profile1.value}
                            </Text>
                          )}
                          {!!profile2 && (
                            <Text style={styles.indicatorValueSecondary} numberOfLines={1}>
                              P2 · {profile2.value}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.questionCard}>
              <Text style={styles.sectionEyebrow}>CÂU HỎI & CÁCH CHỌN TRẢI BÀI</Text>
              <Text style={styles.questionText}>{question || 'Không còn lưu câu hỏi gốc cho câu trả lời này.'}</Text>
              <View style={styles.decisionMetaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="git-branch-outline" size={13} color="#FFE3A3" />
                  <Text style={styles.metaPillText}>{intentName}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons name="layers-outline" size={13} color="#FFE3A3" />
                  <Text style={styles.metaPillText}>{spreadName}</Text>
                </View>
              </View>
              {!!decision.thoughtProcess && (
                <Text style={styles.decisionReason}>{decision.thoughtProcess}</Text>
              )}
              {profiles.length > 0 && (
                <Text style={styles.profileNames}>
                  Hồ sơ: {profiles.map((item) => item.fullName).filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>

            {!!tuViBazi?.summaryVi && (
              <View style={styles.baziCard}>
                <Text style={styles.sectionEyebrow}>TỬ VI & BÁT TỰ</Text>
                <Text style={styles.baziText}>{tuViBazi.summaryVi}</Text>
                {!!tuViBazi.adviceVi && <Text style={styles.baziAdvice}>{tuViBazi.adviceVi}</Text>}
              </View>
            )}

            {drawnCards.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeadingRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Các lá Tarot đã rút</Text>
                    <Text style={styles.sectionHint}>{spreadName} · Chạm lá để xem ý nghĩa</Text>
                  </View>
                  <Ionicons name="moon-outline" size={20} color="#F8CB7B" />
                </View>
                <View style={styles.tarotGrid}>
                  {drawnCards.map((item, index) => (
                    <TouchableOpacity
                      key={`${message?.id || 'trace'}-tarot-${index}`}
                      style={[styles.tarotCard, { width: (windowWidth - 72) / 2 }]}
                      activeOpacity={0.82}
                      onPress={() => onOpenTarotCard(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.position?.nameVi || `Vị trí ${index + 1}`}: ${item.card.nameVi}, ${item.isReversed ? 'lá ngược' : 'lá xuôi'}`}
                    >
                      <Text style={styles.tarotPosition} numberOfLines={2}>
                        {index + 1}. {item.position?.nameVi || `Vị trí ${index + 1}`}
                      </Text>
                      <Image
                        source={getTarotCardImage(item.card.id)}
                        style={[styles.tarotImage, item.isReversed && styles.tarotImageReversed]}
                        resizeMode="cover"
                      />
                      <View style={styles.tarotCardFooter}>
                        <Text style={styles.tarotName} numberOfLines={1}>{item.card.nameVi.split('(')[0].trim()}</Text>
                        <Text style={[styles.tarotOrientation, item.isReversed && styles.tarotOrientationReversed]}>
                          {item.isReversed ? 'LÁ NGƯỢC ↷' : 'LÁ XUÔI ↾'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {!!message?.text && (
              <ImageBackground
                source={TRACE_LETTER}
                resizeMode="stretch"
                style={[styles.letter, {
                  minHeight: letterMinHeight,
                  paddingHorizontal: letterHorizontalPadding,
                  paddingVertical: letterVerticalPadding,
                }]}
                imageStyle={styles.letterImage}
              >
                <Text style={styles.letterEyebrow}>LUẬN GIẢI HIỆN TẠI</Text>
                <Text style={styles.letterTitle}>Điểm giao nhau</Text>
                <View style={styles.letterRule} />
                <HighlightedAnswerText
                  text={message.text}
                  style={styles.letterBody}
                  emphasisStyle={styles.letterEmphasis}
                />
              </ImageBackground>
            )}

            <View style={styles.bottomSpace} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1B1230' },
  safeContent: { flex: 1 },
  backgroundShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(24, 13, 39, 0.13)' },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 16, 49, 0.42)',
  },
  headerButton: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(29, 17, 54, 0.72)', borderWidth: 1, borderColor: 'rgba(244, 207, 255, 0.36)',
  },
  headerButtonSpacer: { width: 46 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF8EE', fontSize: 21, fontWeight: '800', textAlign: 'center' },
  headerSubtitle: { color: '#E8D7F4', fontSize: 11, marginTop: 2, letterSpacing: 0.4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10 },
  questionCard: {
    padding: 15, borderRadius: 18, backgroundColor: 'rgba(32, 22, 57, 0.89)',
    borderWidth: 1, borderColor: 'rgba(245, 204, 123, 0.4)', marginBottom: 16,
  },
  sectionEyebrow: { color: '#F6C977', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  questionText: { color: '#FFF7E8', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  decisionMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6,
    backgroundColor: 'rgba(130, 97, 176, 0.4)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(222, 196, 247, 0.24)',
  },
  metaPillText: { color: '#F5EAFB', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  decisionReason: { color: '#E8D9F1', fontSize: 12, lineHeight: 18, marginTop: 11 },
  profileNames: { color: '#D8C5E8', fontSize: 10, fontWeight: '700', marginTop: 8 },
  section: {
    marginBottom: 17, paddingVertical: 13, borderRadius: 18,
    backgroundColor: 'rgba(28, 19, 52, 0.88)', borderWidth: 1, borderColor: 'rgba(242, 202, 119, 0.28)',
  },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 11 },
  sectionTitle: { color: '#FFF4DD', fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#D9C7E7', fontSize: 11, marginTop: 3 },
  indicatorList: { paddingHorizontal: 12, gap: 10 },
  indicatorCard: {
    width: 126, overflow: 'hidden', borderRadius: 13, backgroundColor: '#F9EBD8',
    borderWidth: 1, borderColor: '#D9A85D',
  },
  indicatorImage: { width: '100%', height: 110, backgroundColor: '#DDD0E6' },
  indicatorInfo: { minHeight: 67, paddingHorizontal: 8, paddingVertical: 7 },
  indicatorName: { color: '#32234D', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  indicatorValue: { color: '#6D3F98', fontSize: 12, fontWeight: '900', marginTop: 4 },
  indicatorValueSecondary: { color: '#9B5D48', fontSize: 10, fontWeight: '800', marginTop: 2 },
  baziCard: {
    backgroundColor: 'rgba(32, 22, 57, 0.9)', padding: 15, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(245, 204, 123, 0.4)', marginBottom: 16,
  },
  baziText: { color: '#FFF3E0', fontSize: 13, lineHeight: 20 },
  baziAdvice: { color: '#F4D191', fontSize: 12, lineHeight: 19, marginTop: 9 },
  tarotGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, rowGap: 12 },
  tarotCard: {
    overflow: 'hidden', borderRadius: 13, backgroundColor: 'rgba(13, 10, 25, 0.95)',
    borderWidth: 1, borderColor: 'rgba(242, 191, 91, 0.54)',
  },
  tarotPosition: { minHeight: 37, paddingHorizontal: 8, paddingVertical: 7, color: '#FBE6B9', fontSize: 11, fontWeight: '800', lineHeight: 15 },
  tarotImage: { width: '100%', aspectRatio: 0.72, backgroundColor: '#221B37' },
  tarotImageReversed: { transform: [{ rotate: '180deg' }] },
  tarotCardFooter: { paddingHorizontal: 9, paddingVertical: 8 },
  tarotName: { color: '#FFF5E4', fontSize: 12, fontWeight: '800' },
  tarotOrientation: { color: '#F8D58C', fontSize: 9, fontWeight: '800', marginTop: 4 },
  tarotOrientationReversed: { color: '#D6B6FF' },
  letter: { width: '100%', paddingHorizontal: 32, paddingVertical: 48, justifyContent: 'flex-start' },
  letterImage: { width: '100%', height: '100%' },
  letterEyebrow: { color: '#8E6D55', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  letterTitle: { color: '#3A275B', fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 13 },
  letterRule: { height: 1, backgroundColor: 'rgba(123, 91, 125, 0.48)', marginVertical: 10 },
  letterBody: { color: '#3C2F57', fontSize: 14, lineHeight: 23, fontWeight: '500' },
  letterEmphasis: { fontWeight: '900', color: '#302046' },
  bottomSpace: { height: 28 },
});
