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
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
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
  getPlanetGuidanceItems,
  getPrecisionMessage,
  getTodaySummaryCards,
  planetLabel,
  type AstrologyDetailTarget,
} from './astrologyPresentation';
import { ASTROLOGY_BACKGROUNDS, ASTROLOGY_UI_ICONS, PLANET_PNG } from './astrologyArtwork';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  profile: UserProfile | null;
  currentDate: Date;
  metadata?: PureAstroFeatureMetadata;
  fortune: AstroFortuneSlip | null;
  loading: boolean;
  error: string | null;
  calculationError: string | null;
  onBack(): void;
  onOpenProfile(): void;
  onOpenBirthData(): void;
  onOpenNatal(): void;
  onOpenDetail(target: AstrologyDetailTarget): void;
  onOpenInterpretation(): void;
  onRetry(): void;
  onShare(): void;
}

function makeWeek(date: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(date);
    value.setDate(date.getDate() + index - 3);
    return value;
  });
}

export function AstrologyTodayView({
  profile,
  currentDate,
  metadata,
  fortune,
  loading,
  error,
  calculationError,
  onBack,
  onOpenProfile,
  onOpenBirthData,
  onOpenNatal,
  onOpenDetail,
  onOpenInterpretation,
  onRetry,
  onShare,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const week = useMemo(() => makeWeek(currentDate), [currentDate]);
  const cards = useMemo(() => metadata ? getTodaySummaryCards(metadata) : [], [metadata]);
  const guidanceItems = useMemo(() => metadata ? getPlanetGuidanceItems(metadata) : [], [metadata]);
  const contentWidth = Math.min(720, width) - 24;
  const guidanceCardWidth = Math.max(156, Math.min(222, (contentWidth - 10) / 2));
  const dateTitle = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(currentDate);

  return (
    <AstrologyBackground variant="today">
      <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[astrologyUiStyles.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(124, insets.bottom + 112) }]}
      >
        {!profile && <AstrologyHeader title="Chiêm tinh" subtitle="Bầu trời riêng của bạn" onBack={onBack} />}
        {!profile ? (
          <MysticCard style={styles.missingCard}>
            <Ionicons name="person-circle-outline" size={42} color={ASTRO_COLORS.gold} />
            <Text style={styles.missingTitle}>Chưa có hồ sơ để dựng lá số</Text>
            <Text style={astrologyUiStyles.emptyText}>Chọn hoặc tạo một hồ sơ có ngày sinh để bắt đầu.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={onOpenProfile}>
              <Text style={styles.primaryButtonText}>Chọn hồ sơ</Text>
            </TouchableOpacity>
          </MysticCard>
        ) : (
          <AstrologySkyHero
            profile={profile}
            currentDate={currentDate}
            metadata={metadata}
            fortune={fortune}
            loading={loading}
            onBack={onBack}
            onProfilePress={onOpenProfile}
            onInterpretationPress={onOpenInterpretation}
            onShare={onShare}
          />
        )}

        {!!calculationError && (
          <MysticCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={21} color="#FF9EAE" />
            <View style={styles.flexCopy}>
              <Text style={styles.errorTitle}>Không thể dựng dữ liệu lá số</Text>
              <Text style={styles.errorBody}>{calculationError}</Text>
            </View>
          </MysticCard>
        )}

        {!!metadata && (
          <>
            <MysticCard style={styles.calendarCard}>
              <LinearGradient colors={[ASTRO_COLORS.paperLight, ASTRO_COLORS.paperDeep]} style={StyleSheet.absoluteFill} />
              <View style={styles.calendarHeader}>
                <View style={styles.flexCopy}>
                  <Text style={styles.calendarEyebrow}>HÔM NAY</Text>
                  <Text style={styles.calendarTitle}>{dateTitle}</Text>
                </View>
                <Image contentFit="contain" source={ASTROLOGY_UI_ICONS.calendar} style={styles.calendarIcon} />
              </View>
              <View style={styles.weekRow}>
                {week.map((date, index) => {
                  const isToday = index === 3;
                  return (
                    <View key={date.toISOString()} style={[styles.dayCell, isToday && styles.dayCellActive]}>
                      <Text style={[styles.dayName, isToday && styles.dayNameActive]}>
                        {new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date)}
                      </Text>
                      <Text style={[styles.dayNumber, isToday && styles.dayNumberActive]}>{date.getDate()}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.summaryGrid}>
                {cards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    accessibilityRole={card.target ? 'button' : undefined}
                    activeOpacity={card.target ? 0.78 : 1}
                    onPress={() => card.target && onOpenDetail(card.target)}
                    style={styles.summaryCard}
                  >
                    <View style={[styles.summaryIcon, { backgroundColor: `${card.color}22` }]}>
                      <Ionicons name={card.icon as IoniconName} size={17} color={card.color} />
                    </View>
                    <View style={styles.flexCopy}>
                      <Text style={styles.summaryTitle}>{card.title}</Text>
                      <Text numberOfLines={1} style={styles.summaryValue}>{card.value}</Text>
                      <Text numberOfLines={2} style={styles.summaryDetail}>{card.detail}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </MysticCard>

            {metadata.birthDataPrecision !== 'complete' && (
              <TouchableOpacity activeOpacity={0.8} onPress={onOpenBirthData} style={styles.precisionCard}>
                <Ionicons name="compass-outline" size={22} color={ASTRO_COLORS.cyan} />
                <View style={styles.flexCopy}>
                  <Text style={styles.precisionTitle}>Hoàn thiện dữ liệu lá số</Text>
                  <Text style={styles.precisionBody}>{getPrecisionMessage(metadata)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ASTRO_COLORS.gold} />
              </TouchableOpacity>
            )}

            <SectionHeading title="Dẫn đường hành tinh" eyebrow="Planetary Guidance" action="Lá số" onAction={onOpenNatal} />
            <FlatList
              accessibilityLabel="Danh sách mười hành tinh"
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
                    accessibilityLabel={`${planetLabel(item.id)}. ${item.aspectText}`}
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
                          <Text style={styles.guidanceTitle}>{planetLabel(item.id)}</Text>
                          <Text numberOfLines={1} style={styles.guidanceThemes}>{PLANET_INFO[item.id].themes.join(' · ')}</Text>
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
                  <Text style={styles.natalTitle}>Khám phá Natal Chart</Text>
                  <Text style={styles.natalSubtitle}>12 cung, vị trí hành tinh và các góc bản mệnh</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={30} color="#FFF2BD" />
              </LinearGradient>
            </TouchableOpacity>

            <SectionHeading title="Luận giải hôm nay" eyebrow="Today's Interpretation" />
            <TouchableOpacity activeOpacity={0.82} onPress={onOpenInterpretation} style={styles.interpretationCard}>
              <Ionicons name="sparkles" size={24} color={ASTRO_COLORS.gold} />
              <View style={styles.flexCopy}>
                <Text style={styles.interpretationTitle}>{fortune?.title ?? 'Bức tranh năng lượng hiện tại'}</Text>
                <Text numberOfLines={4} style={styles.interpretationBody}>{fortune?.mirror ?? metadata.vibeSummary}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D4C5FF" />
            </TouchableOpacity>
          </>
        )}

        {loading && !!metadata && !fortune && (
          <View style={styles.inlineStatus}>
            <ActivityIndicator size="small" color={ASTRO_COLORS.cyan} />
            <Text style={styles.inlineStatusText}>Đang tải phần luận giải trực tuyến…</Text>
          </View>
        )}

        {!!error && (
          <MysticCard style={styles.networkError}>
            <Ionicons name="cloud-offline-outline" size={22} color="#FFB0BE" />
            <View style={styles.flexCopy}>
              <Text style={styles.errorTitle}>Luận giải trực tuyến tạm gián đoạn</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
              <Ionicons name="reload" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </MysticCard>
        )}
      </ScrollView>
      <View style={[styles.bottomNav, { paddingBottom: Math.max(7, insets.bottom) }]}>
        {([
          ['today', 'Hôm nay', undefined],
          ['explore', 'Khám phá', onOpenNatal],
          ['journal', 'Nhật ký', onOpenInterpretation],
          ['profile', 'Hồ sơ', onOpenProfile],
        ] as const).map(([icon, label, handler]) => (
          <TouchableOpacity
            key={icon}
            accessibilityLabel={label}
            accessibilityRole="button"
            activeOpacity={handler ? 0.72 : 1}
            onPress={handler}
            style={styles.bottomNavItem}
          >
            <Image contentFit="contain" source={ASTROLOGY_UI_ICONS[icon]} style={[styles.bottomNavIcon, icon === 'today' && styles.bottomNavIconActive]} />
            <Text style={[styles.bottomNavLabel, icon === 'today' && styles.bottomNavLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  primaryButton: { minHeight: 46, marginTop: 8, paddingHorizontal: 22, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: ASTRO_COLORS.gold },
  primaryButtonText: { color: '#171137', fontWeight: '900' },
  errorCard: { marginTop: 14, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'flex-start', borderColor: 'rgba(255,130,153,0.42)' },
  errorTitle: { color: '#FFE9ED', fontSize: 13, fontWeight: '800' },
  errorBody: { color: '#DDBBC4', fontSize: 11, lineHeight: 16, marginTop: 4 },
  calendarCard: { marginTop: -48, padding: 16, borderRadius: 26, backgroundColor: ASTRO_COLORS.paper, borderColor: 'rgba(255,214,155,0.82)', zIndex: 30, shadowColor: '#090522', shadowOpacity: 0.34, shadowRadius: 22, elevation: 10 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  calendarIcon: { width: 23, height: 23 },
  calendarEyebrow: { color: '#7555A4', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  calendarTitle: { color: '#17174A', fontSize: 18, lineHeight: 23, fontFamily: 'serif', fontWeight: '900', marginTop: 2, textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(65,47,104,0.18)' },
  dayCell: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  dayCellActive: { backgroundColor: '#8657ED', shadowColor: '#7F47FF', shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
  dayName: { color: '#6B6288', fontSize: 9, textTransform: 'uppercase' },
  dayNameActive: { color: '#F8ECFF' },
  dayNumber: { color: '#20194B', fontSize: 15, fontWeight: '900', marginTop: 3 },
  dayNumberActive: { color: '#FFFFFF' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  summaryCard: { width: '48.8%', minHeight: 86, flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(77,55,121,0.12)' },
  summaryIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  summaryTitle: { color: '#65557A', fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase' },
  summaryValue: { color: '#1D174D', fontSize: 12.5, fontWeight: '900', marginTop: 2 },
  summaryDetail: { color: '#5F5477', fontSize: 9, lineHeight: 12.5, marginTop: 3 },
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
  interpretationCard: { minHeight: 98, flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, borderRadius: 21, backgroundColor: 'rgba(37,26,91,0.92)', borderWidth: 1, borderColor: 'rgba(215,177,255,0.35)' },
  interpretationTitle: { color: '#FFFFFF', fontSize: 15, fontFamily: 'serif', fontWeight: '800' },
  interpretationBody: { color: '#D5CEE9', fontSize: 12, lineHeight: 18, marginTop: 6 },
  inlineStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16 },
  inlineStatusText: { color: '#C7C6DB', fontSize: 12 },
  networkError: { marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: 'rgba(255,130,153,0.35)' },
  retryButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(122,70,159,0.7)' },
  bottomNav: { position: 'absolute', left: 12, right: 12, bottom: 0, minHeight: 70, maxWidth: 696, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 6, borderRadius: 26, backgroundColor: 'rgba(8,12,67,0.97)', borderWidth: 1, borderColor: 'rgba(201,167,255,0.32)', shadowColor: '#05031F', shadowOpacity: 0.54, shadowRadius: 16, elevation: 16 },
  bottomNavItem: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  bottomNavIcon: { width: 26, height: 26, opacity: 0.72 },
  bottomNavIconActive: { width: 29, height: 29, opacity: 1 },
  bottomNavLabel: { color: '#B7AED7', fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  bottomNavLabelActive: { color: ASTRO_COLORS.gold },
});
