import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import HighlightedAnswerText from '../HighlightedAnswerText';
import type { MessageItem } from '../../../screens/ChatScreen';
import { getLoveReadingViewModel } from './loveReadingModel';

const LOADING_BACKGROUND = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/background/loading.png');
const SUCCESS_BACKGROUND = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/background/success.png');
const LOADING_ANIMATION = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/animation/loading.webp');
const SUCCESS_ANIMATION = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/animation/success.webp');
const FAIL_ANIMATION = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/animation/fail.webp');

type Props = {
  visible: boolean;
  message?: MessageItem;
  question: string;
  onClose: () => void;
  onOpenDetail: (message: MessageItem, question: string) => void;
};

export default function LoveCompatibilityFlow({
  visible,
  message,
  question,
  onClose,
  onOpenDetail,
}: Props) {
  const model = useMemo(
    () => message ? getLoveReadingViewModel(message.card, message.text, question) : null,
    [message, question],
  );

  if (!visible) return null;

  const isLoading = !message;
  const score = model?.compatibilityScore;
  const resultAnimation = score !== undefined && score < 50 ? FAIL_ANIMATION : SUCCESS_ANIMATION;

  return (
    <View style={styles.overlay}>
      <Image
        source={isLoading ? LOADING_BACKGROUND : SUCCESS_BACKGROUND}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        accessibilityIgnoresInvertColors
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quay lại trò chuyện"
            onPress={onClose}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={21} color="#FFF5E7" />
          </TouchableOpacity>
          <Text style={styles.brand}>Numelyra</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContent}>
            <Text style={styles.loadingPercent}>Đang lắng nghe duyên số</Text>
            <Text style={styles.loadingTitle}>AI đang phân tích{`\n`}mối tương hợp của hai bạn...</Text>
            <Image
              source={LOADING_ANIMATION}
              style={styles.loadingAnimation}
              contentFit="contain"
              autoplay
              accessibilityLabel="Hoạt ảnh AI đang phân tích tương hợp"
            />
            <View style={styles.loadingCaption}>
              <Text style={styles.loadingCaptionText}>
                Đang đối chiếu Tử Vi, Bát Tự và những yếu tố tạo nên sự hòa hợp.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.resultContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.resultTitle}>AI YÊU AI HƠN?</Text>
              <Image
                source={resultAnimation}
                style={styles.resultAnimation}
                contentFit="contain"
                autoplay
                accessibilityLabel={score !== undefined && score < 50
                  ? 'Hoạt ảnh mức tương hợp thấp'
                  : 'Hoạt ảnh mức tương hợp'}
              />
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{score !== undefined ? `${score}%` : 'DUYÊN'}</Text>
                <Text style={styles.scoreCaption}>
                  {score !== undefined && score < 50 ? 'Cần thấu hiểu nhau hơn' : 'Cùng vun đắp sự thấu hiểu'}
                </Text>
              </View>

              <View style={styles.answerCard}>
                <Text style={styles.answerHeading}>LUẬN GIẢI AI</Text>
                <HighlightedAnswerText
                  text={model?.answer || 'Hai bạn hãy chậm lại và lắng nghe điều trái tim đang muốn nói.'}
                  style={styles.answerText}
                  emphasisStyle={styles.answerEmphasis}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Xem nguyên nhân tương hợp chi tiết"
              activeOpacity={0.86}
              disabled={!message}
              onPress={() => message && onOpenDetail(message, question)}
              style={[styles.detailButton, !message && styles.detailButtonDisabled]}
            >
              <Text style={styles.detailButtonText}>Xem nguyên nhân chi tiết</Text>
              <Ionicons name="arrow-forward" size={19} color="#FFF8EA" />
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#171333',
  },
  safeArea: { flex: 1, backgroundColor: 'rgba(17, 13, 43, 0.12)' },
  header: {
    height: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  brand: { color: '#FFF5E7', fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
  headerSpacer: { width: 38 },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 18,
  },
  loadingPercent: {
    color: '#FFF9F0',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(44, 61, 142, 0.8)',
    textShadowRadius: 12,
  },
  loadingTitle: {
    color: '#FFF7EC',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingAnimation: { width: '100%', flex: 1, maxHeight: 320, minHeight: 190 },
  loadingCaption: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(30, 35, 67, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  loadingCaptionText: { color: '#FFF5E7', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  resultContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  resultTitle: {
    color: '#FFF9F1',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.7,
    textShadowColor: 'rgba(72, 96, 164, 0.8)',
    textShadowRadius: 10,
  },
  resultAnimation: { width: '100%', height: 190, marginTop: 4 },
  scoreBadge: {
    width: 166,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -3,
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(126, 72, 151, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scoreText: { color: '#FFFDF8', fontSize: 34, lineHeight: 39, fontWeight: '900' },
  scoreCaption: { color: '#FFF0D8', fontSize: 12, fontWeight: '700', marginTop: 1 },
  answerCard: {
    width: '100%',
    borderRadius: 21,
    paddingHorizontal: 17,
    paddingVertical: 15,
    backgroundColor: '#FFF0D3',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
  },
  answerHeading: {
    color: '#B94C82',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  answerText: { color: '#423445', fontSize: 14, lineHeight: 20 },
  answerEmphasis: { color: '#992D68', fontWeight: '900' },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginHorizontal: 20,
    marginBottom: 10,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: '#CC3F89',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  detailButtonDisabled: { opacity: 0.55 },
  detailButtonText: { color: '#FFF8EA', fontSize: 15, fontWeight: '900' },
});
