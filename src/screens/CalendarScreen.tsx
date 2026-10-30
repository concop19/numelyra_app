import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { makeDaySnapshot, type HourInfo } from '../services/lunarService';
import { profileItemToUserProfile, type UserProfile } from '../store/userProfile';
import { useProfiles } from '../store/profileContext';
import { getDailyCaDao, type CaDaoItem } from '../db/cadaoService';
import BlocDetailModal, { type ModalType } from '../components/BlocDetailModal';
import CalendarMascotSprite from '../components/CalendarMascotSprite';
import FallingCherryPetals from '../components/FallingCherryPetals';
import HourDirectionSheet from '../components/HourDirectionSheet';
import ProfilePickerModal from '../components/ProfilePickerModal';
import { useLocalization } from '../i18n/LocalizationContext';

const BG_CALENDAR = require('../../assets/giao_dien/giaodien1/calender_asset/background/calendar_background_v2.webp');

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const LUNAR_MONTHS = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];
const HOUR_SHEET_SPRING = { useNativeDriver: true, damping: 26, stiffness: 170, mass: 1.05 } as const;

interface Props {
  profile: UserProfile;
  onBack?: () => void;
}

function moveDate(value: Date, amount: number, unit: 'day' | 'month') {
  const result = new Date(value);
  if (unit === 'day') {
    result.setDate(result.getDate() + amount);
    return result;
  }

  const targetMonth = new Date(result.getFullYear(), result.getMonth() + amount, 1);
  const lastDayOfTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  targetMonth.setDate(Math.min(result.getDate(), lastDayOfTargetMonth));
  targetMonth.setHours(result.getHours(), result.getMinutes(), result.getSeconds(), result.getMilliseconds());
  return targetMonth;
}

function isSameDay(left: Date, right: Date) {
  return left.getDate() === right.getDate()
    && left.getMonth() === right.getMonth()
    && left.getFullYear() === right.getFullYear();
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function findCurrentHour(hours: HourInfo[], hour: number) {
  return hours.find((item) => {
    if (item.startHour === 23) return hour >= 23 || hour < 1;
    return hour >= item.startHour && hour < item.startHour + 2;
  }) ?? null;
}

export default function CalendarScreen({ profile: primaryProfile, onBack }: Props) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { locale, t, l } = useLocalization();
  const { profiles, primaryProfileId, refreshProfiles } = useProfiles();
  const [viewProfileId, setViewProfileId] = useState(primaryProfileId);
  const [date, setDate] = useState(() => new Date());
  const [clock, setClock] = useState(() => new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [caDao, setCaDao] = useState<CaDaoItem | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [profilePickerVisible, setProfilePickerVisible] = useState(false);
  const [hourSheetVisible, setHourSheetVisible] = useState(false);
  const [isHourSheetDragging, setIsHourSheetDragging] = useState(false);
  const hourSheetProgress = useRef(new Animated.Value(0)).current;
  const hourSheetPullDistance = winHeight * 0.95;
  const viewProfileItem = profiles.find((item) => item.id === viewProfileId)
    ?? profiles.find((item) => item.id === primaryProfileId)
    ?? null;
  const profile = (viewProfileItem && profileItemToUserProfile(viewProfileItem)) || primaryProfile;
  const selectedProfiles = useMemo(() => viewProfileItem ? [viewProfileItem] : [], [viewProfileItem]);

  useFocusEffect(useCallback(() => {
    setViewProfileId(primaryProfileId);
  }, [primaryProfileId]));

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const compact = winWidth < 375;
  const snapshot = useMemo(
    () => makeDaySnapshot(date, { birthDate: profile?.birthDate, locale }),
    [date, profile?.birthDate, locale],
  );
  const {
    lunarDate: lunar,
    canChiDay,
    canChiMonth,
    canChiYear,
    hours,
    bestDepartureHour: bestHour,
    direction,
    activities,
    userZodiac: zodiac,
  } = snapshot;
  const pickerDays = useMemo(() => {
    const firstDayOffset = (new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1).getDay() + 6) % 7;
    return Array.from(
      { length: 42 },
      (_, index) => new Date(pickerDate.getFullYear(), pickerDate.getMonth(), index - firstDayOffset + 1),
    );
  }, [pickerDate]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!viewProfileItem && primaryProfileId) setViewProfileId(primaryProfileId);
  }, [primaryProfileId, viewProfileItem]);

  useEffect(() => {
    let active = true;
    getDailyCaDao(date)
      .then((item) => { if (active) setCaDao(item); })
      .catch(() => { if (active) setCaDao(null); });
    return () => { active = false; };
  }, [date]);

  const today = new Date();
  const isToday = isSameDay(date, today);
  const currentHour = findCurrentHour(hours, clock.getHours());
  const goodHourNames = hours.filter((item) => item.isHoangDao).map((item) => item.name).join(', ');
  const quote = caDao?.content || l('Uống nước nhớ nguồn', 'Remember the source when drinking water');
  const quoteSource = caDao?.category || l('Ca dao Việt Nam', 'Vietnamese proverb');
  const displayMonth = locale === 'en'
    ? new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)
    : MONTHS[month - 1];
  const displayWeekday = locale === 'en'
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase()
    : snapshot.weekdayVi.toUpperCase();

  const selectDate = (nextDate: Date) => {
    void Haptics.selectionAsync();
    setDate(nextDate);
  };

  const openDatePicker = () => {
    setPickerDate(date);
    setDatePickerVisible(true);
  };

  const openDetail = (type: Exclude<ModalType, null>) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType(type);
  };

  const closeHourSheet = () => {
    setIsHourSheetDragging(false);
    Animated.timing(hourSheetProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHourSheetVisible(false);
    });
  };

  const openHourSheet = () => {
    setIsHourSheetDragging(false);
    hourSheetProgress.stopAnimation();
    hourSheetProgress.setValue(0);
    setHourSheetVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(hourSheetProgress, { toValue: 1, ...HOUR_SHEET_SPRING }).start();
  };

  const finishHourSheetDrag = (translationY: number, velocityY: number) => {
    setIsHourSheetDragging(false);
    if (translationY > hourSheetPullDistance * 0.2 || velocityY > 0.55) {
      closeHourSheet();
      return;
    }
    Animated.spring(hourSheetProgress, { toValue: 1, ...HOUR_SHEET_SPRING }).start();
  };

  const hourPullResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy < -4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      hourSheetProgress.stopAnimation();
      hourSheetProgress.setValue(0);
      setIsHourSheetDragging(true);
    },
    onPanResponderMove: (_event, gesture) => {
      if (gesture.dy < 0) {
        setHourSheetVisible(true);
        hourSheetProgress.setValue(Math.min(1, -gesture.dy / hourSheetPullDistance));
      }
    },
    onPanResponderRelease: (_event, gesture) => {
      setIsHourSheetDragging(false);
      const progress = Math.min(1, Math.max(0, -gesture.dy / hourSheetPullDistance));
      if (progress > 0.18 || gesture.vy < -0.5) {
        setHourSheetVisible(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(hourSheetProgress, { toValue: 1, ...HOUR_SHEET_SPRING }).start();
      } else if (progress > 0) {
        closeHourSheet();
      }
    },
    onPanResponderTerminate: closeHourSheet,
  }), [hourSheetProgress, hourSheetPullDistance]);

  return (
    <View style={[styles.root, { width: winWidth, height: winHeight }]}>
      <View style={styles.background} pointerEvents="none">
        <Image source={BG_CALENDAR} style={styles.backgroundImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(10, 8, 58, 0.18)', 'rgba(39, 14, 96, 0.08)', 'rgba(12, 7, 55, 0.58)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <FallingCherryPetals />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="light" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 54, 70) }]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.72} style={styles.headerButton} onPress={onBack} accessibilityRole="button" accessibilityLabel={t('common.back')}>
              <Ionicons name="arrow-back" size={24} color="#FFF1DA" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.72}
              style={styles.profileChip}
              onPress={() => setProfilePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={l(`Chọn hồ sơ, hiện tại là ${profile.fullName}`, `Choose profile, currently ${profile.fullName}`)}
            >
              <Ionicons name="person-circle-outline" size={22} color="#FFD793" />
              <View style={styles.profileChipCopy}>
                <Text style={styles.profileChipLabel}>{l('Dành cho', 'For')}</Text>
                <Text numberOfLines={1} style={styles.profileChipName}>{profile.fullName}</Text>
              </View>
              {viewProfileId === primaryProfileId && <Text style={styles.primaryBadge}>{l('Tôi', 'Me')}</Text>}
              <Ionicons name="chevron-down" size={14} color="#FFF1DA" />
            </TouchableOpacity>
            <View style={styles.headerSideSpacer} />
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity activeOpacity={0.72} style={styles.monthArrow} onPress={() => selectDate(moveDate(date, -1, 'day'))} accessibilityRole="button" accessibilityLabel={l('Ngày trước', 'Previous day')}>
              <Ionicons name="chevron-back" size={24} color="#FFF1DA" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.78} style={styles.monthChip} onPress={openDatePicker} accessibilityRole="button" accessibilityLabel={l('Chọn ngày', 'Choose date')}>
              <Text style={styles.monthText}>{displayMonth} - {year}</Text>
              <Ionicons name="chevron-down" size={15} color="#FFF1DA" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.72} style={styles.monthArrow} onPress={() => selectDate(moveDate(date, 1, 'day'))} accessibilityRole="button" accessibilityLabel={l('Ngày sau', 'Next day')}>
              <Ionicons name="chevron-forward" size={24} color="#FFF1DA" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.78} style={[styles.todayPill, isToday && styles.todayPillActive]} onPress={() => selectDate(new Date())} accessibilityRole="button" accessibilityLabel={l('Trở về hôm nay', 'Return to today')}>
            <Ionicons name="sparkles" size={12} color="#5D287D" />
            <Text style={styles.todayPillText}>{locale === 'en' ? (isToday ? 'Today' : 'Back to today') : (isToday ? 'Hôm nay' : 'Về hôm nay')}</Text>
          </TouchableOpacity>

          <View style={styles.dateHero}>
            <Text style={[styles.dayNumber, compact && styles.dayNumberCompact]}>{day}</Text>
            <Text style={[styles.weekday, compact && styles.weekdayCompact]}>{displayWeekday}</Text>
            <View style={styles.dayDivider}>
              <View style={styles.dayDividerLine} />
              <Text style={styles.dayDividerStar}>✦</Text>
              <View style={styles.dayDividerLine} />
            </View>
          </View>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteOrnament}>✦</Text>
            <Text style={styles.quoteText}>“{quote}”</Text>
            <Text style={styles.quoteSource}>— {quoteSource} —</Text>
            <Text style={[styles.quoteOrnament, styles.quoteOrnamentRight]}>✦</Text>
          </View>

          <View style={styles.mascotScene}>
            <CalendarMascotSprite size={compact ? 94 : 108} />
          </View>

          <View style={[styles.infoRow, compact && styles.infoRowCompact]}>
            <TouchableOpacity activeOpacity={0.82} style={[styles.infoCard, styles.timeCard]} onPress={openHourSheet} accessibilityRole="button" accessibilityLabel={l('Mở chi tiết giờ hoàng đạo', 'Open favorable-hour details')}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardIcon}><Ionicons name="time-outline" size={20} color="#38206F" /></View>
                <View>
                  <Text style={styles.cardTitle}>{locale === 'en' ? 'TIME' : 'GIỜ'}</Text>
                  <Text style={styles.cardSubTitle}>{currentHour ? `${locale === 'en' ? 'Hour' : 'Giờ'} ${currentHour.name}` : (locale === 'en' ? 'Now' : 'Hiện tại')}</Text>
                </View>
              </View>
              <Text style={[styles.clockText, compact && styles.clockTextCompact]}>{formatClock(clock)}</Text>
              <Text style={styles.goodHoursLabel}>{locale === 'en' ? 'Favorable hours' : 'Giờ Hoàng Đạo'}</Text>
              <Text style={styles.goodHoursText} numberOfLines={3}>{goodHourNames}</Text>
            </TouchableOpacity>

            <View style={[styles.infoCard, styles.solarCard]}>
              <View style={[styles.cardIcon, styles.cardIconCentered]}><Ionicons name="calendar-outline" size={21} color="#542368" /></View>
              <Text style={[styles.solarDay, compact && styles.solarDayCompact]}>{day}</Text>
              <Text style={styles.solarMonth}>{locale === 'en' ? displayMonth.toUpperCase() : `THÁNG ${month}`}</Text>
              <View style={styles.cardRule} />
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: snapshot.dayHoangDaoStatus.isHoangDao ? '#F5B82E' : '#9B70C9' }]} />
                <Text style={styles.statusText} numberOfLines={2}>{locale === 'en' ? (snapshot.dayHoangDaoStatus.isHoangDao ? 'Favorable day' : 'Cautious day') : (snapshot.dayHoangDaoStatus.isHoangDao ? 'Ngày Hoàng Đạo' : 'Ngày Hắc Đạo')}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.infoCard, styles.lunarCard]}
              onPress={() => openDetail('lunar_destiny')}
              accessibilityRole="button"
              accessibilityLabel={l('Mở chi tiết âm lịch và bản mệnh', 'Open lunar calendar and destiny details')}
            >
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIcon, styles.moonIcon]}><Ionicons name="moon" size={18} color="#A73F74" /></View>
                <Text style={styles.cardTitle}>{locale === 'en' ? 'LUNAR DATE' : 'ÂM LỊCH'}</Text>
              </View>
              <View style={styles.lunarCopy}>
                <Text style={styles.lunarLine} numberOfLines={2}>{locale === 'en' ? 'Year' : 'Năm'} {canChiYear}</Text>
                <View style={styles.lunarRule} />
                <Text style={styles.lunarLine} numberOfLines={2}>{locale === 'en' ? 'Month' : 'Tháng'} {canChiMonth}</Text>
                <View style={styles.lunarRule} />
                <Text style={[styles.lunarLine, styles.lunarLineStrong]} numberOfLines={2}>{locale === 'en' ? 'Day' : 'Ngày'} {canChiDay}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.lunarDateCaption}>{locale === 'en' ? `Lunar day ${lunar.day}, month ${lunar.month}, ${lunar.year}` : `${lunar.day} tháng ${LUNAR_MONTHS[lunar.month - 1]} năm ${lunar.year} · Âm lịch`}</Text>
        </ScrollView>

        <TouchableOpacity activeOpacity={0.86} style={[styles.hourPullTrigger, { bottom: Math.max(7, insets.bottom + 3) }]} onPress={openHourSheet} accessibilityRole="button" accessibilityLabel={l('Kéo lên hoặc chạm để xem giờ hoàng đạo', 'Swipe up or tap to view favorable hours')} {...hourPullResponder.panHandlers}>
          <View style={styles.hourPullHandle} />
          <Text style={styles.hourPullText}>{locale === 'en' ? 'SWIPE UP FOR FAVORABLE HOURS' : 'KÉO LÊN XEM GIỜ HOÀNG ĐẠO'}</Text>
          <Ionicons name="chevron-up" size={13} color="#F8DCA0" />
        </TouchableOpacity>

        <Modal visible={datePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
          <View style={styles.datePickerBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setDatePickerVisible(false)} accessibilityLabel={l('Đóng bộ chọn ngày', 'Close date picker')} />
            <View style={styles.datePickerCard}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>{l('Chọn ngày', 'Choose date')}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setDatePickerVisible(false)} style={styles.datePickerClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                  <Ionicons name="close" size={20} color="#FCEBFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerMonthRow}>
                <TouchableOpacity activeOpacity={0.7} style={styles.datePickerArrow} onPress={() => setPickerDate((current) => moveDate(current, -1, 'month'))} accessibilityRole="button" accessibilityLabel={l('Tháng trước', 'Previous month')}>
                  <Ionicons name="chevron-back" size={19} color="#FFD793" />
                </TouchableOpacity>
                <Text style={styles.datePickerMonth}>{locale === 'en' ? new Intl.DateTimeFormat('en-US', { month: 'long' }).format(pickerDate) : MONTHS[pickerDate.getMonth()]} · {pickerDate.getFullYear()}</Text>
                <TouchableOpacity activeOpacity={0.7} style={styles.datePickerArrow} onPress={() => setPickerDate((current) => moveDate(current, 1, 'month'))} accessibilityRole="button" accessibilityLabel={l('Tháng sau', 'Next month')}>
                  <Ionicons name="chevron-forward" size={19} color="#FFD793" />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerWeekdays}>
                {(locale === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']).map((weekday) => <Text key={weekday} style={styles.datePickerWeekday}>{weekday}</Text>)}
              </View>
              <View style={styles.datePickerGrid}>
                {pickerDays.map((pickerDay) => {
                  const isCurrentMonth = pickerDay.getMonth() === pickerDate.getMonth();
                  const isSelected = isSameDay(pickerDay, date);
                  const isCurrentDay = isSameDay(pickerDay, new Date());
                  return (
                    <TouchableOpacity
                      key={`${pickerDay.getFullYear()}-${pickerDay.getMonth()}-${pickerDay.getDate()}`}
                      activeOpacity={0.7}
                      style={[styles.datePickerDay, isSelected && styles.datePickerDaySelected, !isCurrentMonth && styles.datePickerDayOutside]}
                      onPress={() => {
                        const nextDate = new Date(pickerDay);
                        nextDate.setHours(clock.getHours(), clock.getMinutes(), clock.getSeconds(), clock.getMilliseconds());
                        selectDate(nextDate);
                        setDatePickerVisible(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).format(pickerDay)}${isCurrentDay ? l(', hôm nay', ', today') : ''}`}
                    >
                      <Text style={[styles.datePickerDayText, !isCurrentMonth && styles.datePickerDayTextOutside, isSelected && styles.datePickerDayTextSelected, isCurrentDay && !isSelected && styles.datePickerDayTextToday]}>{pickerDay.getDate()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity activeOpacity={0.75} style={styles.datePickerToday} onPress={() => { selectDate(new Date()); setDatePickerVisible(false); }} accessibilityRole="button" accessibilityLabel={l('Chọn hôm nay', 'Choose today')}>
                <Text style={styles.datePickerTodayText}>{l('Hôm nay', 'Today')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <BlocDetailModal
          visible={modalType !== null}
          type={modalType}
          onClose={() => setModalType(null)}
          userZodiac={zodiac}
          canChiDay={canChiDay}
          canChiMonth={canChiMonth}
          canChiYear={canChiYear}
          solarTerm={snapshot.solarTerm}
          warning={snapshot.warning}
          profile={profile}
          userNguHanh={snapshot.userNguHanh}
          userNapAm={snapshot.userNapAm}
          dayHoangDaoStatus={snapshot.dayHoangDaoStatus}
          isLunarMonthFull={snapshot.isLunarMonthFull}
        />
        <HourDirectionSheet
          visible={hourSheetVisible}
          onClose={closeHourSheet}
          sheetProgress={hourSheetProgress}
          contentScrollEnabled={!isHourSheetDragging}
          onSheetDragStart={() => {
            hourSheetProgress.stopAnimation();
            setIsHourSheetDragging(true);
          }}
          onSheetDragMove={(translationY) => hourSheetProgress.setValue(Math.max(0, 1 - translationY / hourSheetPullDistance))}
          onSheetDragEnd={finishHourSheetDrag}
          hours={hours}
          bestHour={bestHour}
          direction={direction}
          activities={activities}
          userZodiac={zodiac}
        />
        <ProfilePickerModal
          visible={profilePickerVisible}
          selectedProfiles={selectedProfiles}
          allowCoupleMode={false}
          onClose={() => setProfilePickerVisible(false)}
          onProfilesSelected={(items) => {
            const selected = items[0];
            if (!selected) return;
            setViewProfileId(selected.id);
          }}
          managementMode="add-only"
          onProfilesChanged={refreshProfiles}
          primaryProfileId={primaryProfileId}
          title={l('Xem lịch cho ai?', 'Whose calendar?')}
        />
      </SafeAreaView>
    </View>
  );
}

const CARD_BACKGROUND = '#FFF2E3';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#130A45', overflow: 'hidden' },
  background: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  backgroundImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: 16 },
  header: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(239, 190, 255, 0.52)', backgroundColor: 'rgba(35, 15, 91, 0.58)', alignItems: 'center', justifyContent: 'center' },
  headerSideSpacer: { width: 42, height: 42 },
  profileChip: { flex: 1, maxWidth: 250, minHeight: 42, marginHorizontal: 8, paddingHorizontal: 10, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(239, 190, 255, 0.52)', backgroundColor: 'rgba(35, 15, 91, 0.72)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  profileChipCopy: { flex: 1, minWidth: 0 },
  profileChipLabel: { color: '#CDB6DF', fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileChipName: { color: '#FFF4E4', fontSize: 13, fontWeight: '800' },
  primaryBadge: { color: '#4B256F', backgroundColor: '#FFD793', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: '900', overflow: 'hidden' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 7 },
  monthArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(75, 38, 139, 0.82)', borderWidth: 1, borderColor: 'rgba(222, 139, 255, 0.58)', alignItems: 'center', justifyContent: 'center' },
  monthChip: { height: 42, minWidth: 190, paddingHorizontal: 24, borderRadius: 22, backgroundColor: 'rgba(76, 37, 139, 0.86)', borderWidth: 1, borderColor: 'rgba(240, 151, 255, 0.65)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#10052F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 10, elevation: 6 },
  monthText: { color: '#FFF4FF', fontSize: 17, fontWeight: '700' },
  todayPill: { alignSelf: 'center', marginTop: 7, minHeight: 28, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(255, 231, 179, 0.86)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  todayPillActive: { backgroundColor: '#FFE7B0' },
  todayPillText: { color: '#5D287D', fontSize: 11, fontWeight: '800' },
  dateHero: { alignItems: 'center', justifyContent: 'center', minHeight: 222, marginTop: 0 },
  dayNumber: { color: '#FFF4E4', fontSize: 150, lineHeight: 158, fontWeight: '800', letterSpacing: -9, textShadowColor: '#F5A1FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 17 },
  dayNumberCompact: { fontSize: 134, lineHeight: 143 },
  weekday: { marginTop: -18, color: '#FFF0DA', fontSize: 33, fontWeight: '800', letterSpacing: 2.5, textShadowColor: '#6A287E', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 9 },
  weekdayCompact: { fontSize: 29 },
  dayDivider: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDividerLine: { width: 70, height: 1, backgroundColor: 'rgba(255, 230, 179, 0.82)' },
  dayDividerStar: { color: '#FFD894', fontSize: 16 },
  quoteCard: { minHeight: 112, marginTop: 8, borderRadius: 24, backgroundColor: 'rgba(255, 242, 227, 0.96)', borderWidth: 2, borderColor: 'rgba(255, 196, 153, 0.86)', paddingHorizontal: 30, paddingVertical: 17, justifyContent: 'center', alignItems: 'center', shadowColor: '#3C0C72', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  quoteText: { color: '#301868', fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  quoteSource: { color: '#785083', fontSize: 12, fontWeight: '600', marginTop: 7, textAlign: 'center' },
  quoteOrnament: { position: 'absolute', top: 13, left: 15, color: '#F1A45C', fontSize: 16 },
  quoteOrnamentRight: { left: undefined, top: undefined, right: 15, bottom: 13 },
  mascotScene: { height: 116, alignItems: 'flex-start', justifyContent: 'flex-end', paddingLeft: 35, marginTop: 3 },
  infoRow: { minHeight: 170, flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  infoRowCompact: { gap: 6 },
  infoCard: { backgroundColor: CARD_BACKGROUND, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255, 193, 152, 0.86)', paddingHorizontal: 11, paddingVertical: 12, overflow: 'hidden', shadowColor: '#21074E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.34, shadowRadius: 13, elevation: 8 },
  timeCard: { flex: 1.08 },
  solarCard: { flex: 0.88, alignItems: 'center' },
  lunarCard: { flex: 1.12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardIcon: { width: 34, height: 34, borderRadius: 18, backgroundColor: '#FFDCC5', alignItems: 'center', justifyContent: 'center' },
  cardIconCentered: { width: 36, height: 36, alignSelf: 'center' },
  moonIcon: { backgroundColor: '#FFE0D2' },
  cardTitle: { color: '#321969', fontSize: 13, fontWeight: '900' },
  cardSubTitle: { color: '#664379', fontSize: 11, fontWeight: '600', marginTop: 1 },
  clockText: { color: '#32148B', fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -1, marginTop: 7 },
  clockTextCompact: { fontSize: 28 },
  goodHoursLabel: { color: '#A44473', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  goodHoursText: { color: '#77536F', fontSize: 10, lineHeight: 14, marginTop: 3 },
  solarDay: { color: '#C93D78', fontSize: 62, lineHeight: 68, fontWeight: '700', letterSpacing: -2, marginTop: 1 },
  solarDayCompact: { fontSize: 56 },
  solarMonth: { color: '#C33F70', fontSize: 13, fontWeight: '900' },
  cardRule: { width: '82%', height: 1, marginVertical: 7, backgroundColor: 'rgba(207, 108, 119, 0.34)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { flexShrink: 1, color: '#77536F', fontSize: 9, lineHeight: 12, textAlign: 'center' },
  lunarCopy: { marginTop: 13 },
  lunarLine: { color: '#72506D', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  lunarLineStrong: { color: '#50206C', fontWeight: '800' },
  lunarRule: { height: 1, marginVertical: 7, backgroundColor: 'rgba(207, 108, 119, 0.28)' },
  lunarDateCaption: { alignSelf: 'center', marginTop: 10, color: '#FCE4FF', fontSize: 11, fontWeight: '700', textShadowColor: '#1B083F', textShadowRadius: 5 },
  hourPullTrigger: { position: 'absolute', left: 54, right: 54, minHeight: 39, borderRadius: 20, paddingHorizontal: 13, backgroundColor: 'rgba(48, 23, 105, 0.96)', borderWidth: 1, borderColor: 'rgba(255, 211, 139, 0.62)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: '#07011E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.52, shadowRadius: 8, elevation: 12 },
  hourPullHandle: { width: 26, height: 3, borderRadius: 2, backgroundColor: '#F8DCA0' },
  hourPullText: { color: '#F8DCA0', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, backgroundColor: 'rgba(7, 4, 25, 0.78)' },
  datePickerCard: { width: '100%', maxWidth: 360, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(190, 126, 231, 0.7)', backgroundColor: '#211246', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, elevation: 18 },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  datePickerTitle: { color: '#FFF1FF', fontSize: 17, fontWeight: '800' },
  datePickerClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  datePickerMonthRow: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  datePickerArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A2069', alignItems: 'center', justifyContent: 'center' },
  datePickerMonth: { color: '#FFD793', fontSize: 15, fontWeight: '800' },
  datePickerWeekdays: { flexDirection: 'row', marginBottom: 4 },
  datePickerWeekday: { width: '14.2857%', color: '#C8A9DF', fontSize: 11, fontWeight: '700', textAlign: 'center', paddingVertical: 7 },
  datePickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  datePickerDay: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  datePickerDaySelected: { backgroundColor: '#8D4FB6' },
  datePickerDayOutside: { opacity: 0.45 },
  datePickerDayText: { color: '#FFF1FF', fontSize: 14, fontWeight: '600' },
  datePickerDayTextOutside: { color: '#B79BCB' },
  datePickerDayTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  datePickerDayTextToday: { color: '#FFD793', fontWeight: '900' },
  datePickerToday: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F2BC64' },
  datePickerTodayText: { color: '#2A1938', fontSize: 12, fontWeight: '800' },
});
