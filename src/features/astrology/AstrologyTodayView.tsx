import React, { useMemo, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ThreeDButton from '../../components/ThreeDButton';
import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { AstroFortuneQuota } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import type { UserProfile } from '../../store/userProfile';
import { AstrologySkyHero } from './AstrologySkyHero';
import {
  ASTRO_COLORS,
  AstrologyBackground,
  AstrologyHeader,
  MysticCard,
  SectionHeading,
  astrologyUiStyles,
} from './AstrologyUi';
import {
  PLANET_INFO,
  ZODIAC_INFO,
  getPlanetGuidanceItems,
  getPrecisionMessage,
  getTodaySummaryCards,
  isZodiacId,
  planetLabel,
  planetThemes,
  type AstrologyDetailTarget,
} from './astrologyPresentation';
import {
  ASTROLOGY_BACKGROUNDS,
  ASTROLOGY_TODAY_ARTWORK,
  PLANET_PNG,
} from './astrologyArtwork';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  profile: UserProfile | null;
  isPrimaryProfile?: boolean;
  currentDate: Date;
  metadata?: PureAstroFeatureMetadata;
  fortune: AstroFortuneSlip | null;
  loading: boolean;
  fortuneQuota: AstroFortuneQuota | null;
  error: string | null;
  calculationError: string | null;
  onBack(): void;
  onOpenCalendar?(): void;
  onOpenProfile(): void;
  onOpenBirthData(): void;
  onOpenNatal(): void;
  onOpenDetail(target: AstrologyDetailTarget): void;
  onOpenInterpretation(): void;
  onRetry(): void;
}

interface WeekDayItem {
  date: Date;
  label: string;
  isToday: boolean;
}

function makeWeek(date: Date, locale: 'vi' | 'en'): WeekDayItem[] {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const labels = locale === 'en'
    ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    : ['TH 2', 'TH 3', 'TH 4', 'TH 5', 'TH 6', 'TH 7', 'CN'];

  return Array.from({ length: 7 }, (_, index) => {
    const val = new Date(monday);
    val.setDate(monday.getDate() + index);
    const isToday =
      val.getDate() === date.getDate() &&
      val.getMonth() === date.getMonth() &&
      val.getFullYear() === date.getFullYear();
    return {
      date: val,
      label: labels[index],
      isToday,
    };
  });
}

function formatDateTitle(date: Date, locale: string): string {
  if (locale === 'en') {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
  const weekdayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const weekday = weekdayNames[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${weekday}, ${day} Tháng ${month}, ${year}`;
}

export function AstrologyTodayView({
  profile,
  isPrimaryProfile = false,
  currentDate,
  metadata,
  fortune,
  loading,
  fortuneQuota,
  error,
  calculationError,
  onBack,
  onOpenCalendar,
  onOpenProfile,
  onOpenBirthData,
  onOpenNatal,
  onOpenDetail,
  onOpenInterpretation,
  onRetry,
}: Props) {
  const insets = useSafeAreaInsets();
  const { locale, t, l } = useLocalization();
  const { width } = useWindowDimensions();
  const week = useMemo(() => makeWeek(currentDate, locale), [currentDate, locale]);
  const cards = useMemo(() => metadata ? getTodaySummaryCards(metadata, locale) : [], [metadata, locale]);
  const guidanceItems = useMemo(() => metadata ? getPlanetGuidanceItems(metadata, locale) : [], [metadata, locale]);
  const contentWidth = Math.min(720, width) - 24;
  const guidanceCardWidth = Math.max(156, Math.min(222, (contentWidth - 10) / 2));
  const dateTitle = useMemo(() => formatDateTitle(currentDate, locale), [currentDate, locale]);

  const energyCard = useMemo(() => cards.find((c) => c.id === 'energy'), [cards]);
  const emotionCard = useMemo(() => cards.find((c) => c.id === 'emotion'), [cards]);
  const relationCard = useMemo(() => cards.find((c) => c.id === 'relationships'), [cards]);
  const actionCard = useMemo(() => cards.find((c) => c.id === 'actions'), [cards]);

  const fastActivityPercent = useMemo(() => {
    if (!metadata) return 51;
    return Math.round(metadata.scores.fastPlanetActivity * 100);
  }, [metadata]);

  const moonSignInfo = useMemo(() => {
    if (!metadata?.transitMoonSign || !isZodiacId(metadata.transitMoonSign)) return null;
    return ZODIAC_INFO[metadata.transitMoonSign];
  }, [metadata?.transitMoonSign]);

  const moonSignName = moonSignInfo
    ? locale === 'en' ? moonSignInfo.id : moonSignInfo.nameVi
    : (metadata?.transitMoonSign ?? (locale === 'en' ? 'Pisces' : 'Song Ngư'));
  const moonSignSymbol = moonSignInfo?.symbol ?? '♓';

  const actionDetailText = useMemo(() => {
    if (metadata?.dominantSignal === 'tension') {
      return l('Các góc ma sát đang trội hơn, phù hợp với việc rà soát lại kế hoạch.', 'Friction aspects prevail, ideal for reviewing plans.');
    }
    if (metadata?.dominantSignal === 'harmony') {
      return l('Các góc hỗ trợ đang chiếm ưu thế, thuận lợi cho việc triển khai dự định.', 'Harmonious aspects dominate, favorable for execution.');
    }
    if (metadata?.dominantSignal === 'conjunction') {
      return l('Các nguồn lực đang hội tụ mạnh mẽ, tập trung vào trọng tâm cần đẩy nhanh.', 'Resources converge strongly, focus on priorities.');
    }
    return actionCard?.detail ?? l('Nhịp hành động cân bằng, phù hợp để duy trì tiến độ ổn định.', 'Balanced action pace, suitable for steady progress.');
  }, [metadata?.dominantSignal, actionCard?.detail, l]);

  return (
    <AstrologyBackground variant="today">
      <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[astrologyUiStyles.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(38, insets.bottom + 26) }]}
      >
        {!profile && <AstrologyHeader title={t('astrology.title')} subtitle={t('astrology.subtitle')} onBack={onBack} />}
        {!profile ? (
          <MysticCard style={styles.missingCard}>
            <Ionicons name="person-circle-outline" size={42} color={ASTRO_COLORS.gold} />
            <Text style={styles.missingTitle}>{t('astrology.missingTitle')}</Text>
            <Text style={astrologyUiStyles.emptyText}>{t('astrology.missingBody')}</Text>
            <ThreeDButton
              label={t('astrology.chooseProfile')}
              onPress={onOpenProfile}
              shape="pill"
              style={styles.primaryButton3d}
              variant="gold"
            />
          </MysticCard>
        ) : (
          <AstrologySkyHero
            profile={profile}
            isPrimaryProfile={isPrimaryProfile}
            currentDate={currentDate}
            metadata={metadata}
            fortune={fortune}
            loading={loading}
            fortuneQuota={fortuneQuota}
            onBack={onBack}
            onProfilePress={onOpenProfile}
            onInterpretationPress={onOpenInterpretation}
          />
        )}

        {!!calculationError && (
          <MysticCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={21} color="#FF9EAE" />
            <View style={styles.flexCopy}>
              <Text style={styles.errorTitle}>{l('Không thể dựng dữ liệu lá số', 'Unable to build birth-chart data')}</Text>
              <Text style={styles.errorBody}>{calculationError}</Text>
            </View>
          </MysticCard>
        )}

        {!!metadata && (
          <>
            {/* Top Calendar Card */}
            <MysticCard style={styles.calendarCard}>
              <LinearGradient colors={[ASTRO_COLORS.paperLight, ASTRO_COLORS.paperDeep]} style={StyleSheet.absoluteFill} />
              <View style={styles.calendarHeaderRow}>
                <View style={styles.todayPill}>
                  <Text style={styles.todayPillSparkle}>✦</Text>
                  <Text style={styles.todayPillText}>{t('astrology.today')}</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={onOpenCalendar}
                  style={styles.calendarLinkBtn}
                >
                  <Ionicons name="calendar-outline" size={13} color="#5E487C" />
                  <Text style={styles.calendarLinkText}>{l('Xem lịch', 'View calendar')}</Text>
                  <Ionicons name="chevron-forward" size={12} color="#5E487C" />
                </TouchableOpacity>
              </View>

              <Text style={styles.calendarBigTitle}>{dateTitle}</Text>

              <View style={styles.weekRow}>
                {week.map((item) => (
                  <View
                    key={item.date.toISOString()}
                    style={[styles.dayCell, item.isToday && styles.dayCellActive]}
                  >
                    {item.isToday ? (
                      <LinearGradient
                        colors={['#CF3B78', '#EB578C']}
                        style={styles.activeDayGradient}
                      >
                        <Text style={styles.dayNameActive}>{item.label}</Text>
                        <Text style={styles.dayNumberActive}>{item.date.getDate()}</Text>
                        <View style={styles.activeDayDot} />
                      </LinearGradient>
                    ) : (
                      <View style={styles.inactiveDayInner}>
                        <Text style={styles.dayName}>{item.label}</Text>
                        <Text style={styles.dayNumber}>{item.date.getDate()}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </MysticCard>

            {/* Energy Card (Full width) */}
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={() => onOpenDetail({ kind: 'planet', id: 'Sun' })}
              style={styles.energyCard}
            >
              <LinearGradient colors={['#FFFBF5', '#FDF3E7']} style={StyleSheet.absoluteFill} />
              <View style={styles.energyLeftCol}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeCircle, { backgroundColor: '#9585EA' }]}>
                    <Text style={styles.badgeSparkle}>✦</Text>
                  </View>
                  <Text style={styles.cardCategoryTitle}>{l('Năng lượng hôm nay', "Today's Energy")}</Text>
                </View>

                  <Text style={styles.energyMainValue}>{energyCard?.value ?? l('Vừa', 'Balanced')}</Text>

                <View style={styles.progressBarRow}>
                  <View style={styles.progressBarTrack}>
                    <LinearGradient
                      colors={['#7A75D8', '#E36A9F']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${fastActivityPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.progressPercentText}>{fastActivityPercent}%</Text>
                </View>

                <Text style={styles.cardDetailText}>
                  {l('Nhịp hành tinh nhanh, phù hợp để duy trì sự cân bằng.', 'Fast planetary rhythm, suitable for maintaining balance.')}
                </Text>
              </View>

              <Image
                accessibilityElementsHidden
                source={ASTROLOGY_TODAY_ARTWORK.catSleeping}
                style={styles.catArtwork}
                contentFit="contain"
              />
            </TouchableOpacity>

            {/* 2-column row: Emotion & Relationships */}
            <View style={styles.twoCardsRow}>
              {/* Emotion Card */}
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => onOpenDetail({ kind: 'planet', id: 'Moon' })}
                style={styles.halfCard}
              >
                <LinearGradient colors={['#FFFBF5', '#FDF3E7']} style={StyleSheet.absoluteFill} />
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeCircle, { backgroundColor: '#A2E2FE' }]}>
                    <Ionicons name="moon" size={14} color="#0E98D9" />
                  </View>
                  <Text style={styles.cardCategoryTitle}>{l('Cảm xúc', 'Emotion')}</Text>
                </View>

                <View style={styles.zodiacValueRow}>
                  <Text style={styles.halfCardMainValue}>{moonSignName}</Text>
                  <View style={styles.zodiacSymbolBadge}>
                    <Text style={styles.zodiacSymbolText}>{moonSignSymbol}</Text>
                  </View>
                </View>

                <Text numberOfLines={3} style={styles.halfCardDetailText}>
                  {emotionCard?.detail ?? l('Không có góc Mặt Trăng chính nổi bật.', 'No notable major Moon aspects.')}
                </Text>

                <Image
                  accessibilityElementsHidden
                  source={ASTROLOGY_TODAY_ARTWORK.wavesWatercolor}
                  style={styles.waveArtwork}
                  contentFit="contain"
                />
              </TouchableOpacity>

              {/* Relationship Card */}
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => onOpenDetail({ kind: 'planet', id: 'Venus' })}
                style={styles.halfCard}
              >
                <LinearGradient colors={['#FFFBF5', '#FDF3E7']} style={StyleSheet.absoluteFill} />
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeCircle, { backgroundColor: '#FFD4E6' }]}>
                    <Ionicons name="heart" size={14} color="#E6437D" />
                  </View>
                  <Text style={styles.cardCategoryTitle}>{l('Quan hệ', 'Relationship')}</Text>
                </View>

                  <Text style={styles.halfCardMainValue}>{relationCard?.value ?? l('Nhịp ổn định', 'Steady rhythm')}</Text>

                <Text numberOfLines={3} style={styles.halfCardDetailText}>
                  {relationCard?.detail ?? l('Không có góc Sao Kim chính nổi bật.', 'No notable major Venus aspects.')}
                </Text>

                <Image
                  accessibilityElementsHidden
                  source={ASTROLOGY_TODAY_ARTWORK.heartFlower}
                  style={styles.heartArtwork}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Action Card (Full width) */}
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={() => actionCard?.target && onOpenDetail(actionCard.target)}
              style={styles.actionCard}
            >
              <LinearGradient colors={['#FFFBF5', '#FDF3E7']} style={StyleSheet.absoluteFill} />
              <View style={styles.actionLeftCol}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeCircle, { backgroundColor: '#FFE6CC' }]}>
                    <Ionicons name="paper-plane" size={14} color="#EE7B30" />
                  </View>
                  <Text style={styles.cardCategoryTitle}>{l('Hành động', 'Action')}</Text>
                </View>

                  <Text style={styles.actionMainValue}>{actionCard?.value ?? l('Cần điều chỉnh', 'Needs adjustment')}</Text>

                <Text numberOfLines={3} style={styles.cardDetailText}>
                  {actionDetailText}
                </Text>
              </View>

              <Image
                accessibilityElementsHidden
                source={ASTROLOGY_TODAY_ARTWORK.compassMap}
                style={styles.compassArtwork}
                contentFit="contain"
              />
            </TouchableOpacity>

            {metadata.birthDataPrecision !== 'complete' && (
              <TouchableOpacity activeOpacity={0.8} onPress={onOpenBirthData} style={styles.precisionCard}>
                <Ionicons name="compass-outline" size={22} color={ASTRO_COLORS.cyan} />
                <View style={styles.flexCopy}>
                  <Text style={styles.precisionTitle}>{t('astrology.completeData')}</Text>
                  <Text style={styles.precisionBody}>{getPrecisionMessage(metadata, locale)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ASTRO_COLORS.gold} />
              </TouchableOpacity>
            )}

            <SectionHeading title={t('astrology.planetaryGuidance')} eyebrow="Planetary Guidance" action={t('astrology.birthChart')} onAction={onOpenNatal} />
            <FlatList
              accessibilityLabel={l('Danh sách mười hành tinh', 'List of ten planets')}
              contentContainerStyle={styles.guidanceList}
              data={guidanceItems}
              decelerationRate="fast"
              horizontal
              initialNumToRender={3}
              keyExtractor={(item) => item.id}
              maxToRenderPerBatch={3}
              removeClippedSubviews
              renderItem={({ item }) => (
                  <TouchableOpacity
                    accessibilityLabel={`${planetLabel(item.id, locale)}. ${item.aspectText}`}
                    accessibilityRole="button"
                    activeOpacity={0.78}
                    onPress={() => onOpenDetail({ kind: 'planet', id: item.id })}
                    style={[styles.guidanceCard, { width: guidanceCardWidth }]}
                  >
                    <View style={styles.guidanceImage}>
                      <Image
                        accessibilityElementsHidden
                        contentFit="cover"
                        priority="low"
                        source={ASTROLOGY_BACKGROUNDS.planetDetail}
                        style={StyleSheet.absoluteFill}
                      />
                      <LinearGradient colors={['rgba(18,12,58,0.24)', 'rgba(12,11,68,0.68)']} style={StyleSheet.absoluteFill} />
                      <Image
                        accessibilityElementsHidden
                        cachePolicy="memory-disk"
                        contentFit="contain"
                        recyclingKey={item.id}
                        source={PLANET_PNG[item.id]}
                        style={styles.planetArtwork}
                      />
                      <View style={styles.guidanceImageHeader}>
                        <View>
                          <Text style={styles.guidanceTitle}>{planetLabel(item.id, locale)}</Text>
                          <Text numberOfLines={1} style={styles.guidanceThemes}>{planetThemes(item.id, locale).join(' · ')}</Text>
                        </View>
                        <Text style={styles.guidanceSymbol}>{PLANET_INFO[item.id].symbol}</Text>
                      </View>
                    </View>
                    <View style={styles.guidanceBody}>
                      <Text numberOfLines={3} style={styles.guidanceAspect}>{item.aspectText}</Text>
                      <Text style={styles.guidanceNature}>{item.natureLabel}</Text>
                    </View>
                    <View style={styles.guidanceArrow}><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></View>
                  </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={guidanceCardWidth + 10}
              windowSize={5}
            />

            <TouchableOpacity activeOpacity={0.84} onPress={onOpenNatal} style={styles.natalButton}>
              <LinearGradient colors={['#8C58F5', '#5D45CA', '#283B9E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.natalGradient}>
                <View style={styles.natalIcon}><Text style={styles.natalIconText}>✦</Text></View>
                <View style={styles.flexCopy}>
                  <Text style={styles.natalTitle}>{t('astrology.exploreNatal')}</Text>
                  <Text style={styles.natalSubtitle}>{t('astrology.exploreNatalBody')}</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={30} color="#FFF2BD" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {loading && !!metadata && !fortune && (
          <View style={styles.inlineStatus}>
            <ActivityIndicator size="small" color={ASTRO_COLORS.cyan} />
            <Text style={styles.inlineStatusText}>{t('astrology.loading')}</Text>
          </View>
        )}

        {!!error && (
          <MysticCard style={styles.networkError}>
            <Ionicons name="cloud-offline-outline" size={22} color="#FFB0BE" />
            <View style={styles.flexCopy}>
              <Text style={styles.errorTitle}>{t('astrology.offlineTitle')}</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
              <Ionicons name="reload" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </MysticCard>
        )}
      </ScrollView>
      </View>
    </AstrologyBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  flexCopy: { flex: 1 },
  missingCard: { marginTop: 20, padding: 24, alignItems: 'center', gap: 10 },
  missingTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  primaryButton3d: { marginTop: 8 },
  errorCard: { marginTop: 14, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'flex-start', borderColor: 'rgba(255,130,153,0.42)' },
  errorTitle: { color: '#FFE9ED', fontSize: 13, fontWeight: '800' },
  errorBody: { color: '#DDBBC4', fontSize: 11, lineHeight: 16, marginTop: 4 },
  calendarCard: {
    marginTop: -48,
    padding: 16,
    borderRadius: 26,
    backgroundColor: ASTRO_COLORS.paper,
    borderColor: 'rgba(255,214,155,0.85)',
    borderWidth: 1,
    zIndex: 30,
    shadowColor: '#090522',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  todayPillSparkle: {
    color: '#D24D7A',
    fontSize: 14,
    fontWeight: '700',
  },
  todayPillText: {
    color: '#D24D7A',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(94, 72, 124, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  calendarLinkText: {
    color: '#5E487C',
    fontSize: 11.5,
    fontWeight: '700',
  },
  calendarBigTitle: {
    color: '#17174A',
    fontSize: 21,
    lineHeight: 27,
    fontFamily: 'serif',
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  dayCell: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: {
    borderRadius: 20,
    shadowColor: '#CF3B78',
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 4,
  },
  activeDayGradient: {
    width: '100%',
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  activeDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 3,
  },
  inactiveDayInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayName: {
    color: '#7E7398',
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayNameActive: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayNumber: {
    color: '#1E184C',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  dayNumberActive: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },

  // Energy Card
  energyCard: {
    marginTop: 11,
    minHeight: 152,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    backgroundColor: ASTRO_COLORS.paper,
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.85)',
    shadowColor: '#090522',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  energyLeftCol: {
    flex: 1,
    paddingRight: 134,
    zIndex: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSparkle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardCategoryTitle: {
    color: '#5A4A6C',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  energyMainValue: {
    color: '#1C194D',
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '900',
    marginTop: 6,
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EFE2D3',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentText: {
    color: '#20194E',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
  },
  cardDetailText: {
    color: '#605270',
    fontSize: 11.5,
    lineHeight: 16.5,
    marginTop: 8,
    width: '100%',
  },
  catArtwork: {
    width: 136,
    height: 106,
    position: 'absolute',
    right: 5,
    bottom: 6,
  },

  // Two Cards Row
  twoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 11,
  },
  halfCard: {
    flex: 1,
    minHeight: 154,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 14,
    backgroundColor: ASTRO_COLORS.paper,
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.85)',
    shadowColor: '#090522',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 7,
  },
  zodiacValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  halfCardMainValue: {
    color: '#1C194D',
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '900',
  },
  zodiacSymbolBadge: {
    backgroundColor: '#E85B92',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  zodiacSymbolText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  halfCardDetailText: {
    color: '#655776',
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 6,
    zIndex: 2,
    paddingRight: 40,
  },
  waveArtwork: {
    width: 82,
    height: 56,
    position: 'absolute',
    right: 2,
    bottom: 2,
  },
  heartArtwork: {
    width: 62,
    height: 62,
    position: 'absolute',
    right: 4,
    bottom: 4,
  },

  // Action Card
  actionCard: {
    marginTop: 11,
    minHeight: 140,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    backgroundColor: ASTRO_COLORS.paper,
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.85)',
    shadowColor: '#090522',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLeftCol: {
    flex: 1,
    paddingRight: 136,
    zIndex: 2,
  },
  actionMainValue: {
    color: '#1C194D',
    fontSize: 21,
    fontFamily: 'serif',
    fontWeight: '900',
    marginTop: 6,
  },
  compassArtwork: {
    width: 140,
    height: 105,
    position: 'absolute',
    right: 4,
    bottom: 4,
  },
  precisionCard: { minHeight: 66, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 17, backgroundColor: 'rgba(20,42,91,0.88)', borderWidth: 1, borderColor: 'rgba(116,232,255,0.32)' },
  precisionTitle: { color: '#E9FBFF', fontSize: 13, fontWeight: '800' },
  precisionBody: { color: '#AFC5D9', fontSize: 10, lineHeight: 15, marginTop: 4 },
  guidanceList: { gap: 10, paddingRight: 18, paddingBottom: 5 },
  guidanceCard: { minHeight: 252, borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(31,23,93,0.94)', borderWidth: 1, borderColor: 'rgba(201,167,255,0.7)', shadowColor: '#8F5BFF', shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 },
  guidanceImage: { height: 158, justifyContent: 'flex-start', overflow: 'hidden' },
  planetArtwork: { position: 'absolute', width: '68%', height: '68%', alignSelf: 'center', bottom: 4 },
  guidanceImageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 13, zIndex: 2 },
  guidanceTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: 'serif', fontWeight: '900', textShadowColor: '#10052F', textShadowRadius: 5 },
  guidanceThemes: { maxWidth: 138, color: ASTRO_COLORS.pink, fontSize: 8, fontWeight: '900', letterSpacing: 0.65, textTransform: 'uppercase', marginTop: 3 },
  guidanceSymbol: { color: ASTRO_COLORS.gold, fontSize: 24, textShadowColor: '#5A2B8D', textShadowRadius: 7 },
  guidanceBody: { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },
  guidanceAspect: { color: '#F7F2FF', fontSize: 11, lineHeight: 16 },
  guidanceNature: { color: ASTRO_COLORS.cyan, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.85, textTransform: 'uppercase', marginTop: 6 },
  guidanceArrow: { position: 'absolute', right: 9, bottom: 9, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(123,83,213,0.88)' },
  natalButton: { marginTop: 18, borderRadius: 21, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,214,124,0.36)' },
  natalGradient: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  natalIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  natalIconText: { color: '#FFF1B8', fontSize: 27 },
  natalTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: 'serif', fontWeight: '800' },
  natalSubtitle: { color: '#DED7F6', fontSize: 11, lineHeight: 16, marginTop: 4 },
  inlineStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16 },
  inlineStatusText: { color: '#C7C6DB', fontSize: 12 },
  networkError: { marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: 'rgba(255,130,153,0.35)' },
  retryButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(122,70,159,0.7)' },
});
