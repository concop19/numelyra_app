import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  getBestDepartureHour, getCanChiDay, getCanChiMonth, getCanChiYear, getDayActivities,
  getDayDirection, getDayOfWeekVi, getHoangDaoHours, getSolarTerm, getWeekInfo, solarToLunar,
} from '../services/lunarService';
import { getNguHanh, getZodiac, type UserProfile } from '../store/userProfile';
import { getDailyCaDao, type CaDaoItem } from '../db/cadaoService';
import { getDailyCalendarArt, type CalendarArtItem } from '../config/calendarArtConfig';
import BlocDetailModal, { type ModalType } from '../components/BlocDetailModal';

const HERO = require('../../assets/giao_dien/giaodien1/calender_asset/background/ChatGPT Image Sep 25, 2026, 11_00_36 PM (1).png');
const TOPIC = require('../../assets/giao_dien/giaodien1/calender_asset/background/ChatGPT Image Sep 25, 2026, 11_00_38 PM (3).png');

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const LUNAR_MONTHS = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];
// Sheet di chuyển gần 1:1 theo ngón tay, kèm lực cản rất nhẹ.
const CULTURE_SHEET_PULL_DISTANCE = Dimensions.get('window').height * 0.92;
const CULTURE_SHEET_SPRING = { useNativeDriver: true, damping: 26, stiffness: 170, mass: 1.05 } as const;

interface Props { profile: UserProfile; }

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

export default function CalendarScreen({ profile }: Props) {
  const [date, setDate] = useState(() => new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [caDao, setCaDao] = useState<CaDaoItem | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [cultureSheetVisible, setCultureSheetVisible] = useState(false);
  const [isCultureSheetDragging, setIsCultureSheetDragging] = useState(false);
  const cultureSheetProgress = useRef(new Animated.Value(0)).current;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const birthYear = profile?.birthDate ? new Date(profile.birthDate).getFullYear() : 1998;
  const zodiac = getZodiac(birthYear);
  const lunar = useMemo(() => solarToLunar(day, month, year), [day, month, year]);
  const canChiDay = useMemo(() => getCanChiDay(day, month, year), [day, month, year]);
  const canChiMonth = useMemo(() => getCanChiMonth(lunar.month, lunar.year), [lunar.month, lunar.year]);
  const canChiYear = useMemo(() => getCanChiYear(lunar.year), [lunar.year]);
  const hours = useMemo(() => getHoangDaoHours(day, month, year, zodiac), [day, month, year, zodiac]);
  const bestHour = useMemo(() => getBestDepartureHour(day, month, year, zodiac), [day, month, year, zodiac]);
  const direction = useMemo(() => getDayDirection(day, month, year), [day, month, year]);
  const activities = useMemo(() => getDayActivities(day, month, year), [day, month, year]);
  const art = useMemo(() => getDailyCalendarArt(date), [date]);
  const week = useMemo(() => getWeekInfo(date), [date]);
  const pickerDays = useMemo(() => {
    const firstDayOffset = (new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1).getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => new Date(pickerDate.getFullYear(), pickerDate.getMonth(), index - firstDayOffset + 1));
  }, [pickerDate]);

  useEffect(() => { getDailyCaDao(date).then(setCaDao).catch(() => setCaDao(null)); }, [date]);

  const today = new Date();
  const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
  const topicTitle = caDao?.category || 'Tình yêu đôi lứa';
  const topicExcerpt = caDao?.content || art.excerpt;
  const selectDate = (nextDate: Date) => {
    void Haptics.selectionAsync();
    setDate(nextDate);
  };
  const openDatePicker = () => {
    setPickerDate(date);
    setDatePickerVisible(true);
  };
  const openDetail = (type: ModalType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType(type);
  };
  const closeCultureSheet = () => {
    setIsCultureSheetDragging(false);
    Animated.timing(cultureSheetProgress, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setCultureSheetVisible(false);
    });
  };
  const openCultureSheet = () => {
    setIsCultureSheetDragging(false);
    cultureSheetProgress.stopAnimation();
    cultureSheetProgress.setValue(0);
    setCultureSheetVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(cultureSheetProgress, { toValue: 1, ...CULTURE_SHEET_SPRING }).start();
  };
  const beginCultureSheetDrag = () => {
    cultureSheetProgress.stopAnimation();
    setIsCultureSheetDragging(true);
  };
  const moveCultureSheetDown = (translationY: number) => {
    cultureSheetProgress.setValue(Math.max(0, 1 - translationY / CULTURE_SHEET_PULL_DISTANCE));
  };
  const finishCultureSheetDrag = (translationY: number, velocityY: number) => {
    setIsCultureSheetDragging(false);
    if (translationY > CULTURE_SHEET_PULL_DISTANCE * 0.2 || velocityY > 0.55) {
      closeCultureSheet();
      return;
    }
    Animated.spring(cultureSheetProgress, { toValue: 1, ...CULTURE_SHEET_SPRING }).start();
  };
  const culturePullResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => true,
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      cultureSheetProgress.stopAnimation();
      cultureSheetProgress.setValue(0);
      setIsCultureSheetDragging(true);
    },
    onPanResponderMove: (_event, gesture) => {
      if (gesture.dy < 0) {
        setCultureSheetVisible(true);
        cultureSheetProgress.setValue(Math.min(1, -gesture.dy / CULTURE_SHEET_PULL_DISTANCE));
      }
    },
    onPanResponderRelease: (_event, gesture) => {
      setIsCultureSheetDragging(false);
      const progress = Math.min(1, Math.max(0, -gesture.dy / CULTURE_SHEET_PULL_DISTANCE));
      if (progress > 0.22 || gesture.vy < -0.55) {
        setCultureSheetVisible(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(cultureSheetProgress, { toValue: 1, ...CULTURE_SHEET_SPRING }).start();
      } else if (progress > 0) {
        closeCultureSheet();
      }
    },
    onPanResponderTerminate: () => {
      setIsCultureSheetDragging(false);
      closeCultureSheet();
    },
  }), [cultureSheetProgress]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={s.content}>
          <View style={s.header}>
            <TouchableOpacity activeOpacity={0.7} style={s.headerButton} accessibilityLabel="Mở menu"><Ionicons name="menu-outline" size={25} color="#FCEBFF" /></TouchableOpacity>
            <Text style={s.brand}>Numelyra <Text style={s.gold}>✦</Text></Text>
            <TouchableOpacity activeOpacity={0.7} style={s.headerButton} accessibilityLabel="Lịch sử"><Ionicons name="time-outline" size={23} color="#F5B8E8" /></TouchableOpacity>
          </View>

          <View style={s.monthRow}>
            <View style={s.roundButtonShadow}>
              <TouchableOpacity activeOpacity={0.7} style={s.roundButton} onPress={() => selectDate(moveDate(date, -1, 'day'))} accessibilityRole="button" accessibilityLabel="Ngày trước">
                <LinearGradient colors={['#4A2D82', '#30195F', '#1D103F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.roundButtonGradient}>
                  <Ionicons name="chevron-back" size={22} color="#FFD793" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.75} style={s.monthChip} onPress={openDatePicker} accessibilityRole="button" accessibilityLabel="Chọn ngày">
              <Text style={s.monthText}>{MONTHS[month - 1]} · {year}</Text>
              <Ionicons name="chevron-down" size={14} color="#FFD793" />
            </TouchableOpacity>
            <View style={s.roundButtonShadow}>
              <TouchableOpacity activeOpacity={0.7} style={s.roundButton} onPress={() => selectDate(moveDate(date, 1, 'day'))} accessibilityRole="button" accessibilityLabel="Ngày sau">
                <LinearGradient colors={['#4A2D82', '#30195F', '#1D103F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.roundButtonGradient}>
                  <Ionicons name="chevron-forward" size={22} color="#FFD793" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={s.todayShadow}>
              <TouchableOpacity activeOpacity={0.7} style={s.today} onPress={() => selectDate(new Date())} accessibilityRole="button" accessibilityLabel="Hôm nay">
                <LinearGradient colors={isToday ? ['#FFE8AA', '#F5BD55', '#D98B2E'] : ['#FFE29A', '#F1B14B', '#D8892C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.todayGradient}>
                  <Ionicons name="sparkles" size={14} color="#2A1938" /><Text style={s.todayText}>Hôm nay</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.heroShadow}>
            <View style={s.hero}>
              <Image source={HERO} resizeMode="cover" style={s.heroArt} />
              <LinearGradient colors={['rgba(15, 7, 53, 0.72)', 'rgba(42, 13, 91, 0.20)', 'rgba(12, 6, 44, 0.18)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.heroShade} />
              <LinearGradient colors={['rgba(31, 9, 79, 0.04)', 'rgba(10, 5, 39, 0.44)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={s.heroDepthOverlay} />
              <View style={s.heroTextWrap}>
                <Text style={s.weekday}>{getDayOfWeekVi(date)}</Text>
                <Text style={s.lunar}>{lunar.day} tháng {LUNAR_MONTHS[lunar.month - 1]} · Âm lịch</Text>
                <Text style={s.day}>{day}</Text>
                <Text style={s.canChi}>Năm {canChiYear} · Ngày {canChiDay}</Text>
              </View>
            </View>
          </View>

          <View style={s.grid}>
            <QuickCard icon="sunny-outline" color="#FFD07A" label="Giờ đại cát" value={bestHour ? 'Giờ ' + bestHour.name : 'Đang cập nhật'} detail={bestHour?.range} onPress={() => openDetail('hoang_dao')} />
            <QuickCard icon="compass-outline" color="#FF88C6" label={direction.than} value="Hướng tốt" detail={direction.huong} onPress={() => openDetail('hoang_dao')} />
            <QuickCard icon="checkmark" color="#A7E8A0" label="Việc nên làm" value={activities.yi.slice(0, 2).join(', ')} onPress={() => openDetail('hoang_dao')} />
            <QuickCard icon="remove-outline" color="#FF88C6" label="Việc kiêng cữ" value={activities.ji.slice(0, 2).join(', ')} onPress={() => openDetail('hoang_dao')} />
          </View>

          <View style={s.topicShadow}>
            <TouchableOpacity style={s.topic} activeOpacity={0.8} onPress={openCultureSheet} accessibilityRole="button" accessibilityLabel="Mở điển tích và nguyên tác văn học">
              <Image source={TOPIC} resizeMode="cover" style={s.topicArt} />
              <LinearGradient colors={['rgba(78, 35, 128, 0.12)', 'rgba(18, 8, 54, 0.46)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.topicOverlay} />
              <View style={s.topicCopy}>
                <Text style={s.topicEyebrow}>✦ CHỦ ĐỀ HÔM NAY</Text>
                <Text style={s.topicTitle} numberOfLines={1}>{topicTitle}</Text>
                <Text style={s.topicExcerpt} numberOfLines={2}>“{topicExcerpt}”</Text>
                <View style={s.topicLinkRow}><Text style={s.topicLink}>Đọc toàn văn & ý nghĩa</Text><Ionicons name="chevron-forward" size={14} color="#FFD28A" /></View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.weekRailShadow}>
            <View style={s.weekRail}>
              <LinearGradient colors={['#3D226F', '#211143']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.weekRailSurface} />
              <LinearGradient colors={['rgba(229, 180, 255, 0.08)', 'rgba(11, 5, 39, 0.18)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={s.weekRailOverlay} />
              <View style={s.weekLabel}><Text style={s.weekLabelText}>Tuần</Text><Text style={s.weekNumber}>{week.weekNumber}</Text></View>
              {week.days.map((item, index) => (
                <TouchableOpacity activeOpacity={0.7} key={String(item.dayNumber) + '-' + index} style={[s.weekDay, item.isCurrentDay && s.weekDayActive]} onPress={() => selectDate(new Date(item.date))}>
                  <Text style={[s.weekName, item.isCurrentDay && s.weekTextActive]}>{item.dayOfWeekShort}</Text>
                  <Text style={[s.weekDate, item.isCurrentDay && s.weekTextActive]}>{item.dayNumber}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.pager}>
            <TouchableOpacity activeOpacity={0.7} style={s.pagerButton} onPress={() => selectDate(moveDate(date, -1, 'day'))}><Ionicons name="chevron-back" size={15} color="#C69CE6" /><Text style={s.pagerText}>Ngày trước</Text></TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={s.pagerButton} onPress={() => selectDate(moveDate(date, 1, 'day'))}><Text style={s.pagerText}>Ngày sau</Text><Ionicons name="chevron-forward" size={15} color="#C69CE6" /></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View
        collapsable={false}
        style={s.culturePullTrigger}
        {...culturePullResponder.panHandlers}
        accessible
        accessibilityLabel="Kéo lên để mở điển tích và nguyên tác văn học"
      >
        <View style={s.culturePullHandle} />
      </View>

      <Modal visible={datePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
        <View style={s.datePickerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDatePickerVisible(false)} accessibilityLabel="Đóng bộ chọn ngày" />
          <View style={s.datePickerCard}>
            <View style={s.datePickerHeader}>
              <Text style={s.datePickerTitle}>Chọn ngày</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setDatePickerVisible(false)} style={s.datePickerClose} accessibilityRole="button" accessibilityLabel="Đóng">
                <Ionicons name="close" size={20} color="#FCEBFF" />
              </TouchableOpacity>
            </View>
            <View style={s.datePickerMonthRow}>
              <TouchableOpacity activeOpacity={0.7} style={s.datePickerArrow} onPress={() => setPickerDate((current) => moveDate(current, -1, 'month'))} accessibilityRole="button" accessibilityLabel="Tháng trước">
                <Ionicons name="chevron-back" size={19} color="#FFD793" />
              </TouchableOpacity>
              <Text style={s.datePickerMonth}>{MONTHS[pickerDate.getMonth()]} · {pickerDate.getFullYear()}</Text>
              <TouchableOpacity activeOpacity={0.7} style={s.datePickerArrow} onPress={() => setPickerDate((current) => moveDate(current, 1, 'month'))} accessibilityRole="button" accessibilityLabel="Tháng sau">
                <Ionicons name="chevron-forward" size={19} color="#FFD793" />
              </TouchableOpacity>
            </View>
            <View style={s.datePickerWeekdays}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((weekday) => <Text key={weekday} style={s.datePickerWeekday}>{weekday}</Text>)}
            </View>
            <View style={s.datePickerGrid}>
              {pickerDays.map((pickerDay) => {
                const isCurrentMonth = pickerDay.getMonth() === pickerDate.getMonth();
                const isSelected = pickerDay.toDateString() === date.toDateString();
                const isCurrentDay = pickerDay.toDateString() === new Date().toDateString();
                return (
                  <TouchableOpacity
                    key={`${pickerDay.getFullYear()}-${pickerDay.getMonth()}-${pickerDay.getDate()}`}
                    activeOpacity={0.7}
                    style={[s.datePickerDay, isSelected && s.datePickerDaySelected, !isCurrentMonth && s.datePickerDayOutside]}
                    onPress={() => {
                      selectDate(pickerDay);
                      setDatePickerVisible(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${pickerDay.getDate()} tháng ${pickerDay.getMonth() + 1} năm ${pickerDay.getFullYear()}${isCurrentDay ? ', hôm nay' : ''}`}
                  >
                    <Text style={[s.datePickerDayText, !isCurrentMonth && s.datePickerDayTextOutside, isSelected && s.datePickerDayTextSelected, isCurrentDay && !isSelected && s.datePickerDayTextToday]}>
                      {pickerDay.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity activeOpacity={0.75} style={s.datePickerToday} onPress={() => { selectDate(new Date()); setDatePickerVisible(false); }} accessibilityRole="button" accessibilityLabel="Chọn hôm nay">
              <Text style={s.datePickerTodayText}>Hôm nay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BlocDetailModal visible={modalType !== null} type={modalType} onClose={() => setModalType(null)}
        hours={hours} bestHour={bestHour} direction={direction} activities={activities} userZodiac={zodiac}
        artItem={art as CalendarArtItem} caDao={caDao} lunar={lunar} canChiDay={canChiDay}
        canChiMonth={canChiMonth} canChiYear={canChiYear} solarTerm={getSolarTerm(day, month, year)}
        warning={null} profile={profile} userNguHanh={getNguHanh(birthYear)} />
      <BlocDetailModal visible={cultureSheetVisible} type={cultureSheetVisible ? 'art_culture' : null} onClose={closeCultureSheet}
        sheetProgress={cultureSheetProgress} contentScrollEnabled={!isCultureSheetDragging}
        onSheetDragStart={beginCultureSheetDrag} onSheetDragMove={moveCultureSheetDown} onSheetDragEnd={finishCultureSheetDrag}
        artItem={art as CalendarArtItem} caDao={caDao} />
    </SafeAreaView>
  );
}

function QuickCard({ icon, color, label, value, detail, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string; value: string; detail?: string; onPress: () => void }) {
  return <View style={s.quickShadow}>
    <TouchableOpacity style={s.quick} activeOpacity={0.7} onPress={onPress}>
      <LinearGradient colors={['#43236F', '#28144F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.quickSurface} />
      <LinearGradient colors={['rgba(237, 191, 255, 0.10)', 'rgba(12, 5, 43, 0.20)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={s.quickOverlay} />
      <View style={[s.quickIcon, { borderColor: color }]}><Ionicons name={icon} size={21} color={color} /></View>
      <View style={s.quickCopy}><Text style={s.quickLabel} numberOfLines={1}>{label}</Text><Text style={s.quickValue} numberOfLines={2}>{value}</Text>{detail ? <Text style={s.quickDetail}>{detail}</Text> : null}</View>
      <Ionicons name="chevron-forward" size={18} color="#FFE6FE" />
    </TouchableOpacity>
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#171044' },
  scroll: { flex: 1, backgroundColor: '#171044' },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 42 },
  content: { flexGrow: 1, backgroundColor: '#171044' },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  menu: { color: '#FCEBFF', fontSize: 27 }, history: { color: '#F5B8E8', fontSize: 31 }, brand: { color: '#FFF3FF', fontSize: 24, fontWeight: '500', letterSpacing: -0.6 }, gold: { color: '#FFD187', fontSize: 21 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 7 },
  roundButtonShadow: { width: 36, height: 36, borderRadius: 18, shadowColor: '#15092F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.44, shadowRadius: 7, elevation: 5 },
  roundButton: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  roundButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#FFD793', fontSize: 39, lineHeight: 39, marginTop: -5 }, monthChip: { flex: 1, height: 37, borderRadius: 19, borderWidth: 1, borderColor: '#9147C6', backgroundColor: '#301464', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }, monthText: { color: '#FFF0FF', fontSize: 14, fontWeight: '600' },
  todayShadow: { width: 97, height: 35, borderRadius: 18, shadowColor: '#E4A039', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.36, shadowRadius: 8, elevation: 5 },
  today: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  todayGradient: { flex: 1, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 },
  todayText: { color: '#2A1938', fontSize: 12, fontWeight: '800' },
  heroShadow: { height: 202, borderRadius: 24, marginBottom: 10, shadowColor: '#32105E', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.86, shadowRadius: 18, elevation: 14 },
  hero: { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(181, 112, 223, 0.72)', overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#26115D' }, heroArt: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }, heroShade: { ...StyleSheet.absoluteFill }, heroDepthOverlay: { ...StyleSheet.absoluteFill }, heroTextWrap: { width: '72%', paddingHorizontal: 22, paddingVertical: 15 },
  weekday: { color: '#FFF2FF', fontSize: 21, fontWeight: '800', marginBottom: 2 }, lunar: { color: '#FFD8A5', fontSize: 13, fontWeight: '600' }, day: { color: '#FFF0FF', fontSize: 80, lineHeight: 81, letterSpacing: -5, fontWeight: '900', textShadowColor: '#C071D4', textShadowRadius: 9 }, canChi: { color: '#F1A6E4', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }, quickShadow: { flexBasis: '48.2%', maxWidth: '48.2%', flexGrow: 0, flexShrink: 1, minWidth: 0, height: 92, borderRadius: 20, shadowColor: '#2D0B57', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.88, shadowRadius: 15, elevation: 12 }, quick: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(152, 94, 196, 0.62)', overflow: 'hidden', padding: 10, flexDirection: 'row', alignItems: 'center' }, quickSurface: { ...StyleSheet.absoluteFill }, quickOverlay: { ...StyleSheet.absoluteFill }, quickIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 7 }, quickIconText: { fontSize: 25, fontWeight: '700' }, quickCopy: { flex: 1, minWidth: 0 }, quickLabel: { color: '#D0A7E8', fontSize: 11, marginBottom: 2 }, quickValue: { color: '#FFF1FF', fontSize: 13, fontWeight: '800', lineHeight: 15 }, quickDetail: { color: '#FFCC8D', fontSize: 11, marginTop: 1, fontWeight: '600' }, chevron: { color: '#FFE6FE', fontSize: 30, fontWeight: '300', marginLeft: 3 },
  topicShadow: { height: 128, borderRadius: 24, marginBottom: 10, shadowColor: '#32105E', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.84, shadowRadius: 17, elevation: 13 }, topic: { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(178, 102, 213, 0.66)', backgroundColor: '#2A1658', overflow: 'hidden', flexDirection: 'row' }, topicArt: { width: '40%', height: '100%' }, topicOverlay: { ...StyleSheet.absoluteFill }, topicCopy: { flex: 1, padding: 11, paddingLeft: 12, justifyContent: 'center' }, topicEyebrow: { color: '#FFC66F', fontSize: 10, fontWeight: '800', marginBottom: 3 }, topicTitle: { color: '#FFF4FF', fontSize: 17, fontWeight: '900', marginBottom: 3 }, topicExcerpt: { color: '#D6A9EE', fontSize: 11, lineHeight: 14, marginBottom: 5 }, topicLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 }, topicLink: { color: '#FFD28A', fontSize: 11, fontWeight: '800' },
  weekRailShadow: { height: 74, borderRadius: 20, marginBottom: 4, shadowColor: '#2D0B57', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.84, shadowRadius: 15, elevation: 11 }, weekRail: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(164, 96, 205, 0.68)', flexDirection: 'row', overflow: 'hidden' }, weekRailSurface: { ...StyleSheet.absoluteFill }, weekRailOverlay: { ...StyleSheet.absoluteFill }, weekLabel: { width: 52, backgroundColor: 'rgba(75, 38, 125, 0.78)', alignItems: 'center', justifyContent: 'center' }, weekLabelText: { color: '#D9B5E9', fontSize: 11, marginBottom: 2 }, weekNumber: { color: '#FFF1FF', fontSize: 19, fontWeight: '800' }, weekDay: { flex: 1, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(169, 114, 208, 0.30)' }, weekDayActive: { backgroundColor: 'rgba(164, 55, 127, 0.74)' }, weekName: { color: '#CBA7E7', fontSize: 10, marginBottom: 2 }, weekDate: { color: '#FFF0FF', fontSize: 17, fontWeight: '700' }, weekTextActive: { color: '#FFF5FA' },
  pager: { marginTop: 4, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between' }, pagerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, pagerText: { color: '#C69CE6', fontSize: 12, fontWeight: '600' },
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
  culturePullTrigger: { position: 'absolute', left: 78, right: 78, bottom: 5, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(40, 20, 82, 0.95)', borderWidth: 1, borderColor: 'rgba(251, 196, 105, 0.48)', shadowColor: '#09031F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.34, shadowRadius: 6, elevation: 6 },
  culturePullHandle: { width: 34, height: 1, borderRadius: 2, backgroundColor: '#FFD98A', marginBottom: 2 },
  culturePullText: { color: '#F6D590', fontSize: 9, fontWeight: '800', letterSpacing: 0.15 },
});
