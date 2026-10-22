import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DayActivities, DayDirection, HourInfo } from '../services/lunarService';
import { useLocalization } from '../i18n/LocalizationContext';

const HERO_BACKGROUND = require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/Celestial Moonlit Mountain Lake.png');
const SHEET_BACKGROUND = require('../../assets/giao_dien/giaodien1/setting/background.webp');

const HOUR_ASSETS: Record<string, ImageSourcePropType> = {
  Tý: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/mouse.png'),
  Sửu: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/cow.png'),
  Dần: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/tiger.png'),
  Mão: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/cat.png'),
  Thìn: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/dragon.png'),
  Tỵ: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/snake.png'),
  Ngọ: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/horse.png'),
  Mùi: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/goat.png'),
  Thân: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/monkey.png'),
  Dậu: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/chicken.png'),
  Tuất: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/dog.png'),
  Hợi: require('../../assets/giao_dien/giaodien1/calender_asset/hoursDetailAsset/optimized/pig.png'),
};

interface Props {
  visible: boolean;
  onClose: () => void;
  hours: HourInfo[];
  bestHour?: HourInfo | null;
  direction?: DayDirection;
  activities?: DayActivities;
  userZodiac?: string;
  sheetProgress: Animated.Value;
  contentScrollEnabled?: boolean;
  onSheetDragStart: () => void;
  onSheetDragMove: (translationY: number) => void;
  onSheetDragEnd: (translationY: number, velocityY: number) => void;
}

function findCurrentHour(hours: HourInfo[], currentHour = new Date().getHours()) {
  return hours.find((hour) => {
    if (hour.startHour === 23) return currentHour >= 23 || currentHour < 1;
    return currentHour >= hour.startHour && currentHour < hour.startHour + 2;
  }) ?? null;
}

function sameHour(left?: HourInfo | null, right?: HourInfo | null) {
  return Boolean(left && right && left.startHour === right.startHour && left.canChi === right.canChi);
}

function getDefaultHour(hours: HourInfo[], bestHour?: HourInfo | null) {
  if (bestHour) {
    return hours.find((hour) => sameHour(hour, bestHour)) ?? bestHour;
  }
  return findCurrentHour(hours) ?? hours[0] ?? null;
}

export default function HourDirectionSheet({
  visible,
  onClose,
  hours,
  bestHour,
  direction,
  activities,
  userZodiac = '',
  sheetProgress,
  contentScrollEnabled = true,
  onSheetDragStart,
  onSheetDragMove,
  onSheetDragEnd,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, l, locale } = useLocalization();
  const [selectedHour, setSelectedHour] = useState<HourInfo | null>(() => getDefaultHour(hours, bestHour));
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const sheetWidth = Math.min(width, 720);
  const sheetTop = Math.max(insets.top + 6, height * 0.05);
  const sheetHeight = Math.max(1, height - sheetTop);
  const compact = width < 360 || height < 650;
  const hourRows = useMemo(
    () => Array.from({ length: Math.ceil(hours.length / 3) }, (_, index) => hours.slice(index * 3, index * 3 + 3)),
    [hours],
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedHour(getDefaultHour(hours, bestHour));
    setActivitiesExpanded(false);
  }, [visible, hours, bestHour]);

  const dragResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 2 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: onSheetDragStart,
    onPanResponderMove: (_event, gesture) => onSheetDragMove(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => onSheetDragEnd(Math.max(0, gesture.dy), gesture.vy),
    onPanResponderTerminate: () => onSheetDragEnd(0, 0),
  }), [onSheetDragEnd, onSheetDragMove, onSheetDragStart]);

  if (!visible) return null;

  const activeHour = selectedHour ?? getDefaultHour(hours, bestHour);
  const activeAsset = activeHour ? HOUR_ASSETS[activeHour.name] : undefined;
  const isBestHour = sameHour(activeHour, bestHour);
  const heroTitle = isBestHour
    ? l('GIỜ XUẤT HÀNH ĐẠI CÁT', 'BEST DEPARTURE HOUR')
    : activeHour?.isHoangDao
      ? l('GIỜ HOÀNG ĐẠO', 'FAVORABLE HOUR')
      : l('GIỜ HẮC ĐẠO', 'CAUTIOUS HOUR');

  const closeWithFeedback = () => {
    void Haptics.selectionAsync();
    onClose();
  };

  const selectHour = (hour: HourInfo) => {
    if (sameHour(hour, activeHour)) return;
    void Haptics.selectionAsync();
    setSelectedHour(hour);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: sheetProgress }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={l('Đóng chi tiết giờ', 'Close hour details')} />

        <Animated.View
          style={[
            styles.sheet,
            {
              width: sheetWidth,
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 10),
              transform: [{
                translateY: sheetProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sheetHeight, 0],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          <Image source={SHEET_BACKGROUND} resizeMode="cover" style={styles.sheetBackground} />
          <LinearGradient
            colors={['rgba(33,16,100,0.30)', 'rgba(18,10,72,0.50)', 'rgba(8,5,47,0.72)']}
            locations={[0, 0.48, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View collapsable={false} style={styles.dragHandleZone} {...dragResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={closeWithFeedback}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name="chevron-back" size={24} color="#FFE8BB" />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Ionicons name="moon" size={28} color="#FFD78A" />
              <View>
                <Text style={styles.headerEyebrow}>NUMELYRA CALENDAR</Text>
                <Text style={styles.headerTitle}>{l('Hoàng lịch & Cát hung', 'Almanac & daily fortune')}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.72}
              onPress={closeWithFeedback}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={22} color="#FFE8BB" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces
            nestedScrollEnabled
            scrollEnabled={contentScrollEnabled}
          >
            {activeHour ? (
              <View style={styles.heroCard}>
                <Image source={HERO_BACKGROUND} style={styles.heroBackground} resizeMode="cover" />
                <LinearGradient
                  colors={['rgba(255,238,220,0.94)', 'rgba(255,218,211,0.70)', 'rgba(78,24,130,0.08)']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0.2 }}
                  end={{ x: 1, y: 0.75 }}
                  style={styles.heroShade}
                />

                <View style={[styles.heroTop, compact && styles.heroTopCompact]}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroLabel}>{heroTitle}</Text>
                    <Text style={[styles.heroCanChi, compact && styles.heroCanChiCompact]}>{activeHour.canChi}</Text>
                    <Text style={styles.heroRange}>{activeHour.range.replace('-', ' – ')}</Text>
                    <View style={styles.heroStarRow}>
                      <Ionicons name="sparkles" size={17} color="#82396F" />
                      <View style={styles.heroStarCopy}>
                        <Text style={styles.heroStar}>{l('Sao', 'Star')} {activeHour.label}</Text>
                        <Text style={styles.heroFortune}>{activeHour.lyThuanPhong} · Lý Thuần Phong</Text>
                      </View>
                    </View>
                    {(activeHour.isClash || activeHour.isDayClash) ? (
                      <View style={styles.heroWarningPill}>
                        <Ionicons name="warning" size={12} color="#8B1E45" />
                        <Text style={styles.heroWarningText}>
                          {activeHour.isClash ? `${l('Xung tuổi', 'Clashes with')} ${userZodiac}` : l('Nhật Phá', 'Day clash')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {activeAsset ? <Image source={activeAsset} resizeMode="contain" style={styles.heroAnimal} /> : null}
                </View>

                {direction ? (
                  <View style={styles.directionPanel}>
                    <View style={styles.directionColumn}>
                      <View style={styles.directionIcon}>
                        <Ionicons name="compass-outline" size={21} color="#6D347C" />
                      </View>
                      <View>
                        <Text style={styles.directionLabel}>{l('Hỷ Thần', 'Joy direction')}</Text>
                        <Text style={styles.directionValue}>{direction.hyThan}</Text>
                      </View>
                    </View>
                    <View style={styles.directionDivider} />
                    <View style={styles.directionColumn}>
                      <View style={[styles.directionIcon, styles.directionIconGold]}>
                        <Ionicons name="sunny-outline" size={21} color="#9A5C17" />
                      </View>
                      <View>
                        <Text style={styles.directionLabel}>{l('Tài Thần', 'Wealth direction')}</Text>
                        <Text style={styles.directionValue}>{direction.taiThan}</Text>
                      </View>
                    </View>
                    <View style={styles.hacThanRow}>
                      <Ionicons name={direction.hacThan ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={13} color={direction.hacThan ? '#A13A57' : '#377A5D'} />
                      <Text style={[styles.hacThanText, !direction.hacThan && styles.hacThanSafe]}>
                        {direction.hacThan ? `${l('Tránh Hạc Thần hướng', 'Avoid the harmful direction')} ${direction.hacThan}` : l('Hạc Thần tại thiên · Không có hướng cần tránh', 'No direction needs to be avoided')}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>{l('12 CON GIÁP', '12 ZODIAC HOURS')}</Text>
              <Text style={styles.sectionHint}>{l('Chọn giờ để xem chi tiết →', 'Choose an hour for details →')}</Text>
            </View>

            <View style={styles.hourGrid}>
              {hourRows.map((row, rowIndex) => (
                <View key={`hour-row-${rowIndex}`} style={styles.hourRow}>
                  {row.map((hour) => {
                    const selected = sameHour(hour, activeHour);
                    const warning = hour.isClash || hour.isDayClash;
                    return (
                      <TouchableOpacity
                        key={`${hour.name}-${hour.startHour}`}
                        activeOpacity={0.78}
                        onPress={() => selectHour(hour)}
                        style={[
                          styles.hourCard,
                          { minHeight: compact ? 124 : 142 },
                          selected && styles.hourCardSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${hour.canChi}, ${hour.range}, ${hour.isHoangDao ? l('giờ tốt', 'favorable hour') : l('giờ xấu', 'cautious hour')}${hour.isClash ? `, ${l('xung tuổi', 'clashes with')} ${userZodiac}` : ''}${hour.isDayClash ? `, ${l('Nhật Phá', 'day clash')}` : ''}`}
                      >
                        <LinearGradient
                          colors={hour.isHoangDao
                            ? ['rgba(25,82,100,0.97)', 'rgba(14,57,72,0.99)']
                            : ['rgba(73,35,104,0.97)', 'rgba(41,24,74,0.99)']}
                          style={styles.hourCardGradient}
                        >
                          {warning ? (
                            <View style={styles.cardWarning}>
                              <Ionicons name="warning" size={11} color="#FFD49A" />
                            </View>
                          ) : null}
                          <Image source={HOUR_ASSETS[hour.name]} resizeMode="contain" style={[styles.cardAnimal, compact && styles.cardAnimalCompact]} />
                          <Text style={styles.cardName}>{hour.name}</Text>
                          <Text style={styles.cardRange}>{hour.range.replace('-', ' – ')}</Text>
                          <View style={[styles.statusBadge, hour.isHoangDao ? styles.statusGood : styles.statusBad]}>
                            <Text style={styles.statusText}>{hour.isHoangDao ? l('Tốt', 'Good') : l('Xấu', 'Caution')}</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {activities ? (
              <View style={styles.activitiesCard}>
                <TouchableOpacity
                  activeOpacity={0.76}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActivitiesExpanded((value) => !value);
                  }}
                  style={styles.activitiesToggle}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: activitiesExpanded }}
                  accessibilityLabel={`${activitiesExpanded ? l('Thu gọn', 'Collapse') : l('Mở', 'Open')} ${l('việc nên làm và kiêng cữ', 'favorable and unfavorable activities')}`}
                >
                  <View style={styles.activitiesTitleWrap}>
                    <View style={styles.activitiesIcon}>
                      <Ionicons name="calendar-outline" size={17} color="#442058" />
                    </View>
                    <View style={styles.activitiesCopy}>
                      <Text style={styles.activitiesTitle}>{l('CÁT HUNG TRONG NGÀY', 'DAILY GUIDANCE')}</Text>
                      <Text style={styles.activitiesSubtitle}>{l('Trực', 'Day officer')} {activities.trucName} · {activities.trucQuality}</Text>
                    </View>
                  </View>
                  <Ionicons name={activitiesExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#F4CD85" />
                </TouchableOpacity>

                {activitiesExpanded ? (
                  <View style={[styles.activitiesBody, compact && styles.activitiesBodyCompact]}>
                    <View style={styles.activityColumn}>
                      <View style={styles.activityHeader}>
                        <Ionicons name="checkmark-circle" size={17} color="#62E3AA" />
                        <Text style={styles.activityGoodTitle}>{l('NÊN LÀM', 'FAVORABLE')}</Text>
                      </View>
                      {activities.yi.map((item, index) => <Text key={`${index}-${item}`} style={styles.activityGoodItem}>• {item}</Text>)}
                    </View>
                    <View style={[styles.activityColumn, !compact && styles.activityBadColumn]}>
                      <View style={styles.activityHeader}>
                        <Ionicons name="close-circle" size={17} color="#F58AA8" />
                        <Text style={styles.activityBadTitle}>{l('KIÊNG CỮ', 'AVOID')}</Text>
                      </View>
                      {activities.ji.map((item, index) => <Text key={`${index}-${item}`} style={styles.activityBadItem}>• {item}</Text>)}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3, 2, 20, 0.82)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(215, 151, 255, 0.62)',
    shadowColor: '#050012',
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: 0.72,
    shadowRadius: 28,
    elevation: 28,
  },
  sheetBackground: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  dragHandleZone: { height: 20, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  dragHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(246, 207, 139, 0.76)' },
  header: { height: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(250, 206, 137, 0.18)' },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,236,196,0.10)', borderWidth: 1, borderColor: 'rgba(255,220,153,0.32)' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  headerEyebrow: { color: '#DDBAFF', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  headerTitle: { color: '#FFF0C9', fontSize: 16, lineHeight: 20, fontFamily: SERIF, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 30 },
  heroCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,170,232,0.74)', backgroundColor: '#FCD8D1', shadowColor: '#EF88EC', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 7 },
  heroBackground: { ...StyleSheet.absoluteFill, width: '100%', height: '76%' },
  heroShade: { ...StyleSheet.absoluteFill, bottom: '24%' },
  heroTop: { minHeight: 205, flexDirection: 'row', alignItems: 'stretch' },
  heroTopCompact: { minHeight: 185 },
  heroCopy: { width: '59%', paddingLeft: 18, paddingTop: 17, paddingBottom: 12, zIndex: 2 },
  heroLabel: { color: '#8F356B', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginBottom: 7 },
  heroCanChi: { color: '#181950', fontSize: 31, lineHeight: 35, fontFamily: SERIF, fontWeight: '700' },
  heroCanChiCompact: { fontSize: 27, lineHeight: 31 },
  heroRange: { color: '#181950', fontSize: 25, lineHeight: 30, fontFamily: SERIF, fontWeight: '700', marginBottom: 10 },
  heroStarRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroStarCopy: { flex: 1 },
  heroStar: { color: '#5A285F', fontSize: 12, fontWeight: '800' },
  heroFortune: { color: '#73456E', fontSize: 10, fontWeight: '700', marginTop: 2 },
  heroWarningPill: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,226,221,0.88)' },
  heroWarningText: { color: '#8B1E45', fontSize: 9, fontWeight: '800' },
  heroAnimal: { position: 'absolute', right: -8, bottom: 2, width: '47%', height: '96%' },
  directionPanel: { minHeight: 82, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 14, backgroundColor: 'rgba(255,235,215,0.96)', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  directionColumn: { flex: 1, minWidth: 115, flexDirection: 'row', alignItems: 'center', gap: 9 },
  directionDivider: { width: 1, height: 40, marginHorizontal: 10, backgroundColor: 'rgba(133,75,101,0.17)' },
  directionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7DDEA', borderWidth: 1, borderColor: '#D8A6C2' },
  directionIconGold: { backgroundColor: '#FFE4BB', borderColor: '#E8B76C' },
  directionLabel: { color: '#94627B', fontSize: 10, fontWeight: '700' },
  directionValue: { color: '#3B2856', fontSize: 13, fontWeight: '900', marginTop: 2 },
  hacThanRow: { width: '100%', marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  hacThanText: { color: '#A13A57', fontSize: 9, fontWeight: '700' },
  hacThanSafe: { color: '#377A5D' },
  sectionHeading: { marginTop: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: '#F6DDA0', fontSize: 20, fontFamily: SERIF, fontWeight: '700', textShadowColor: 'rgba(255,204,115,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  sectionHint: { color: '#C6A0D9', fontSize: 10, fontWeight: '600' },
  hourGrid: { gap: 8 },
  hourRow: { flexDirection: 'row', gap: 8 },
  hourCard: { flex: 1, minWidth: 0, borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(210,148,224,0.34)', backgroundColor: '#261946' },
  hourCardSelected: { borderWidth: 2, borderColor: '#FFD466', shadowColor: '#FFD466', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 9, elevation: 10 },
  hourCardGradient: { flex: 1, alignItems: 'center', paddingTop: 7, paddingBottom: 8, paddingHorizontal: 4 },
  cardWarning: { position: 'absolute', right: 6, top: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(142,55,68,0.88)', zIndex: 2 },
  cardAnimal: { width: 76, height: 76, marginBottom: -3 },
  cardAnimalCompact: { width: 62, height: 62 },
  cardName: { color: '#FFF0CF', fontSize: 15, lineHeight: 18, fontFamily: SERIF, fontWeight: '700' },
  cardRange: { color: '#D8C5E0', fontSize: 9, fontWeight: '700', marginTop: 1 },
  statusBadge: { marginTop: 5, minWidth: 52, paddingVertical: 3, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  statusGood: { backgroundColor: '#139B67' },
  statusBad: { backgroundColor: '#C34473' },
  statusText: { color: '#FFF7EB', fontSize: 10, fontWeight: '900' },
  activitiesCard: { marginTop: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212,155,255,0.34)', backgroundColor: 'rgba(33,19,69,0.92)' },
  activitiesToggle: { minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activitiesTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activitiesIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3C8E7' },
  activitiesCopy: { flex: 1 },
  activitiesTitle: { color: '#F7D996', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  activitiesSubtitle: { color: '#BFA8D2', fontSize: 10, marginTop: 2, textTransform: 'capitalize' },
  activitiesBody: { padding: 14, paddingTop: 4, flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(211,165,249,0.12)' },
  activitiesBodyCompact: { flexDirection: 'column' },
  activityColumn: { flex: 1 },
  activityBadColumn: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: 'rgba(207,168,235,0.16)' },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  activityGoodTitle: { color: '#62E3AA', fontSize: 11, fontWeight: '900' },
  activityBadTitle: { color: '#F58AA8', fontSize: 11, fontWeight: '900' },
  activityGoodItem: { color: '#C8F6DF', fontSize: 11, lineHeight: 17, marginBottom: 3 },
  activityBadItem: { color: '#FFD0DB', fontSize: 11, lineHeight: 17, marginBottom: 3 },
});
