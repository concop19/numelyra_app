import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CalculatedIndicator } from '../services/numerologyEngine';
import { getIndicatorReading, KnowledgeReadingResult } from '../services/numerologyKnowledge';
import CandleFlameSprite from './CandleFlameSprite';
import FlameCharacterSprite from './FlameCharacterSprite';
import BottomFlameSprite from './BottomFlameSprite';

const BACKGROUND = require('../../assets/giao_dien/giaodien1/chat_detail/background/background.png');
const MAT = require('../../assets/giao_dien/giaodien1/chat_detail/item/tham.png');
const CHEST = require('../../assets/giao_dien/giaodien1/chat_detail/item/hop.png');
const CANDLE = require('../../assets/giao_dien/giaodien1/chat_detail/item/nen.png');
const BOOK = require('../../assets/giao_dien/giaodien1/chat_detail/item/sach.png');
const PAPER = require('../../assets/giao_dien/giaodien1/chat_detail/item/giay.png');
const QUILL = require('../../assets/giao_dien/giaodien1/chat_detail/item/but.png');

/** Slots from the 941 × 1672 design reference; Tarot cards are integrated later. */
export const DETAIL_CARD_SLOTS = [
  { key: 'left', left: '20%', top: '28%', width: '18%', rotate: '7deg' },
  { key: 'middle', left: '41%', top: '24.5%', width: '18%', rotate: '0deg' },
  { key: 'right', left: '61%', top: '28%', width: '16%', rotate: '-7deg' },
] as const;

type Props = {
  visible: boolean;
  indicator: CalculatedIndicator | null;
  onClose: () => void;
};

const REFERENCE_WIDTH = 941;
const REFERENCE_HEIGHT = 1672;

type PaperLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function Decor({ scale, active, paperLayout }: { scale: number; active: boolean; paperLayout: PaperLayout }) {
  const itemStyle = (left: number, top: number, width: number, height: number) => ({
    position: 'absolute' as const,
    left: left * scale,
    top: top * scale,
    width: width * scale,
    height: height * scale,
  });
  return <View pointerEvents="none" style={styles.decorLayer}>
    <Image source={CHEST} resizeMode="contain" style={itemStyle(-8, 14, 450, 370)} />
    <Image source={CANDLE} resizeMode="contain" style={itemStyle(376, 66, 300, 232)} />
    <CandleFlameSprite scale={scale} active={active} />
    <Image source={MAT} resizeMode="contain" style={itemStyle(64, 350, 850, 790)} />
    <FlameCharacterSprite side="left" scale={scale} active={active} />
    <FlameCharacterSprite side="right" scale={scale} active={active} />
    <BottomFlameSprite side="left" scale={scale} active={active} />
    <BottomFlameSprite side="right" scale={scale} active={active} />
    <Image source={BOOK} resizeMode="contain" style={itemStyle(-58, 904, 288, 228)} />
    <Image
      source={PAPER}
      resizeMode="stretch"
      style={[itemStyle(paperLayout.left, paperLayout.top, paperLayout.width, paperLayout.height), styles.paperSurface]}
    />
    <Image source={QUILL} resizeMode="contain" style={itemStyle(606, 1204, 310, 250)} />
  </View>;
}

export function MysticIndicatorDetailModal({ visible, indicator, onClose }: Props) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<KnowledgeReadingResult | null>(null);
  const [showFullArticle, setShowFullArticle] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!visible || !indicator) {
      setReading(null);
      setLoading(false);
      return () => { mounted = false; };
    }
    setLoading(true);
    setShowFullArticle(false);
    getIndicatorReading(indicator.key, indicator.value, indicator.nameVi)
      .then((result) => { if (mounted) setReading(result); })
      .catch((error) => console.warn('[DetailModal] Load reading error:', error))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [visible, indicator]);

  if (!indicator) return null;

  const isLandscape = viewportWidth > viewportHeight;
  const scale = isLandscape
    ? Math.min(viewportWidth / REFERENCE_WIDTH, viewportHeight / REFERENCE_HEIGHT)
    : Math.max(viewportWidth / REFERENCE_WIDTH, viewportHeight / REFERENCE_HEIGHT);
  const canvasWidth = REFERENCE_WIDTH * scale;
  const canvasHeight = REFERENCE_HEIGHT * scale;
  const canvasLeft = (viewportWidth - canvasWidth) / 2;
  const canvasTop = (viewportHeight - canvasHeight) / 2;
  const usesExpandedPaper = !isLandscape;
  const paperLayout: PaperLayout = usesExpandedPaper
    ? {
        // Let the reading surface fill the lower portion of a portrait phone.
        // The image is stretched only vertically so its width stays aligned with the artwork.
        left: 48,
        top: (viewportHeight * 0.4 - canvasTop) / scale,
        width: 850,
        height: (viewportHeight * 0.62) / scale,
      }
    : { left: 48, top: 1152, width: 850, height: 519 };
  const readingFrame = {
    left: 116 * scale,
    top: usesExpandedPaper ? viewportHeight * 0.45 : 1250 * scale,
    width: 710 * scale,
    height: usesExpandedPaper ? viewportHeight * 0.5 : 330 * scale,
  };

  return <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
    <View style={styles.scene}>
      <ImageBackground source={BACKGROUND} resizeMode="stretch" style={[styles.canvas, { left: canvasLeft, top: canvasTop, width: canvasWidth, height: canvasHeight }]}>
      <Decor scale={scale} active={visible} paperLayout={paperLayout} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng luận giải chi tiết" activeOpacity={0.75} onPress={onClose} style={[styles.closeButton, { left: 856 * scale, top: 46 * scale, width: 48 * scale, height: 48 * scale, borderRadius: 24 * scale }]}>
        <Ionicons name="close" size={22} color="#FFF5DF" />
      </TouchableOpacity>

      <ScrollView style={[styles.paperReading, readingFrame]} contentContainerStyle={styles.paperReadingContent} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.kicker}>BẢN ĐỒ BẢN MỆNH · #{indicator.number}</Text>
        <Text style={styles.title}>{indicator.nameVi}</Text>
        <Text style={styles.subtitle}>{indicator.nameEn}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.valueLabel}>Chỉ số của bạn</Text>
          <Text style={styles.value}>{indicator.displayValue}</Text>
          {indicator.isMaster ? <Text style={styles.master}>MASTER</Text> : null}
        </View>
        <Text style={styles.description}>{indicator.description}</Text>

        {loading ? <Text style={styles.loadingText}>Đang mở trang luận giải…</Text> : reading ? <View style={styles.reading}>
          <Section title="Bản chất cốt lõi" body={reading.overview} />
          {reading.strengths.length > 0 ? <Bullets title="Điểm mạnh tự nhiên" items={reading.strengths} /> : null}
          {reading.challenges.length > 0 ? <Bullets title="Điều cần lưu ý" items={reading.challenges} /> : null}
          {reading.advice ? <Section title="Lời khuyên" body={reading.advice} accent /> : null}
          {reading.fullContent && reading.fullContent.length > 300 ? <View style={styles.articleToggleWrap}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { void Haptics.selectionAsync(); setShowFullArticle((current) => !current); }} style={styles.articleToggle}>
              <Text style={styles.articleToggleText}>{showFullArticle ? 'Thu gọn tư liệu' : 'Đọc tư liệu gốc'}</Text>
              <Ionicons name={showFullArticle ? 'chevron-up' : 'chevron-down'} size={15} color="#7A3E39" />
            </TouchableOpacity>
            {showFullArticle ? <Text style={styles.fullArticle}>{reading.fullContent}</Text> : null}
          </View> : null}
        </View> : <Text style={styles.loadingText}>Chưa có tư liệu chi tiết cho chỉ số này.</Text>}

        <TouchableOpacity activeOpacity={0.8} onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Đã hiểu · quay lại</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
    </View>
  </Modal>;
}

function Section({ title, body, accent = false }: { title: string; body: string; accent?: boolean }) {
  return <View style={styles.section}><Text style={[styles.sectionTitle, accent && styles.accentTitle]}>{title}</Text><Text style={styles.sectionBody}>{body}</Text></View>;
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{items.map((item, index) => <Text key={`${title}-${index}`} style={styles.bullet}>✦ {item}</Text>)}</View>;
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: '#231047', overflow: 'hidden' },
  canvas: { position: 'absolute' },
  decorLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  closeButton: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(27, 10, 50, 0.58)', borderWidth: 1, borderColor: 'rgba(255, 219, 136, 0.72)', zIndex: 40, elevation: 40 },
  paperSurface: { zIndex: 20, elevation: 20 },
  paperReading: { position: 'absolute', zIndex: 30, elevation: 30 },
  paperReadingContent: { paddingHorizontal: 16, paddingBottom: 18 },
  kicker: { color: '#8B4A3C', fontSize: 9, letterSpacing: 1.1, fontWeight: '800', textAlign: 'center' },
  title: { color: '#4A2435', fontSize: 21, lineHeight: 25, textAlign: 'center', fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#8B6356', fontSize: 11, textAlign: 'center', fontStyle: 'italic', fontWeight: '600', marginTop: 1 },
  valueRow: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 8 },
  valueLabel: { color: '#79564C', fontSize: 11 }, value: { color: '#7A303D', fontSize: 18, fontWeight: '900' },
  master: { borderRadius: 8, backgroundColor: '#7D4050', color: '#FFF4D5', fontSize: 8, letterSpacing: 0.6, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3 },
  description: { color: '#5F3D39', fontSize: 12.5, lineHeight: 18, textAlign: 'center', fontWeight: '600', marginTop: 8 },
  loadingText: { color: '#73483E', fontSize: 12, fontStyle: 'italic', fontWeight: '600', textAlign: 'center', marginTop: 16 },
  reading: { marginTop: 12, gap: 10 }, section: { borderTopWidth: 1, borderTopColor: 'rgba(113, 56, 51, 0.2)', paddingTop: 8 },
  sectionTitle: { color: '#743542', fontSize: 13.5, fontWeight: '800', marginBottom: 3 }, accentTitle: { color: '#9A522E' },
  sectionBody: { color: '#5D403B', fontSize: 12.5, lineHeight: 18.5, fontWeight: '600' }, bullet: { color: '#5D403B', fontSize: 12.5, lineHeight: 18.5, fontWeight: '600', marginTop: 2 },
  articleToggleWrap: { borderTopWidth: 1, borderTopColor: 'rgba(113, 56, 51, 0.2)', paddingTop: 6 },
  articleToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 3, paddingVertical: 5, paddingHorizontal: 8 },
  articleToggleText: { color: '#7A3E39', fontSize: 12, fontWeight: '800' }, fullArticle: { color: '#5D403B', fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  doneButton: { alignSelf: 'center', borderRadius: 15, backgroundColor: '#7A3E39', paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 },
  doneButtonText: { color: '#FFF4D6', fontSize: 12, fontWeight: '800' },
});
