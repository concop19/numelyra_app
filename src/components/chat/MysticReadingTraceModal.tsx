import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DrawnCardResult } from '../../services/tarotService';
import { getTarotCardImage, TAROT_CARD_BACK } from '../../services/tarotAssets';
import HighlightedAnswerText from './HighlightedAnswerText';
import CandleFlameSprite from '../CandleFlameSprite';
import FlameCharacterSprite from '../FlameCharacterSprite';
import BottomFlameSprite from '../BottomFlameSprite';
import { ttsService } from '../../services/ttsService';

const BACKGROUND = require('../../../assets/giao_dien/giaodien1/chat_detail/background/background.png');
const MAT = require('../../../assets/giao_dien/giaodien1/chat_detail/item/tham.png');
const CHEST = require('../../../assets/giao_dien/giaodien1/chat_detail/item/hop.png');
const CANDLE = require('../../../assets/giao_dien/giaodien1/chat_detail/item/nen.png');
const BOOK = require('../../../assets/giao_dien/giaodien1/chat_detail/item/sach.png');
const PAPER = require('../../../assets/giao_dien/giaodien1/chat_detail/item/giay.png');
const QUILL = require('../../../assets/giao_dien/giaodien1/chat_detail/item/but.png');

type Message = { id: string; text: string; card?: unknown };

type ReadingCardPayload = {
  questionText?: unknown;
  drawnCards?: unknown;
};

type PositionedCard = { left: number; top: number; width: number; height: number; rotate: string };
type HoveredCard = { title: string; subtitle: string; detail: string };
type LiveTarotReading = {
  id: string;
  question: string;
  cards: DrawnCardResult[];
  status: 'waiting' | 'ready' | 'revealed';
  replyText?: string;
};

type Props = {
  visible: boolean;
  message: Message | null;
  previousQuestion?: string;
  onClose: () => void;
  liveReading?: LiveTarotReading | null;
  revealedCount?: number;
  onRevealNext?: () => void;
};

const REFERENCE_WIDTH = 941;
const REFERENCE_HEIGHT = 1672;

function Decor({ scale, active, showQuill = true }: { scale: number; active: boolean; showQuill?: boolean }) {
  const position = (left: number, top: number, width: number, height: number) => ({
    position: 'absolute' as const,
    left: left * scale,
    top: top * scale,
    width: width * scale,
    height: height * scale,
  });

  return <View pointerEvents="none" style={styles.decorLayer}>
    <Image source={CHEST} resizeMode="contain" style={position(-8, 14, 450, 370)} />
    <Image source={CANDLE} resizeMode="contain" style={position(376, 66, 300, 232)} />
    <CandleFlameSprite scale={scale} active={active} />
    <Image source={MAT} resizeMode="contain" style={position(64, 350, 850, 790)} />
    <FlameCharacterSprite side="left" scale={scale} active={active} />
    <FlameCharacterSprite side="right" scale={scale} active={active} />
    <BottomFlameSprite side="left" scale={scale} active={active} />
    <BottomFlameSprite side="right" scale={scale} active={active} />
    <Image source={BOOK} resizeMode="contain" style={position(-58, 904, 288, 228)} />
    <Image source={PAPER} resizeMode="contain" style={position(48, 1152, 850, 519)} />
    {showQuill ? <Image source={QUILL} resizeMode="contain" style={position(606, 1204, 310, 250)} /> : null}
  </View>;
}

function getAnswerPreviewLength(text: string): number {
  const softLimit = Math.min(text.length, 260);
  const lastWordBreak = text.lastIndexOf(' ', softLimit);
  return lastWordBreak > 100 ? lastWordBreak : softLimit;
}

function createTarotLayout(count: number): PositionedCard[] {
  if (!count) return [];
  const rows = count > 3 ? [3, count - 3] : [count];
  const cards: PositionedCard[] = [];

  rows.forEach((rowCount, rowIndex) => {
    const gap = rowCount === 1 ? 0 : 18;
    const width = Math.min(rowCount === 1 ? 174 : 156, (570 - gap * (rowCount - 1)) / rowCount);
    const totalWidth = rowCount * width + (rowCount - 1) * gap;
    const firstLeft = (REFERENCE_WIDTH - totalWidth) / 2;
    // Tarot now occupies the full reading mat. Numerology cards are used only
    // as private context for the AI, never shown on this detail screen.
    const top = rowIndex === 0 ? 512 : 692;

    for (let index = 0; index < rowCount; index += 1) {
      cards.push({
        left: firstLeft + index * (width + gap),
        top,
        width,
        height: width * 1.45,
        rotate: `${(index - (rowCount - 1) / 2) * 2.4}deg`,
      });
    }
  });

  return cards;
}

export default function MysticReadingTraceModal({
  visible,
  message,
  previousQuestion,
  onClose,
  liveReading = null,
  revealedCount = 0,
  onRevealNext,
}: Props) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [hoveredCard, setHoveredCard] = useState<HoveredCard | null>(null);
  const [answerPreviewChars, setAnswerPreviewChars] = useState(0);
  const [hasRevealedAnswerIntro, setHasRevealedAnswerIntro] = useState(false);
  const quillMotion = useRef(new Animated.Value(0)).current;
  const autoSpokenReadingId = useRef<string | null>(null);
  const payload = message?.card as ReadingCardPayload | undefined;

  useEffect(() => {
    if (!visible) setHoveredCard(null);
  }, [visible]);
  const question = useMemo(() => {
    if (liveReading) return liveReading.question;
    return typeof payload?.questionText === 'string' && payload.questionText.trim()
      ? payload.questionText
      : previousQuestion;
  }, [liveReading, payload?.questionText, previousQuestion]);
  const tarotCards = useMemo(
    () => (liveReading?.cards || (Array.isArray(payload?.drawnCards) ? payload.drawnCards as DrawnCardResult[] : [])).slice(0, 5),
    [liveReading?.cards, payload?.drawnCards],
  );
  const tarotLayout = useMemo(() => createTarotLayout(tarotCards.length), [tarotCards.length]);
  const isLiveDraw = Boolean(liveReading);
  const safeRevealedCount = Math.min(revealedCount, tarotCards.length);
  const allCardsRevealed = safeRevealedCount === tarotCards.length;
  const canShowReading = !isLiveDraw || (allCardsRevealed && liveReading?.status === 'revealed');
  const answerText = isLiveDraw ? liveReading?.replyText : message?.text;
  const isWritingRitual = isLiveDraw && allCardsRevealed && !canShowReading;
  const answerPreviewLength = answerText ? getAnswerPreviewLength(answerText) : 0;
  const visibleAnswerText = isLiveDraw && canShowReading && !hasRevealedAnswerIntro
    ? (answerText || '').slice(0, answerPreviewChars)
    : answerText;

  // Chỉ đọc khi phần luận giải đã thực sự hiện trong màn detail (sau khi lật
  // đủ bài), và chỉ một lần cho mỗi lượt rút bài mới.
  useEffect(() => {
    const readingId = liveReading?.id;
    if (!visible || !isLiveDraw || !readingId || !canShowReading || !answerText?.trim()) return;

    const speechId = `detail-reading-${readingId}`;
    if (autoSpokenReadingId.current === speechId) return;

    autoSpokenReadingId.current = speechId;
    void ttsService.speak(speechId, answerText);

    return () => {
      if (ttsService.getCurrentSpeakingId() === speechId) {
        void ttsService.stop();
      }
    };
  }, [answerText, canShowReading, isLiveDraw, liveReading?.id, visible]);

  useEffect(() => {
    setAnswerPreviewChars(0);
    setHasRevealedAnswerIntro(false);
  }, [answerText, liveReading?.question]);

  useEffect(() => {
    if (!isLiveDraw || !canShowReading || !answerText || hasRevealedAnswerIntro) return;

    let revealed = 0;
    const timer = setInterval(() => {
      revealed = Math.min(revealed + 10, answerPreviewLength);
      setAnswerPreviewChars(revealed);
      if (revealed >= answerPreviewLength) {
        clearInterval(timer);
        setHasRevealedAnswerIntro(true);
      }
    }, 28);

    return () => clearInterval(timer);
  }, [answerPreviewLength, answerText, canShowReading, hasRevealedAnswerIntro, isLiveDraw]);

  useEffect(() => {
    if (!isWritingRitual) {
      quillMotion.stopAnimation();
      quillMotion.setValue(0);
      return;
    }

    const writingLoop = Animated.loop(Animated.sequence([
      Animated.timing(quillMotion, { toValue: 1, duration: 1050, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(quillMotion, { toValue: 0, duration: 920, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    writingLoop.start();
    return () => writingLoop.stop();
  }, [isWritingRitual, quillMotion]);

  const isLandscape = viewportWidth > viewportHeight;
  const scale = isLandscape
    ? Math.min(viewportWidth / REFERENCE_WIDTH, viewportHeight / REFERENCE_HEIGHT)
    : Math.max(viewportWidth / REFERENCE_WIDTH, viewportHeight / REFERENCE_HEIGHT);
  const canvasWidth = REFERENCE_WIDTH * scale;
  const canvasHeight = REFERENCE_HEIGHT * scale;
  const canvasLeft = (viewportWidth - canvasWidth) / 2;
  const canvasTop = (viewportHeight - canvasHeight) / 2;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scene}>
        <ImageBackground
          source={BACKGROUND}
          resizeMode="stretch"
          style={[styles.canvas, { left: canvasLeft, top: canvasTop, width: canvasWidth, height: canvasHeight }]}
        >
          <Decor scale={scale} active={visible} showQuill={!isWritingRitual} />

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Quay lại cuộc trò chuyện"
            style={[styles.closeButton, {
              left: 44 * scale,
              top: 48 * scale,
              width: 54 * scale,
              height: 54 * scale,
              borderRadius: 27 * scale,
            }]}
          >
            <Ionicons name="arrow-back" size={Math.max(16, 28 * scale)} color="#FFF5DF" />
          </TouchableOpacity>

          <View pointerEvents="none" style={[styles.sceneHeading, { top: 38 * scale, left: 210 * scale, width: 520 * scale }]}>
            <Text style={[styles.sceneTitle, { fontSize: Math.max(15, 27 * scale), lineHeight: Math.max(19, 32 * scale) }]}>{isWritingRitual ? 'Lời giải đang hiện hình' : isLiveDraw ? 'Nghi thức rút bài' : 'AI đã đối chiếu'}</Text>
            <Text style={[styles.sceneSubtitle, { fontSize: Math.max(8, 13 * scale) }]}>{isWritingRitual ? 'Tiểu Linh Miêu đang chép thông điệp dành riêng cho bạn' : isLiveDraw ? 'Chạm vào bộ bài để mở từng thông điệp' : 'Lời luận giải dành riêng cho bạn'}</Text>
          </View>

          {tarotCards.length > 0 ? <>
            <View pointerEvents="none" style={[styles.matSectionHeading, { top: 466 * scale, left: 180 * scale, width: 581 * scale }]}>
              <Text style={[styles.matSectionHeadingText, { fontSize: Math.max(8, 13 * scale) }]}>TAROT ĐÃ RÚT</Text>
            </View>
            {isLiveDraw && tarotCards.map((tarot, index) => {
              const card = tarotLayout[index];
              return <View
                key={`slot-${tarot.position.id}`}
                pointerEvents="none"
                style={[styles.tarotSlot, {
                  left: card.left * scale,
                  top: card.top * scale,
                  width: card.width * scale,
                  height: card.height * scale,
                  borderRadius: 11 * scale,
                  transform: [{ rotate: card.rotate }],
                }]}
              >
                <Text style={[styles.tarotSlotNumber, { fontSize: Math.max(12, 23 * scale) }]}>{index + 1}</Text>
                <Text numberOfLines={2} style={[styles.tarotSlotLabel, { fontSize: Math.max(7, 10 * scale) }]}>{tarot.position.nameVi}</Text>
              </View>;
            })}
            {(isLiveDraw ? tarotCards.slice(0, safeRevealedCount) : tarotCards).map((tarot, index) => {
              const card = tarotLayout[index];
              const cardInfo = {
                title: tarot.card.nameVi,
                subtitle: `${tarot.position?.nameVi || 'Thông điệp Tarot'} · ${tarot.isReversed ? 'Lá ngược' : 'Lá xuôi'}`,
                detail: tarot.isReversed ? tarot.card.meaningReversed : tarot.card.meaningUpright,
              };
              return <Pressable
                key={`${message?.id || 'reading'}-tarot-${index}`}
                onHoverIn={() => setHoveredCard(cardInfo)}
                onHoverOut={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(cardInfo)}
                onBlur={() => setHoveredCard(null)}
                onPress={() => setHoveredCard((current) => current?.title === cardInfo.title ? null : cardInfo)}
                accessibilityRole="button"
                accessibilityLabel={`Xem thông tin lá ${tarot.card.nameVi}`}
                style={[styles.tarotCard, {
                  left: card.left * scale,
                  top: card.top * scale,
                  width: card.width * scale,
                  height: card.height * scale,
                  borderRadius: 11 * scale,
                  transform: [{ rotate: card.rotate }],
                }]}
              >
                <Image
                  source={getTarotCardImage(tarot.card.id)}
                  resizeMode="cover"
                  style={[styles.cardArtwork, tarot.isReversed && styles.tarotReversed]}
                />
                <View style={[styles.tarotCaption, { paddingHorizontal: 5 * scale, paddingVertical: 4 * scale }]}>
                  <Text numberOfLines={1} style={[styles.tarotCaptionText, { fontSize: Math.max(7, 10 * scale) }]}>{tarot.position?.nameVi || tarot.card.nameVi}</Text>
                </View>
              </Pressable>;
            })}
          </> : null}

          {isLiveDraw && !allCardsRevealed && (
            <View style={[styles.deckArea, { left: 56 * scale, top: 982 * scale, width: 829 * scale, height: 246 * scale }]}>
              {Array.from({ length: 19 }, (_, index) => {
                const middle = 9;
                const distance = Math.abs(index - middle);
                return <Image
                  key={index}
                  source={TAROT_CARD_BACK}
                  resizeMode="cover"
                  style={[styles.deckCard, {
                    left: (58 + index * 34) * scale,
                    top: (36 + distance * distance * 1.18) * scale,
                    width: 118 * scale,
                    height: 182 * scale,
                    borderRadius: 10 * scale,
                    transform: [{ rotate: `${(index - middle) * 4.2}deg` }],
                  }]}
                />;
              })}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onRevealNext?.();
                }}
                style={styles.deckTouchTarget}
                accessibilityRole="button"
                accessibilityLabel={`Rút lá bài ${safeRevealedCount + 1} trong tổng số ${tarotCards.length}`}
              >
                <Text style={[styles.deckPrompt, { fontSize: Math.max(11, 15 * scale) }]}>Chạm để rút lá {safeRevealedCount + 1}</Text>
                <Text style={[styles.deckProgress, { fontSize: Math.max(8, 11 * scale) }]}>Đã rút {safeRevealedCount}/{tarotCards.length} lá</Text>
              </TouchableOpacity>
            </View>
          )}

          {hoveredCard ? <View pointerEvents="none" style={[styles.hoverCard, {
            left: 110 * scale,
            top: 260 * scale,
            width: 721 * scale,
            minHeight: 112 * scale,
            borderRadius: 15 * scale,
            paddingHorizontal: 18 * scale,
            paddingVertical: 12 * scale,
          }]}>
            <Text numberOfLines={1} style={[styles.hoverTitle, { fontSize: Math.max(11, 17 * scale) }]}>{hoveredCard.title}</Text>
            <Text numberOfLines={1} style={[styles.hoverSubtitle, { fontSize: Math.max(9, 12 * scale) }]}>{hoveredCard.subtitle}</Text>
            <Text numberOfLines={3} style={[styles.hoverDetail, { fontSize: Math.max(9, 12 * scale), lineHeight: Math.max(13, 18 * scale) }]}>{hoveredCard.detail}</Text>
          </View> : null}

          {isWritingRitual ? <>
            <Animated.View pointerEvents="none" style={[styles.mysticInk, {
              left: 194 * scale,
              top: 1302 * scale,
              width: 552 * scale,
              opacity: quillMotion.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.42, 0.82, 0.5] }),
              transform: [{ translateX: quillMotion.interpolate({ inputRange: [0, 1], outputRange: [-8 * scale, 7 * scale] }) }],
            }]}>
              <Text style={[styles.mysticInkLine, { fontSize: Math.max(10, 15 * scale) }]}>⌁ ✦ ⟡ ⋯ ᛫ ⟢ ⌁ ✧ ⋯ ⟡</Text>
              <Text style={[styles.mysticInkLine, styles.mysticInkLineOffset, { fontSize: Math.max(9, 13 * scale) }]}>✧ ⋮ ⌁ ⟡ ᚜ ⋯ ✦ ᛫ ⟢ ⌁</Text>
              <Text style={[styles.mysticInkLine, { fontSize: Math.max(10, 14 * scale) }]}>⟡ ⋯ ✧ ⌁ ᛫ ✦ ⋮ ⟢ ⋯ ⌁</Text>
              <Text style={[styles.mysticInkLine, styles.mysticInkLineShort, { fontSize: Math.max(9, 12 * scale) }]}>⌁ ✦ ⟡ ⋯ ᛫ ⟢</Text>
            </Animated.View>
            <Animated.Image
              source={QUILL}
              resizeMode="contain"
              style={[styles.writingQuill, {
                left: 606 * scale,
                top: 1204 * scale,
                width: 310 * scale,
                height: 250 * scale,
                transform: [
                  { translateX: quillMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [10 * scale, -76 * scale, 10 * scale] }) },
                  { translateY: quillMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [4 * scale, -16 * scale, 4 * scale] }) },
                  { rotate: quillMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '-4deg'] }) },
                ],
              }]}
            />
          </> : null}

          {canShowReading ? <ScrollView
            style={[styles.paperReading, {
              // Chỉ dùng phần giấy trống bên trong, không cho chữ chạy qua lá/các cuộn giấy ở viền.
              left: 185 * scale,
              top: 1280 * scale,
              width: 570 * scale,
              height: 255 * scale,
              borderRadius: 13 * scale,
            }]}
            contentContainerStyle={[styles.paperContent, {
              paddingHorizontal: Math.max(9, 16 * scale),
              paddingTop: Math.max(10, 16 * scale),
              paddingBottom: Math.max(18, 28 * scale),
            }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.kicker}>{isLiveDraw && !hasRevealedAnswerIntro ? 'LỜI GIẢI ĐANG HIỆN HÌNH' : 'LUẬN GIẢI HIỆN TẠI'}</Text>
            {question ? <>
              <Text style={styles.questionLabel}>Câu hỏi của bạn</Text>
              <Text style={styles.question}>{question}</Text>
              <View style={styles.rule} />
            </> : null}
            <HighlightedAnswerText
              text={visibleAnswerText || ' '}
              style={styles.answer}
              emphasisStyle={styles.answerEmphasis}
            />
            {isLiveDraw && !hasRevealedAnswerIntro ? <Text style={styles.writingCursor}>✦</Text> : null}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { void Haptics.selectionAsync(); onClose(); }}
              style={styles.doneButton}
              accessibilityRole="button"
              accessibilityLabel="Đóng luận giải"
            >
              <Text style={styles.doneText}>Đã hiểu · quay lại</Text>
            </TouchableOpacity>
          </ScrollView> : <View pointerEvents="none" style={[styles.waitingReading, { left: 185 * scale, top: 1280 * scale, width: 570 * scale }]}>
            <Text style={[styles.waitingReadingTitle, { fontSize: Math.max(10, 15 * scale) }]}>
              {isWritingRitual ? 'Những nét mực đang ghép thành lời giải…' : allCardsRevealed ? 'Các lá đã mở — Tiểu Linh Miêu đang kết nối lời giải…' : 'Hãy rút đủ các lá để mở lời luận giải'}
            </Text>
            <Text style={[styles.waitingReadingHint, { fontSize: Math.max(8, 11 * scale) }]}>{isWritingRitual ? 'Nét chữ chỉ là nghi thức — thông điệp thật sẽ hiện ngay khi hoàn tất.' : 'Luận giải sẽ hiện ngay khi bạn và Numelyra cùng hoàn tất.'}</Text>
          </View>}
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: '#231047', overflow: 'hidden' },
  canvas: { position: 'absolute' },
  decorLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  closeButton: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 5,
    backgroundColor: 'rgba(27, 10, 50, 0.58)', borderWidth: 1, borderColor: 'rgba(255, 219, 136, 0.72)',
  },
  sceneHeading: { position: 'absolute', alignItems: 'center', zIndex: 4 },
  sceneTitle: { color: '#FFF6E3', fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(42, 13, 68, 0.8)', textShadowRadius: 7 },
  sceneSubtitle: { color: '#F2D9C3', marginTop: 1, fontWeight: '600', textAlign: 'center' },
  matSectionHeading: { position: 'absolute', alignItems: 'center', zIndex: 3 },
  matSectionHeadingText: { color: '#FFE7AA', fontWeight: '900', letterSpacing: 1.6, textShadowColor: 'rgba(32, 11, 65, 0.95)', textShadowRadius: 5 },
  cardArtwork: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  tarotSlot: { position: 'absolute', zIndex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26, 13, 51, 0.26)', borderWidth: 1.5, borderColor: 'rgba(255, 227, 160, 0.48)', borderStyle: 'dashed' },
  tarotSlotNumber: { color: 'rgba(255, 239, 199, 0.72)', fontWeight: '800' },
  tarotSlotLabel: { color: 'rgba(255, 240, 210, 0.82)', fontWeight: '700', marginTop: 6, paddingHorizontal: 8, textAlign: 'center' },
  tarotCard: { position: 'absolute', overflow: 'hidden', zIndex: 3, borderWidth: 2, borderColor: '#F9DC91', backgroundColor: '#211337', shadowColor: '#0A0417', shadowOpacity: 0.68, shadowRadius: 10, elevation: 9 },
  tarotReversed: { transform: [{ rotate: '180deg' }] },
  tarotCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(29, 12, 55, 0.88)' },
  tarotCaptionText: { color: '#FFF1C4', fontWeight: '800', textAlign: 'center' },
  hoverCard: { position: 'absolute', zIndex: 7, backgroundColor: 'rgba(28, 12, 55, 0.95)', borderWidth: 1, borderColor: 'rgba(255, 222, 147, 0.86)', shadowColor: '#05010A', shadowOpacity: 0.6, shadowRadius: 14, elevation: 12 },
  hoverTitle: { color: '#FFF0C4', fontWeight: '900', textAlign: 'center' },
  hoverSubtitle: { color: '#FFD77D', fontWeight: '700', marginTop: 2, textAlign: 'center' },
  hoverDetail: { color: '#F4E9D7', marginTop: 6, textAlign: 'center' },
  deckArea: { position: 'absolute', zIndex: 4 },
  deckCard: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(249, 220, 145, 0.72)', backgroundColor: '#211337', shadowColor: '#10071F', shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 },
  deckTouchTarget: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5 },
  deckPrompt: { color: '#FFF0C4', fontWeight: '900', textShadowColor: 'rgba(27, 7, 47, 0.95)', textShadowRadius: 5 },
  deckProgress: { color: '#F8D991', fontWeight: '700', marginTop: 3, textShadowColor: 'rgba(27, 7, 47, 0.95)', textShadowRadius: 5 },
  mysticInk: { position: 'absolute', zIndex: 4, transform: [{ rotate: '-1deg' }] },
  mysticInkLine: { color: 'rgba(89, 49, 50, 0.88)', fontWeight: '800', letterSpacing: 3.4, lineHeight: 24, textShadowColor: 'rgba(107, 56, 48, 0.18)', textShadowRadius: 2 },
  mysticInkLineOffset: { marginLeft: 29 },
  mysticInkLineShort: { marginLeft: 12 },
  writingQuill: { position: 'absolute', zIndex: 5 },
  // Vùng cuộn nằm trong phần giấy trống; để trong suốt để chữ như được viết trực tiếp lên giấy.
  paperReading: { position: 'absolute', zIndex: 3 },
  waitingReading: { position: 'absolute', zIndex: 3, minHeight: 115, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  waitingReadingTitle: { color: '#72423F', fontWeight: '900', textAlign: 'center' },
  waitingReadingHint: { color: '#8B6157', fontWeight: '600', textAlign: 'center', marginTop: 6 },
  paperContent: { minHeight: '100%' },
  kicker: { color: '#8B4A3C', fontSize: 9, letterSpacing: 1.1, fontWeight: '900', textAlign: 'center' },
  questionLabel: { color: '#7A3E39', fontSize: 12, fontWeight: '800', marginTop: 8 },
  question: { color: '#60433D', fontSize: 12.5, lineHeight: 18, fontStyle: 'italic', marginTop: 2 },
  rule: { height: 1, backgroundColor: 'rgba(113, 56, 51, 0.28)', marginVertical: 9 },
  answer: { color: '#503A3B', fontSize: 13, lineHeight: 19.5, fontWeight: '500' },
  answerEmphasis: { color: '#713543', fontWeight: '900' },
  writingCursor: { color: '#713543', fontSize: 14, marginTop: 2, opacity: 0.78 },
  doneButton: { alignSelf: 'center', borderRadius: 15, backgroundColor: '#7A3E39', paddingHorizontal: 16, paddingVertical: 8, marginTop: 18 },
  doneText: { color: '#FFF4D6', fontSize: 12, fontWeight: '800' },
});
