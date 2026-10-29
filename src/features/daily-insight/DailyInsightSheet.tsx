import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { DailyInsight } from './dailyInsight';
import type { DailyAstroMetricId } from '../../services/astro/dailyMetricEngine';
import { useLocalization } from '../../i18n/LocalizationContext';

const JOURNAL_TEMPLATE = require('../../../assets/Dreamy Purple Lined Journal Template.png');
const FLAME_MASCOT = require('../../../assets/giao_dien/daily-insight/flame-dreamy-mascot.png');
const TITLE_ENERGY_ART = require('../../../assets/giao_dien/daily-insight/title-energy-art.png');
const BADGE_VERSE = require('../../../assets/giao_dien/daily-insight/badge-verse.png');
const BADGE_MIRROR = require('../../../assets/giao_dien/daily-insight/badge-mirror.png');
const IS_WEB = Platform.OS === 'web';
const PAPER_FALLBACK_LINES = Array.from({ length: 24 }, (_, index) => index);

const METRIC_PRESENTATION = {
  energy: { labelKey: 'daily.metric.energy', icon: 'flash-outline', color: '#FF9E40' },
  emotion: { labelKey: 'daily.metric.emotion', icon: 'water-outline', color: '#4EA8DE' },
  focus: { labelKey: 'daily.metric.focus', icon: 'eye-outline', color: '#9D4EDD' },
  connection: { labelKey: 'daily.metric.connection', icon: 'heart-outline', color: '#E05780' },
} as const;

const PLANET_NAMES_VI: Record<string, string> = {
  Sun: 'Mặt Trời', Moon: 'Mặt Trăng', Mercury: 'Sao Thủy', Venus: 'Sao Kim', Mars: 'Sao Hỏa',
  Jupiter: 'Sao Mộc', Saturn: 'Sao Thổ', Uranus: 'Thiên Vương', Neptune: 'Hải Vương', Pluto: 'Diêm Vương',
};

interface Props {
  visible: boolean;
  insight: DailyInsight;
  fortune?: AstroFortuneSlip | null;
  fortuneLoading?: boolean;
  profileName?: string;
  onClose(): void;
  onAsk(question: string): void;
  backUnlocked?: boolean;
  onUnlockBack?(): Promise<boolean>;
}

export default function DailyInsightSheet({
  visible,
  insight,
  fortune,
  fortuneLoading = false,
  profileName,
  onClose,
  onAsk,
  backUnlocked = false,
  onUnlockBack,
}: Props) {
  const { t, l, formatDate, locale } = useLocalization();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [selectedMetric, setSelectedMetric] = useState<DailyAstroMetricId | null>(null);
  const [paperImageFailed, setPaperImageFailed] = useState(false);

  // 3D Flip animation value (0 = Page 1, 1 = Page 2)
  const flipAnim = useRef(new Animated.Value(0)).current;
  const backUnlockedRef = useRef(backUnlocked);
  const unlockBackRef = useRef(onUnlockBack);
  const currentPageRef = useRef<1 | 2>(currentPage);
  const unlockPendingRef = useRef(false);
  backUnlockedRef.current = backUnlocked;
  unlockBackRef.current = onUnlockBack;
  currentPageRef.current = currentPage;

  useEffect(() => {
    if (!visible) return;
    currentPageRef.current = 1;
    unlockPendingRef.current = false;
    flipAnim.setValue(0);
    setCurrentPage(1);
    setSelectedMetric(null);
    setPaperImageFailed(false);
  }, [flipAnim, insight.dateKey, insight.profileKey, visible]);

  const flipToPage = async (target: 1 | 2) => {
    if (target === currentPageRef.current || unlockPendingRef.current) return;
    if (target === 2 && !backUnlockedRef.current) {
      unlockPendingRef.current = true;
      try {
        const unlocked = await unlockBackRef.current?.();
        if (!unlocked) return;
        backUnlockedRef.current = true;
      } finally {
        unlockPendingRef.current = false;
      }
    }
    currentPageRef.current = target;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(flipAnim, {
      toValue: target === 2 ? 1 : 0,
      duration: 420,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(target);
    });
  };

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50 && currentPage === 1) {
          void flipToPage(2);
        } else if (gestureState.dx > 50 && currentPage === 2) {
          void flipToPage(1);
        }
      },
    })
  ).current;

  const date = new Date(`${insight.dateKey}T12:00:00`);
  const selectedMetricData = selectedMetric ? insight.astroMetrics.metrics[selectedMetric] : null;

  const formattedDate = formatDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const dateSubtitle = `${formattedDate} · Ngày ${insight.canChiDay}`;

  const isCompact = height < 750 || width < 360;
  const sheetWidth = Math.min(width - 24, 430);
  const availableHeight = height - insets.top - insets.bottom - 24;
  const sheetHeight = Math.min(availableHeight, sheetWidth * (1672 / 941));
  const paperTopInset = Math.max(24, Math.round(sheetHeight * 0.055));
  const paperBottomInset = Math.max(28, Math.round(sheetHeight * 0.07));

  // Page 1 3D transform (flips leftwards)
  const page1RotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-90deg', '-90deg'],
  });
  const page1Opacity = flipAnim.interpolate({
    inputRange: [0, 0.48, 0.5],
    outputRange: [1, 1, 0],
  });

  // Page 2 3D transform (opens from right)
  const page2RotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['90deg', '90deg', '0deg'],
  });
  const page2Opacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.52, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[
          styles.overlay,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel={t('common.close')}
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />

        <View style={[
          styles.sheetFrame,
          IS_WEB && styles.webSheetBackground,
          { width: sheetWidth, height: sheetHeight },
        ]}>
          {/* Code-rendered paper keeps the sheet readable while the large PNG loads or fails. */}
          {IS_WEB ? (
            <View pointerEvents="none" style={styles.paperFallback}>
              <View style={styles.paperMarginLine} />
              <View style={styles.paperRules}>
                {PAPER_FALLBACK_LINES.map((line) => (
                  <View key={line} style={styles.paperRule} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Background Notebook Template */}
          {(!IS_WEB || !paperImageFailed) ? (
            <Image
              accessible={false}
              cachePolicy={IS_WEB ? 'memory-disk' : undefined}
              contentFit="fill"
              loading={IS_WEB ? 'eager' : undefined}
              onError={IS_WEB ? () => setPaperImageFailed(true) : undefined}
              pointerEvents="none"
              priority={IS_WEB ? 'high' : undefined}
              source={JOURNAL_TEMPLATE}
              style={[StyleSheet.absoluteFill, IS_WEB && styles.paperImage]}
            />
          ) : null}

          {/* Close button touch target over template's circular X button */}
          <TouchableOpacity
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            activeOpacity={0.7}
            hitSlop={12}
            onPress={onClose}
            style={styles.closeTarget}
          >
            <View style={styles.closeInner}>
              <Ionicons color="#3E2468" name="close" size={20} />
            </View>
          </TouchableOpacity>

          {/* 3D Flippable Page Container */}
          <View
            style={[styles.pageFlipperWrapper, IS_WEB && styles.webPageContentLayer]}
            {...panResponder.panHandlers}
          >
            {/* TRANG 1: THÔNG ĐIỆP SỔ TAY */}
            <Animated.View
              pointerEvents={currentPage === 1 ? 'auto' : 'none'}
              style={[
                styles.pageWrapper,
                {
                  opacity: page1Opacity,
                  transform: [{ perspective: 1400 }, { rotateY: page1RotateY }],
                  zIndex: currentPage === 1 ? 2 : 1,
                },
              ]}
            >
              <ScrollView
                bounces={false}
                contentContainerStyle={[
                  styles.contentContainer,
                  isCompact && styles.contentContainerCompact,
                  styles.page1ContentContainer,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={[
                  styles.pageScroll,
                  { marginTop: paperTopInset, marginBottom: paperBottomInset },
                ]}
              >
                {/* Header: Eyebrow Badge */}
                <View style={styles.eyebrowRow}>
                  <View style={styles.eyebrowPillFallback}>
                    <Text style={styles.eyebrowRay}>˗ˏˋ</Text>
                    <Text style={styles.eyebrowTextFallback}>{t('daily.cardEyebrow').toUpperCase()}</Text>
                    <Text style={styles.eyebrowRay}>ˎˊ˗</Text>
                  </View>
                </View>

                {/* Header: Title "Năng lượng hôm nay" */}
                <View style={styles.titleRow}>
                  {locale === 'vi' ? (
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={TITLE_ENERGY_ART}
                      style={[styles.titleArt, isCompact && styles.titleArtCompact]}
                    />
                  ) : (
                    <View style={styles.titleFallbackRow}>
                      <Text style={styles.titleFallbackPurple}>{t('daily.cardTitle')}</Text>
                      <Text style={styles.titleHeartDoodle}> ♡</Text>
                    </View>
                  )}
                </View>

                {!!profileName && <Text style={styles.profileName}>{locale === 'en' ? 'For' : 'Dành cho'} {profileName}</Text>}

                {/* Header: Date Subtitle */}
                <View style={styles.dateRow}>
                  <Ionicons color="#7B56C7" name="star" size={10} style={styles.dateStar} />
                  <Text style={[styles.dateText, isCompact && styles.dateTextCompact]}>
                    {dateSubtitle}
                  </Text>
                </View>

                {/* Date Hand-drawn Underline with loop */}
                <View style={styles.flourishLineContainer}>
                  <View style={styles.flourishLine} />
                  <Text style={styles.flourishHeart}>♡</Text>
                </View>

                {/* Mascot Character Illustration */}
                <View style={[styles.mascotStage, isCompact && styles.mascotStageCompact]}>
                  <Image
                    accessibilityLabel="Flame Spirit Mascot"
                    contentFit="contain"
                    source={FLAME_MASCOT}
                    style={styles.mascotImage}
                  />
                </View>

                {fortuneLoading && !fortune ? (
                  <View style={styles.fortuneLoadingCard}>
                    <ActivityIndicator color="#7B56C7" size="small" />
                    <Text style={styles.fortuneLoadingText}>
                      {l(
                        'Tín hiệu vũ trụ đang về, chờ một chút nhé.',
                        'The universe is sending your message. Please wait a moment.',
                      )}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Section 1: LỜI THƠ HÔM NAY */}
                    <View style={styles.verseSection}>
                  <View style={styles.badgeRow}>
                    {locale === 'vi' ? (
                      <Image
                        accessible={false}
                        contentFit="contain"
                        source={BADGE_VERSE}
                        style={styles.badgeImage}
                      />
                    ) : (
                      <View style={styles.badgeFallbackPill}>
                        <Text style={styles.badgeFallbackText}>{t('daily.verse').toUpperCase()}</Text>
                        <Ionicons color="#7B56C7" name="leaf-outline" size={13} style={{ marginLeft: 6 }} />
                      </View>
                    )}
                  </View>

                  <Text style={[styles.verseText, isCompact && styles.verseTextCompact]}>
                    {fortune?.verse || insight.personality}
                  </Text>
                  <Text style={styles.verseHeartDoodle}>♡</Text>
                    </View>

                    {/* Section 2: LỜI NHẮN DÀNH CHO BẠN */}
                    <View style={styles.mirrorSection}>
                  <View style={styles.badgeRow}>
                    {locale === 'vi' ? (
                      <Image
                        accessible={false}
                        contentFit="contain"
                        source={BADGE_MIRROR}
                        style={styles.badgeMirrorImage}
                      />
                    ) : (
                      <View style={[styles.badgeFallbackPill, styles.badgeMirrorFallback]}>
                        <Text style={styles.badgeMirrorFallbackText}>♡ {t('daily.mirror').toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.mirrorText, isCompact && styles.mirrorTextCompact]}>
                    {fortune?.mirror || insight.personality}
                  </Text>
                    </View>
                  </>
                )}

                {/* Section 3: Four-pillar rhythm */}
                <View style={styles.metricsBox}>
                  <View style={styles.metricsHeaderRow}>
                    <Text style={styles.metricsTitle}>{locale === 'en' ? 'Four-pillar rhythm' : 'Nhịp điệu 4 trụ cột'}</Text>
                    <Text style={styles.metricsHint}>{locale === 'en' ? 'Tap to view aspects' : 'Chạm để xem góc chiếu'}</Text>
                  </View>
                  <View style={styles.metricsGrid}>
                    {(Object.keys(METRIC_PRESENTATION) as DailyAstroMetricId[]).map((id) => {
                      const presentation = METRIC_PRESENTATION[id];
                      const metric = insight.astroMetrics.metrics[id];
                      const selected = selectedMetric === id;
                      return (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          key={id}
                          onPress={() => setSelectedMetric((curr) => (curr === id ? null : id))}
                          style={[
                            styles.metricCard,
                            selected && {
                              borderColor: presentation.color,
                              backgroundColor: `${presentation.color}18`,
                            },
                          ]}
                        >
                          <View style={styles.metricTop}>
                            <Ionicons color={presentation.color} name={presentation.icon} size={15} />
                            <Text style={[styles.metricScore, { color: presentation.color }]}>
                              {metric.score}
                            </Text>
                          </View>
                          <Text style={styles.metricName}>{t(presentation.labelKey)}</Text>
                          <View style={styles.metricTrack}>
                            <View
                              style={[
                                styles.metricFill,
                                { backgroundColor: presentation.color, width: `${metric.score}%` },
                              ]}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selected Metric Detail Box */}
                  {!!selectedMetric && !!selectedMetricData && (
                    <View style={styles.metricDetailBox}>
                      <Text style={styles.metricDetailSummary}>{selectedMetricData.summary}</Text>
                      {selectedMetricData.evidence.map((item) => (
                        <Text
                          key={`${item.transitPlanet}-${item.natalPlanet}-${item.aspectType}`}
                          style={styles.metricEvidenceItem}
                        >
                          •{' '}
                          {locale === 'vi'
                            ? PLANET_NAMES_VI[item.transitPlanet] ?? item.transitPlanet
                            : item.transitPlanet}{' '}
                          {item.aspectName}{' '}
                          {locale === 'vi'
                            ? PLANET_NAMES_VI[item.natalPlanet] ?? item.natalPlanet
                            : item.natalPlanet}{' '}
                          ({item.orb.toFixed(1)}°)
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* Flip to Page 2 Bookmark Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { void flipToPage(2); }}
                  style={styles.pageFlipButton}
                >
                  <Text style={styles.pageFlipButtonText}>✦ {backUnlocked ? (locale === 'en' ? 'View Astrology & Cycles' : 'Xem Chiêm Tinh & Vận Hạn') : (locale === 'en' ? 'Unlock Daily Insight back' : 'Mở khóa mặt sau Daily Insight')}</Text>
                  <Ionicons color="#553A82" name="arrow-forward" size={14} />
                </TouchableOpacity>

                {/* Pagination Dots */}
                <View style={styles.paginationRow}>
                  <View style={[styles.paginationDot, styles.dotActive]} />
                  <TouchableOpacity hitSlop={10} onPress={() => { void flipToPage(2); }}>
                    <View style={[styles.paginationDot, styles.dotInactive]} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>

            {/* TRANG 2: CHIÊM TINH & VẬN HẠN */}
            <Animated.View
              pointerEvents={currentPage === 2 ? 'auto' : 'none'}
              style={[
                styles.pageWrapper,
                {
                  opacity: page2Opacity,
                  transform: [{ perspective: 1400 }, { rotateY: page2RotateY }],
                  zIndex: currentPage === 2 ? 2 : 1,
                },
              ]}
            >
              <ScrollView
                bounces={false}
                contentContainerStyle={[
                  styles.contentContainer,
                  isCompact && styles.contentContainerCompact,
                  styles.page2ContentContainer,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.pageScroll}
              >
                {/* Page 2 Header */}
                <View style={styles.p2EyebrowPill}>
                  <Text style={styles.p2EyebrowText}>— {locale === 'en' ? 'ASTROLOGY TODAY' : 'CHIÊM TINH HÔM NAY'} —</Text>
                </View>

                <Text style={styles.p2Title}>{locale === 'en' ? 'Energy Map' : 'Bản Đồ Năng Lượng'}</Text>
                <Text style={styles.p2Subtitle}>{dateSubtitle}</Text>

                {/* Lucky Color Sticky Note Banner */}
                <View style={styles.luckyColorCard}>
                  <View style={styles.tapeMint} />
                  <View style={styles.luckyColorRow}>
                    <View style={[styles.luckyColorDot, { backgroundColor: insight.luckyColor.hex }]} />
                    <View style={styles.luckyColorTextCol}>
                      <Text style={styles.luckyColorTitle}>
                        {t('daily.luckyColor')}:{' '}
                        <Text style={[styles.luckyColorName, { color: insight.luckyColor.hex }]}>
                          {insight.luckyColor.name}
                        </Text>
                      </Text>
                      {!!insight.luckyColor.evidence && (
                        <Text numberOfLines={1} style={styles.luckyColorEvidence}>
                          ✦ {insight.luckyColor.evidence}
                        </Text>
                      )}
                    </View>
                    <Ionicons color="#6A4E94" name="sparkles" size={14} style={{ opacity: 0.6 }} />
                  </View>
                </View>

                {/* Lucky time and auspicious directions */}
                <View style={styles.stickyNotesRow}>
                  {/* Note 1: Giờ tốt */}
                  <View style={[styles.stickyNote, styles.notePurple]}>
                    <View style={[styles.noteTape, styles.tapePurple]} />
                    <View style={styles.noteHeader}>
                      <View style={[styles.noteIconCircle, styles.iconCirclePurple]}>
                        <Ionicons color="#6141A8" name="time-outline" size={12} />
                      </View>
                      <Text numberOfLines={1} style={[styles.noteLabel, styles.labelPurple]}>
                        {t('daily.luckyTime')}:
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.noteValue}>
                      {insight.luckyTime?.range ?? t('daily.noLuckyTime')}
                    </Text>
                  </View>

                  {/* Note 2: Hướng vui */}
                  <View style={[styles.stickyNote, styles.notePink]}>
                    <View style={[styles.noteTape, styles.tapePink]} />
                    <View style={styles.noteHeader}>
                      <View style={[styles.noteIconCircle, styles.iconCirclePink]}>
                        <Ionicons color="#A33663" name="navigate-outline" size={11} />
                      </View>
                      <Text numberOfLines={1} style={[styles.noteLabel, styles.labelPink]}>
                        {t('daily.joyDirection')}:
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.noteValue}>
                      {insight.directions.joy}
                    </Text>
                  </View>

                  {/* Note 3: Hướng tài lộc */}
                  <View style={[styles.stickyNote, styles.noteYellow]}>
                    <View style={[styles.noteTape, styles.tapeYellow]} />
                    <View style={styles.noteHeader}>
                      <View style={[styles.noteIconCircle, styles.iconCircleYellow]}>
                        <Ionicons color="#946312" name="cash-outline" size={12} />
                      </View>
                      <Text numberOfLines={1} style={[styles.noteLabel, styles.labelYellow]}>
                        {t('daily.wealthDirection')}:
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.noteValue}>
                      {insight.directions.wealth}
                    </Text>
                  </View>
                </View>

                {/* Recommended & Avoid Guidance */}
                <View style={styles.guidanceRow}>
                  <View style={[styles.guidanceCard, styles.guidanceGood]}>
                    <Text style={styles.guidanceGoodTitle}>✓ {t('daily.recommended')}</Text>
                    {insight.recommended.slice(0, 3).map((item) => (
                      <Text key={item} numberOfLines={2} style={styles.guidanceItemText}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                  <View style={[styles.guidanceCard, styles.guidanceAvoid]}>
                    <Text style={styles.guidanceAvoidTitle}>× {t('daily.avoid')}</Text>
                    {insight.avoid.slice(0, 3).map((item) => (
                      <Text key={item} numberOfLines={2} style={styles.guidanceItemText}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                </View>

                {/* Evidence Basis: Can Chi */}
                <View style={styles.evidenceBox}>
                  <Text style={styles.evidenceLabel}>✦ {t('daily.canchiBasis')}</Text>
                  <Text style={styles.evidenceDesc}>{insight.canChiEvidence}</Text>
                </View>

                <View style={styles.page2ActionsRow}>
                  <TouchableOpacity
                    accessibilityLabel={t('daily.ask')}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={() => onAsk(insight.suggestedQuestions[0])}
                    style={[styles.pageFlipBackButton, styles.askButton]}
                  >
                    <Ionicons color="#735118" name="chatbubble-ellipses" size={12} />
                    <Text style={[styles.pageFlipBackButtonText, styles.askButtonText]}>
                      {t('daily.ask')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { void flipToPage(1); }}
                    style={styles.pageFlipBackButton}
                  >
                    <Ionicons color="#553A82" name="arrow-back" size={12} />
                    <Text style={styles.pageFlipBackButtonText}>{locale === 'en' ? 'Back to message' : 'Quay lại thông điệp'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Pagination Dots */}
                <View style={styles.paginationRow}>
                  <TouchableOpacity hitSlop={10} onPress={() => { void flipToPage(1); }}>
                    <View style={[styles.paginationDot, styles.dotInactive]} />
                  </TouchableOpacity>
                  <View style={[styles.paginationDot, styles.dotActive]} />
                </View>

                <Text style={styles.disclaimerText}>{t('daily.disclaimer')}</Text>
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 6, 32, 0.78)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    shadowColor: '#8C4BF5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  webSheetBackground: {
    backgroundColor: '#F8F1E7',
  },
  paperFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#F8F1E7',
    borderWidth: 1,
    borderColor: 'rgba(111, 77, 153, 0.32)',
  },
  paperImage: {
    zIndex: 1,
  },
  paperMarginLine: {
    position: 'absolute',
    top: '5%',
    bottom: '5%',
    left: '12%',
    width: 1,
    backgroundColor: 'rgba(197, 119, 133, 0.18)',
  },
  paperRules: {
    position: 'absolute',
    top: '8%',
    right: '7%',
    bottom: '6%',
    left: '13%',
    justifyContent: 'space-around',
  },
  paperRule: {
    height: 1,
    backgroundColor: 'rgba(102, 129, 170, 0.14)',
  },
  closeTarget: {
    position: 'absolute',
    top: '4.8%',
    right: '7.2%',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  closeInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#301852',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },

  // 3D Flip Wrapper
  pageFlipperWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webPageContentLayer: {
    zIndex: 2,
  },
  pageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  pageScroll: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },

  contentContainer: {
    paddingLeft: '13.5%', // Clearance for spiral binder ring punch holes
    paddingRight: '7.5%',
    paddingTop: '6.5%',
    paddingBottom: '8%',
    alignItems: 'center',
  },
  contentContainerCompact: {
    paddingTop: '5%',
    paddingBottom: '10%',
  },
  page1ContentContainer: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 36,
  },
  page2ContentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  // Eyebrow Badge
  eyebrowRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  eyebrowPillFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  eyebrowRay: {
    color: '#7E57C2',
    fontSize: 12,
    marginHorizontal: 4,
  },
  eyebrowTextFallback: {
    color: '#513C7B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // Title "Năng lượng hôm nay"
  titleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    marginBottom: 0,
  },
  titleArt: {
    width: 290,
    height: 54,
  },
  titleArtCompact: {
    width: 260,
    height: 48,
  },
  titleFallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleFallbackPurple: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '800',
    color: '#5A3896',
    fontStyle: 'italic',
  },
  titleHeartDoodle: {
    fontSize: 20,
    color: '#7E57C2',
  },

  // Date Subtitle
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  profileName: { color: '#6D3FA5', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  dateStar: {
    marginRight: 5,
  },
  dateText: {
    fontFamily: 'serif',
    fontSize: 12,
    fontWeight: '700',
    color: '#362452',
    letterSpacing: 0.2,
  },
  dateTextCompact: {
    fontSize: 11,
  },
  flourishLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '78%',
    marginTop: 2,
    marginBottom: 2,
  },
  flourishLine: {
    flex: 1,
    height: 1.2,
    backgroundColor: 'rgba(123, 86, 199, 0.45)',
    borderRadius: 1,
  },
  flourishHeart: {
    color: '#7B56C7',
    fontSize: 11,
    marginLeft: 3,
  },

  // Mascot Stage
  mascotStage: {
    width: '100%',
    height: 185,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  mascotStageCompact: {
    height: 155,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },

  fortuneLoadingCard: {
    width: '92%',
    minHeight: 112,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(123, 86, 199, 0.24)',
    borderRadius: 18,
    backgroundColor: 'rgba(246, 238, 255, 0.72)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fortuneLoadingText: {
    color: '#513C7B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Section 1: Lời thơ
  verseSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  badgeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeImage: {
    width: 175,
    height: 28,
  },
  badgeMirrorImage: {
    width: 250,
    height: 28,
  },
  badgeFallbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeFallbackText: {
    color: '#513C7B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  verseText: {
    fontFamily: 'serif',
    fontSize: 14.5,
    lineHeight: 22.5,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
    color: '#261742',
    paddingHorizontal: 10,
  },
  verseTextCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
  verseHeartDoodle: {
    alignSelf: 'flex-end',
    marginRight: 16,
    color: '#8E67D1',
    fontSize: 12,
    marginTop: -4,
  },

  // Section 2: Lời nhắn
  mirrorSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeMirrorFallback: {
    backgroundColor: '#FDE4EA',
  },
  badgeMirrorFallbackText: {
    color: '#9E3663',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mirrorText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: '#34264A',
    textAlign: 'center',
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  mirrorTextCompact: {
    fontSize: 10.5,
    lineHeight: 16.5,
  },

  // Bottom 3 Sticky Notes
  stickyNotesRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 7,
    marginTop: 2,
    marginBottom: 8,
  },
  stickyNote: {
    flex: 1,
    minHeight: 64,
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#3B1863',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  noteTape: {
    position: 'absolute',
    top: -5,
    width: 26,
    height: 8,
    borderRadius: 2,
    zIndex: 1,
  },
  notePurple: {
    backgroundColor: '#ECE8FB',
    borderColor: '#DDD4F5',
  },
  tapePurple: {
    backgroundColor: 'rgba(189, 169, 230, 0.72)',
  },
  notePink: {
    backgroundColor: '#FCEBF0',
    borderColor: '#F6D2DC',
  },
  tapePink: {
    backgroundColor: 'rgba(238, 178, 198, 0.72)',
  },
  noteYellow: {
    backgroundColor: '#FEF6D8',
    borderColor: '#F7E7B6',
  },
  tapeYellow: {
    backgroundColor: 'rgba(240, 212, 134, 0.72)',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  noteIconCircle: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePurple: {
    backgroundColor: '#E0D8F7',
  },
  iconCirclePink: {
    backgroundColor: '#F9D5E2',
  },
  iconCircleYellow: {
    backgroundColor: '#F9E7AD',
  },
  noteLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  labelPurple: {
    color: '#553E7E',
  },
  labelPink: {
    color: '#7D3352',
  },
  labelYellow: {
    color: '#735118',
  },
  noteValue: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#1D1137',
    textAlign: 'center',
  },

  // Lucky Color Card
  luckyColorCard: {
    width: '100%',
    backgroundColor: '#F3FBF7',
    borderColor: '#CCEADF',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 2,
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#204B3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tapeMint: {
    position: 'absolute',
    top: -5,
    width: 32,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(164, 222, 198, 0.75)',
    zIndex: 1,
  },
  luckyColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  luckyColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  luckyColorTextCol: {
    flex: 1,
  },
  luckyColorTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#315447',
  },
  luckyColorName: {
    fontWeight: '900',
    fontSize: 12,
  },
  luckyColorEvidence: {
    fontSize: 9.5,
    color: '#4B7363',
    marginTop: 1,
  },

  // Page 1 Flip Button
  pageFlipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(237, 231, 246, 0.85)',
    borderColor: '#D1C4E9',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  pageFlipButtonText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#553A82',
  },

  page2ActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginVertical: 4,
  },
  pageFlipBackButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(237, 231, 246, 0.85)',
    borderColor: '#D1C4E9',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  askButton: {
    backgroundColor: 'rgba(254, 246, 216, 0.9)',
    borderColor: '#F0D486',
  },
  pageFlipBackButtonText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#553A82',
    textAlign: 'center',
  },

  // Pagination Dots
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#7E57C2',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D1C4E9',
  },

  // PAGE 2 STYLES
  p2EyebrowPill: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  p2EyebrowText: {
    color: '#513C7B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  p2Title: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '800',
    color: '#5A3896',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  p2Subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B3A64',
    marginBottom: 10,
  },

  metricsBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(123, 86, 199, 0.22)',
    marginBottom: 10,
  },
  metricsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricsTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#3C2665',
  },
  metricsHint: {
    fontSize: 9,
    color: '#7E6B9B',
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 86, 199, 0.15)',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricScore: {
    fontSize: 12,
    fontWeight: '900',
  },
  metricName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4A356E',
    marginTop: 2,
  },
  metricTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#E8E1F5',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 2,
  },
  metricDetailBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F7F3FD',
    borderRadius: 8,
  },
  metricDetailSummary: {
    fontSize: 10,
    lineHeight: 15,
    color: '#3F2C5C',
    fontWeight: '600',
  },
  metricEvidenceItem: {
    fontSize: 9,
    color: '#6E5692',
    marginTop: 3,
  },

  // Guidance Row
  guidanceRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 7,
    marginBottom: 10,
  },
  guidanceCard: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
  },
  guidanceGood: {
    backgroundColor: '#EFFBF7',
    borderColor: '#B6E8D6',
  },
  guidanceAvoid: {
    backgroundColor: '#FDF2F7',
    borderColor: '#F3C5D9',
  },
  guidanceGoodTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15835C',
    marginBottom: 4,
  },
  guidanceAvoidTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B02A62',
    marginBottom: 4,
  },
  guidanceItemText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: '#3A2E4B',
  },

  // Evidence Box
  evidenceBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(123, 86, 199, 0.20)',
    marginBottom: 10,
  },
  evidenceLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#523B7C',
    marginBottom: 2,
  },
  evidenceDesc: {
    fontSize: 9,
    lineHeight: 14,
    color: '#4B3A64',
  },

  // Ask Button
  askButtonText: {
    color: '#735118',
  },

  disclaimerText: {
    fontSize: 8.5,
    lineHeight: 12,
    color: '#7E6B9B',
    textAlign: 'center',
    marginTop: 4,
  },
});
