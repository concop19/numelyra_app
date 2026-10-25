import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { calculate24Indicators, CalculatedIndicator } from '../services/numerologyEngine';
import { IndicatorCategory } from '../config/numerologyCards';
import { IndicatorDetailModal } from './IndicatorDetailModal';
import { HistoricalFigureModal } from './HistoricalFigureModal';
import ThreeDButton from './ThreeDButton';
import { getRepresentativeByTriple, RepresentativeItem } from '../db/representativeService';
import { getIndicatorShortSummary } from '../services/numerologySummaryService';
import { formatIndicatorDisplayValue } from '../services/numerologyPresentation';
import { getIndicatorReading } from '../services/numerologyKnowledge';
import { type ProfileItem } from '../store/userProfile';
import { useLocalization } from '../i18n/LocalizationContext';

// Hình nền Vũ Trụ Thần Số Học của Numelyra
const BG_NUMELYRA_24 = require('../../assets/background/numelyra_background.png');

/**
 * Hệ màu thiết kế chuẩn của ứng dụng Numelyra:
 * - Nền chính:  #160E34 (Midnight Obsidian)
 * - Surface:    #292044 (Deep Cosmic Surface)
 * - Điểm nhấn:  #E8BC79 (Celestial Champagne Gold)
 * - Chữ chính:  #F6F0E8 (Moonlight Ivory White)
 * - Chữ phụ:    #ADA2C5 (Lavender Mist)
 */
export const PALETTE = {
  bg: '#160E34',
  surface: '#292044',
  accent: '#E8BC79',
  textPrimary: '#F6F0E8',
  textSecondary: '#ADA2C5',
} as const;

export interface NumerologyCardsModalProps {
  visible: boolean;
  profile: ProfileItem | { fullName: string; birthDate: string } | null;
  onClose: () => void;
}

const CATEGORY_TABS: { key: 'all' | IndicatorCategory; label: string; labelEn: string }[] = [
  { key: 'all', label: 'Tất cả', labelEn: 'All' },
  { key: 'core', label: 'Cốt lõi', labelEn: 'Core' },
  { key: 'potential', label: 'Tiềm năng', labelEn: 'Potential' },
  { key: 'karmic', label: 'Nợ nghiệp', labelEn: 'Karma' },
  { key: 'bridge', label: 'Cầu nối', labelEn: 'Bridges' },
  { key: 'cycle', label: 'Vận hạn', labelEn: 'Cycles' },
  { key: 'chart', label: 'Biểu đồ', labelEn: 'Charts' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Kích thước lá bài chuẩn Tarot 1 : 1.58
const CARD_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.62), 260);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.58);
const CARD_SPACING = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

export const NumerologyCardsModal: React.FC<NumerologyCardsModalProps> = ({
  visible,
  profile,
  onClose,
}) => {
  const { locale, l, t } = useLocalization();
  const [selectedCategory, setSelectedCategory] = useState<'all' | IndicatorCategory>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndicatorForDetail, setSelectedIndicatorForDetail] = useState<CalculatedIndicator | null>(null);
  const [isFigureModalOpen, setIsFigureModalOpen] = useState(false);
  const [matchedFigure, setMatchedFigure] = useState<RepresentativeItem | null>(null);
  const [loadingFigure, setLoadingFigure] = useState(false);
  const [englishSummary, setEnglishSummary] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<CalculatedIndicator>>(null);

  const indicators = useMemo(() => {
    if (!profile) return [];
    return calculate24Indicators(profile.fullName, profile.birthDate);
  }, [profile?.fullName, profile?.birthDate]);

  // Tìm nhân vật có chung 3 chỉ số cốt lõi (Đường đời, Sứ mệnh, Linh hồn)
  const handleFindFigure = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFigureModalOpen(true);
    setLoadingFigure(true);

    try {
      const lpInd = indicators.find((i) => i.key === 'walksOfLife');
      const expInd = indicators.find((i) => i.key === 'mission');
      const suInd = indicators.find((i) => i.key === 'soul');

      const lifePath = Number(lpInd?.value) || 1;
      const expression = Number(expInd?.value) || 1;
      const soulUrge = Number(suInd?.value) || 1;

      const rep = await getRepresentativeByTriple(lifePath, expression, soulUrge);
      setMatchedFigure(rep);
    } catch (err) {
      console.warn('Lỗi khi truy vấn nhân vật đồng điệu:', err);
      setMatchedFigure(null);
    } finally {
      setLoadingFigure(false);
    }
  }, [indicators]);

  const filteredIndicators = useMemo(() => {
    if (selectedCategory === 'all') return indicators;
    return indicators.filter((item) => item.category === selectedCategory);
  }, [indicators, selectedCategory]);

  // Cập nhật tab danh mục
  const selectCategory = (category: 'all' | IndicatorCategory) => {
    if (category !== selectedCategory) {
      void Haptics.selectionAsync();
      setSelectedCategory(category);
      setActiveIndex(0);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  // Bắt sự kiện khi lướt đổi lá bài trung tâm
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SNAP_INTERVAL);
      const clampedIndex = Math.max(0, Math.min(index, filteredIndicators.length - 1));
      if (clampedIndex !== activeIndex) {
        void Haptics.selectionAsync();
        setActiveIndex(clampedIndex);
      }
    },
    [activeIndex, filteredIndicators.length]
  );

  // Nhấn vào một lá bài: nếu là lá ở giữa thì mở chi tiết, nếu là lá 2 bên thì trượt vào giữa
  const handleCardPress = (index: number, item: CalculatedIndicator) => {
    if (index === activeIndex) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIndicatorForDetail(item);
    } else {
      void Haptics.selectionAsync();
      setActiveIndex(index);
      flatListRef.current?.scrollToOffset({ offset: index * SNAP_INTERVAL, animated: true });
    }
  };

  // Lá bài hiện đang được chọn ở giữa
  const currentIndicator = filteredIndicators[activeIndex] || filteredIndicators[0];
  useEffect(() => {
    let active = true;
    setEnglishSummary(null);
    if (visible && locale === 'en' && currentIndicator) {
      void getIndicatorReading(currentIndicator.key, currentIndicator.value, currentIndicator.nameEn, locale)
        .then((reading) => { if (active) setEnglishSummary(reading.overview); });
    }
    return () => { active = false; };
  }, [visible, locale, currentIndicator]);
  const shortSummary = currentIndicator ? getIndicatorShortSummary(currentIndicator) : '';
  const currentValueLabel = currentIndicator
    ? currentIndicator.chartData
      ? l('BIỂU ĐỒ CÁ NHÂN', 'PERSONAL CHART')
      : currentIndicator.key === 'karmicDebts' || currentIndicator.key === 'missingNumbers'
        ? l(`KẾT QUẢ ${currentIndicator.displayValue.toUpperCase()}`, `RESULT ${formatIndicatorDisplayValue(currentIndicator, locale).toUpperCase()}`)
        : l(`SỐ ${currentIndicator.displayValue}`, `NUMBER ${formatIndicatorDisplayValue(currentIndicator, locale)}`)
    : '';

  const renderCardItem = ({ item, index }: { item: CalculatedIndicator; index: number }) => {
    const isActive = index === activeIndex;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleCardPress(index, item)}
        style={[
          styles.cardOuterWrap,
          {
            width: CARD_WIDTH,
            marginRight: index === filteredIndicators.length - 1 ? 0 : CARD_SPACING,
          },
          !isActive && styles.cardInactiveWrap,
        ]}
      >
        <View style={[styles.cardFrame, isActive ? styles.cardFrameActive : styles.cardFrameInactive]}>
          {/* Card Artwork */}
          <Image source={item.image} style={styles.cardImage} resizeMode="cover" />

          {/* Viền đôi phong cách Tarot Cổ điển viền vàng */}
          <View
            style={[styles.cardInnerBorder, isActive && styles.cardInnerBorderActive]}
            pointerEvents="none"
          />

          {/* Dải Banner Tên Lá Bài Phong Cách Tarot Cổ Điển */}
          <View style={[styles.cardTarotBanner, isActive && styles.cardTarotBannerActive]}>
            <Text
              style={[styles.cardTarotBannerText, isActive && styles.cardTarotBannerTextActive]}
              numberOfLines={1}
            >
              {(locale === 'en' ? item.nameEn : item.nameVi).toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      {/* Background Vũ Trụ Numelyra Chuẩn 24 Chỉ Số */}
      <ImageBackground source={BG_NUMELYRA_24} style={styles.bgImage} resizeMode="cover">
        {/* Lớp phủ Gradient Tím Sâu Thẳm với tông #160E34 (Nền chính) */}
        <LinearGradient
          colors={['rgba(22, 14, 52, 0.45)', 'rgba(22, 14, 52, 0.65)', 'rgba(22, 14, 52, 0.88)']}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={PALETTE.bg} />

          {/* Top Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleFindFigure}
              style={styles.headerFigureQuickBtn}
              accessibilityRole="button"
              accessibilityLabel={l('Tìm nhân vật đồng điệu 3 chỉ số', 'Find a figure who shares your three core numbers')}
            >
              <Ionicons name="sparkles" size={12} color="#E8BC79" style={{ marginRight: 4 }} />
              <Text style={styles.headerFigureQuickText}>{l('Tri Kỷ 3 Số', '3-Number Match')}</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="sparkles" size={15} color={PALETTE.accent} style={{ marginRight: 6 }} />
                <Text style={styles.mainTitle}>{l('Bản Đồ Linh Hồn', 'Soul Map')}</Text>
              </View>
              <Text style={styles.subTitle}>{t('cards.title')}</Text>
            </View>

            {/* Nút đóng tròn tinh tế ở góc trên bên phải */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={l('Đóng', 'Close')}
            >
              <Ionicons name="close" size={18} color={PALETTE.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Category Pill Tabs */}
          <View style={styles.tabsWrapper}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORY_TABS}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.tabsContent}
              renderItem={({ item }) => {
                const isActive = selectedCategory === item.key;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => selectCategory(item.key)}
                    style={[styles.tabPill, isActive && styles.tabPillActive]}
                  >
                    <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                      {locale === 'en' ? item.labelEn : item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Horizontal Snapping Cards Carousel */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              horizontal
              data={filteredIndicators}
              keyExtractor={(item) => item.id}
              renderItem={renderCardItem}
              contentContainerStyle={[styles.cardsList, { paddingHorizontal: SIDE_PADDING }]}
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_INTERVAL}
              snapToAlignment="center"
              decelerationRate="fast"
              onMomentumScrollEnd={handleScrollEnd}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
            />
          </View>

          {/* Indicator Counter: ✦ 03 / 24 ✦ */}
          <View style={styles.counterRow}>
            <Text style={styles.counterText}>
              ✦ {String(activeIndex + 1).padStart(2, '0')} / {String(filteredIndicators.length).padStart(2, '0')} ✦
            </Text>
          </View>

          {/* Hairline Antique Starlight Gold Divider */}
          <View style={styles.hairlineDivider} />

          {/* Synchronized Insights Panel (Khu vực thông điệp luận giải) */}
          {currentIndicator && (
            <View style={styles.insightPanel}>
              {/* Category Tag + Con số (Điểm nhấn #E8BC79) */}
              <Text style={styles.insightCategoryTag}>
                {(locale === 'en' ? currentIndicator.categoryNameEn || 'Numerology' : currentIndicator.categoryNameVi).toUpperCase()} · {currentValueLabel}
              </Text>

              {/* Tên chỉ số (Chữ chính #F6F0E8) */}
              <Text style={styles.insightTitle} numberOfLines={1}>
                {locale === 'en' ? currentIndicator.nameEn : currentIndicator.nameVi}
              </Text>

              {/* Đúc kết nguyên mẫu 1-2 câu sâu sắc (Chữ phụ #ADA2C5) */}
              <Text style={styles.insightSummary} numberOfLines={2}>
                {locale === 'en' ? englishSummary ?? t('reading.loading') : shortSummary}
              </Text>

              {/* Cụm nút hành động: Nút Nổi Bật Tìm Người Chung 3 Chỉ Số + Nút Khám phá luận giải */}
              <View style={styles.insightActionsContainer}>
                <ThreeDButton
                  accessibilityLabel={l('Tìm nhân vật có cùng 3 chỉ số với bạn', 'Find a notable figure with the same three core numbers')}
                  label={l('Tìm người chung 3 chỉ số với bạn', 'Find your three-number match')}
                  leadingIcon={<Ionicons name="sparkles" size={14} color="#3B260D" />}
                  onPress={handleFindFigure}
                  shape="pill"
                  size="sm"
                  style={styles.findFigureButton}
                  trailingIcon={<Ionicons name="arrow-forward" size={14} color="#3B260D" />}
                  variant="gold"
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedIndicatorForDetail(currentIndicator);
                  }}
                  style={styles.exploreActionBtn}
                >
                  <Text style={styles.exploreActionText}>{l('Khám phá luận giải chỉ số này ↗', 'Explore this number ↗')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Indicator Detail Modal (Luận giải chi tiết đầy đủ khi bấm khám phá) */}
          <IndicatorDetailModal
            visible={!!selectedIndicatorForDetail}
            indicator={selectedIndicatorForDetail}
            onClose={() => setSelectedIndicatorForDetail(null)}
          />

          {/* Historical Figure Modal (Thẻ nhân vật lịch sử theo layout Dorian Gray) */}
          <HistoricalFigureModal
            visible={isFigureModalOpen}
            figure={matchedFigure}
            loading={loadingFigure}
            onClose={() => setIsFigureModalOpen(false)}
          />
        </SafeAreaView>
      </ImageBackground>
    </Modal>
  );
};

// Xuất khẩu thêm alias SoulMapScreen để có thể dùng như Screen độc lập nếu cần
export const SoulMapScreen = NumerologyCardsModal;

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) : 0,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerFigureQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 188, 121, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 188, 121, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  headerFigureQuickText: {
    color: '#E8BC79',
    fontSize: 11,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainTitle: {
    color: PALETTE.textPrimary, // #F6F0E8 Chữ chính
    fontSize: 21,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subTitle: {
    color: PALETTE.textSecondary, // #ADA2C5 Chữ phụ
    fontSize: 12.5,
    marginTop: 4,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PALETTE.surface, // #292044 Surface
    borderWidth: 1,
    borderColor: 'rgba(232, 188, 121, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsWrapper: {
    paddingVertical: 10,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: PALETTE.surface, // #292044 Surface
    borderWidth: 1,
    borderColor: 'rgba(173, 162, 197, 0.25)',
  },
  tabPillActive: {
    backgroundColor: PALETTE.accent, // #E8BC79 Điểm nhấn
    borderColor: PALETTE.accent,
  },
  tabPillText: {
    color: PALETTE.textSecondary, // #ADA2C5 Chữ phụ
    fontSize: 12.5,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: PALETTE.bg, // #160E34 Nền chính làm màu chữ trên pill active
    fontWeight: '800',
  },
  carouselContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cardsList: {
    alignItems: 'center',
  },
  cardOuterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInactiveWrap: {
    opacity: 0.68,
    transform: [{ scale: 0.92 }],
  },
  cardFrame: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    backgroundColor: PALETTE.surface, // #292044 Surface
    overflow: 'hidden',
    position: 'relative',
  },
  cardFrameInactive: {
    borderWidth: 1.2,
    borderColor: 'rgba(232, 188, 121, 0.35)',
  },
  cardFrameActive: {
    borderWidth: 2,
    borderColor: PALETTE.accent, // #E8BC79 Điểm nhấn
    ...Platform.select({
      ios: {
        shadowColor: PALETTE.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.42,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardInnerBorder: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(232, 188, 121, 0.35)',
    borderRadius: 12,
  },
  cardInnerBorderActive: {
    borderColor: 'rgba(232, 188, 121, 0.75)',
  },
  cardTarotBanner: {
    position: 'absolute',
    bottom: 8,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(41, 32, 68, 0.92)', // Surface translucent
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(232, 188, 121, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTarotBannerActive: {
    backgroundColor: PALETTE.surface, // #292044
    borderColor: PALETTE.accent, // #E8BC79
  },
  cardTarotBannerText: {
    color: PALETTE.textSecondary, // #ADA2C5
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardTarotBannerTextActive: {
    color: PALETTE.accent, // #E8BC79
  },
  counterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  counterText: {
    color: PALETTE.accent, // #E8BC79 Điểm nhấn
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: 'rgba(232, 188, 121, 0.25)', // #E8BC79 hairline
    marginHorizontal: 28,
    marginVertical: 4,
  },
  insightPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  insightCategoryTag: {
    color: PALETTE.accent, // #E8BC79 Điểm nhấn
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  insightTitle: {
    color: PALETTE.textPrimary, // #F6F0E8 Chữ chính
    fontSize: 25,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    letterSpacing: 0.4,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  insightSummary: {
    color: PALETTE.textSecondary, // #ADA2C5 Chữ phụ
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  exploreActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  exploreActionText: {
    color: PALETTE.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
  insightActionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    gap: 8,
  },
  findFigureButton: {
    alignSelf: 'center',
  },
});
