import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
const MESSAGE = require('../../assets/giao_dien/giaodien1/calender_asset/background/ChatGPT Image Sep 25, 2026, 11_00_36 PM (2).png');
const TOPIC = require('../../assets/giao_dien/giaodien1/calender_asset/background/ChatGPT Image Sep 25, 2026, 11_00_38 PM (3).png');
const MASCOT = require('../../assets/giao_dien/giaodien1/calender_asset/mascot/ChatGPT Image Sep 25, 2026, 11_00_16 PM.png');

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const LUNAR_MONTHS = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];

interface Props { profile: UserProfile; }

function moveDate(value: Date, amount: number, unit: 'day' | 'month') {
  const result = new Date(value);
  unit === 'day' ? result.setDate(result.getDate() + amount) : result.setMonth(result.getMonth() + amount);
  return result;
}

export default function CalendarScreen({ profile }: Props) {
  const [date, setDate] = useState(() => new Date());
  const [caDao, setCaDao] = useState<CaDaoItem | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
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

  useEffect(() => { getDailyCaDao(date).then(setCaDao).catch(() => setCaDao(null)); }, [date]);

  const today = new Date();
  const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
  const topicTitle = caDao?.category || 'Tình yêu đôi lứa';
  const topicExcerpt = caDao?.content || art.excerpt;
  const selectDate = (nextDate: Date) => {
    void Haptics.selectionAsync();
    setDate(nextDate);
  };
  const openDetail = (type: ModalType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType(type);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <View style={s.content}>
        <View style={s.header}>
          <TouchableOpacity activeOpacity={0.7} style={s.headerButton} accessibilityLabel="Mở menu"><Ionicons name="menu-outline" size={25} color="#FCEBFF" /></TouchableOpacity>
          <Text style={s.brand}>Numelyra <Text style={s.gold}>✦</Text></Text>
          <TouchableOpacity activeOpacity={0.7} style={s.headerButton} accessibilityLabel="Lịch sử"><Ionicons name="time-outline" size={23} color="#F5B8E8" /></TouchableOpacity>
        </View>

        <View style={s.monthRow}>
          <TouchableOpacity activeOpacity={0.7} style={s.roundButton} onPress={() => selectDate(moveDate(date, -1, 'month'))}><Ionicons name="chevron-back" size={22} color="#FFD793" /></TouchableOpacity>
          <View style={s.monthChip}><Text style={s.monthText}>{MONTHS[month - 1]} · {year}</Text></View>
          <TouchableOpacity activeOpacity={0.7} style={s.roundButton} onPress={() => selectDate(moveDate(date, 1, 'month'))}><Ionicons name="chevron-forward" size={22} color="#FFD793" /></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={[s.today, isToday && s.todayActive]} onPress={() => selectDate(new Date())}><Ionicons name="sparkles" size={14} color="#FFE4BC" /><Text style={s.todayText}>Hôm nay</Text></TouchableOpacity>
        </View>

        <View style={s.hero}>
          <Image source={HERO} resizeMode="cover" style={s.heroArt} />
          <View style={s.heroShade} />
          <View style={s.heroTextWrap}>
            <Text style={s.weekday}>{getDayOfWeekVi(date)}</Text>
            <Text style={s.lunar}>{lunar.day} tháng {LUNAR_MONTHS[lunar.month - 1]} · Âm lịch</Text>
            <Text style={s.day}>{day}</Text>
            <Text style={s.canChi}>Năm {canChiYear} · Ngày {canChiDay}</Text>
          </View>
        </View>

        <View style={s.message}>
          <Image source={MESSAGE} resizeMode="cover" style={s.messageArt} />
          <View style={s.messageShade} />
          <Image source={MASCOT} style={s.mascot} resizeMode="contain" />
          <View style={s.messageCopy}>
            <Text style={s.eyebrow}>✦ Lời nhắn từ Numelyra</Text>
            <Text style={s.messageText}>“Hôm nay, hãy dành thời gian cho những điều khiến trái tim bạn ấm áp.”</Text>
          </View>
        </View>

        <View style={s.grid}>
          <QuickCard icon="sunny-outline" color="#FFD07A" label="Giờ đại cát" value={bestHour ? 'Giờ ' + bestHour.name : 'Đang cập nhật'} detail={bestHour?.range} onPress={() => openDetail('hoang_dao')} />
          <QuickCard icon="compass-outline" color="#FF88C6" label={direction.than} value="Hướng tốt" detail={direction.huong} onPress={() => openDetail('hoang_dao')} />
          <QuickCard icon="checkmark" color="#A7E8A0" label="Việc nên làm" value={activities.yi.slice(0, 2).join(', ')} onPress={() => openDetail('hoang_dao')} />
          <QuickCard icon="remove-outline" color="#FF88C6" label="Việc kiêng cữ" value={activities.ji.slice(0, 2).join(', ')} onPress={() => openDetail('hoang_dao')} />
        </View>

        <TouchableOpacity style={s.topic} activeOpacity={0.8} onPress={() => openDetail('art_culture')}>
          <Image source={TOPIC} resizeMode="cover" style={s.topicArt} />
          <View style={s.topicCopy}>
            <Text style={s.topicEyebrow}>✦ CHỦ ĐỀ HÔM NAY</Text>
            <Text style={s.topicTitle} numberOfLines={1}>{topicTitle}</Text>
            <Text style={s.topicExcerpt} numberOfLines={2}>“{topicExcerpt}”</Text>
            <View style={s.topicLinkRow}><Text style={s.topicLink}>Đọc toàn văn & ý nghĩa</Text><Ionicons name="chevron-forward" size={14} color="#FFD28A" /></View>
          </View>
        </TouchableOpacity>

        <View style={s.weekRail}>
          <View style={s.weekLabel}><Text style={s.weekLabelText}>Tuần</Text><Text style={s.weekNumber}>{week.weekNumber}</Text></View>
          {week.days.map((item, index) => (
            <TouchableOpacity activeOpacity={0.7} key={String(item.dayNumber) + '-' + index} style={[s.weekDay, item.isCurrentDay && s.weekDayActive]} onPress={() => selectDate(new Date(item.date))}>
              <Text style={[s.weekName, item.isCurrentDay && s.weekTextActive]}>{item.dayOfWeekShort}</Text>
              <Text style={[s.weekDate, item.isCurrentDay && s.weekTextActive]}>{item.dayNumber}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.pager}>
          <TouchableOpacity activeOpacity={0.7} style={s.pagerButton} onPress={() => selectDate(moveDate(date, -1, 'day'))}><Ionicons name="chevron-back" size={15} color="#C69CE6" /><Text style={s.pagerText}>Ngày trước</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={s.pagerButton} onPress={() => selectDate(moveDate(date, 1, 'day'))}><Text style={s.pagerText}>Ngày sau</Text><Ionicons name="chevron-forward" size={15} color="#C69CE6" /></TouchableOpacity>
        </View>
      </View>

      <BlocDetailModal visible={modalType !== null} type={modalType} onClose={() => setModalType(null)}
        hours={hours} bestHour={bestHour} direction={direction} activities={activities} userZodiac={zodiac}
        artItem={art as CalendarArtItem} caDao={caDao} lunar={lunar} canChiDay={canChiDay}
        canChiMonth={canChiMonth} canChiYear={canChiYear} solarTerm={getSolarTerm(day, month, year)}
        warning={null} profile={profile} userNguHanh={getNguHanh(birthYear)} />
    </SafeAreaView>
  );
}

function QuickCard({ icon, color, label, value, detail, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string; value: string; detail?: string; onPress: () => void }) {
  return <TouchableOpacity style={s.quick} activeOpacity={0.7} onPress={onPress}>
    <View style={[s.quickIcon, { borderColor: color }]}><Ionicons name={icon} size={21} color={color} /></View>
    <View style={s.quickCopy}><Text style={s.quickLabel} numberOfLines={1}>{label}</Text><Text style={s.quickValue} numberOfLines={2}>{value}</Text>{detail ? <Text style={s.quickDetail}>{detail}</Text> : null}</View>
    <Ionicons name="chevron-forward" size={18} color="#FFE6FE" />
  </TouchableOpacity>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#171044' },
  content: { flex: 1, paddingHorizontal: 14, paddingBottom: 6, backgroundColor: '#171044' },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  menu: { color: '#FCEBFF', fontSize: 27 }, history: { color: '#F5B8E8', fontSize: 31 }, brand: { color: '#FFF3FF', fontSize: 24, fontWeight: '500', letterSpacing: -0.6 }, gold: { color: '#FFD187', fontSize: 21 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 7 },
  roundButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#211454', alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#FFD793', fontSize: 39, lineHeight: 39, marginTop: -5 }, monthChip: { flex: 1, height: 37, borderRadius: 19, borderWidth: 1, borderColor: '#9147C6', backgroundColor: '#301464', alignItems: 'center', justifyContent: 'center' }, monthText: { color: '#FFF0FF', fontSize: 14, fontWeight: '600' },
  today: { height: 35, paddingHorizontal: 8, borderRadius: 18, backgroundColor: '#3B1D73', borderWidth: 1, borderColor: '#6536A5', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 }, todayActive: { borderColor: '#D875C6', backgroundColor: '#56246F' }, todayText: { color: '#FFE4BC', fontSize: 12, fontWeight: '700' },
  hero: { height: 202, borderRadius: 24, borderWidth: 1, borderColor: '#7439AB', overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 10, backgroundColor: '#26115D' }, heroArt: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }, heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16, 7, 56, 0.18)' }, heroTextWrap: { width: '72%', paddingHorizontal: 22, paddingVertical: 15 },
  weekday: { color: '#FFF2FF', fontSize: 21, fontWeight: '800', marginBottom: 2 }, lunar: { color: '#FFD8A5', fontSize: 13, fontWeight: '600' }, day: { color: '#FFF0FF', fontSize: 80, lineHeight: 81, letterSpacing: -5, fontWeight: '900', textShadowColor: '#C071D4', textShadowRadius: 9 }, canChi: { color: '#F1A6E4', fontSize: 13, fontWeight: '600' },
  message: { height: 118, borderRadius: 24, borderWidth: 1, borderColor: '#60338D', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#2E185A' }, messageArt: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }, messageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(35, 12, 79, 0.28)' }, mascot: { width: 120, height: 120, marginLeft: -5, marginTop: 10 }, messageCopy: { flex: 1, paddingRight: 14, paddingVertical: 11 }, eyebrow: { color: '#F6A5D5', fontSize: 11, fontWeight: '700', marginBottom: 4 }, messageText: { color: '#FFF3FF', fontSize: 14, lineHeight: 18, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }, quick: { flexBasis: '48.2%', maxWidth: '48.2%', flexGrow: 0, flexShrink: 1, minWidth: 0, height: 92, borderRadius: 20, borderWidth: 1, borderColor: '#55327E', backgroundColor: '#2B175B', padding: 10, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }, quickIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 7 }, quickIconText: { fontSize: 25, fontWeight: '700' }, quickCopy: { flex: 1, minWidth: 0 }, quickLabel: { color: '#C99BE3', fontSize: 11, marginBottom: 2 }, quickValue: { color: '#FFF1FF', fontSize: 13, fontWeight: '800', lineHeight: 15 }, quickDetail: { color: '#FFCC8D', fontSize: 11, marginTop: 1, fontWeight: '600' }, chevron: { color: '#FFE6FE', fontSize: 30, fontWeight: '300', marginLeft: 3 },
  topic: { height: 128, borderRadius: 24, borderWidth: 1, borderColor: '#743AA6', backgroundColor: '#2A1658', overflow: 'hidden', flexDirection: 'row', marginBottom: 10 }, topicArt: { width: '40%', height: '100%' }, topicCopy: { flex: 1, padding: 11, paddingLeft: 12, justifyContent: 'center' }, topicEyebrow: { color: '#FFC66F', fontSize: 10, fontWeight: '800', marginBottom: 3 }, topicTitle: { color: '#FFF4FF', fontSize: 17, fontWeight: '900', marginBottom: 3 }, topicExcerpt: { color: '#D6A9EE', fontSize: 11, lineHeight: 14, marginBottom: 5 }, topicLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 }, topicLink: { color: '#FFD28A', fontSize: 11, fontWeight: '800' },
  weekRail: { height: 74, borderRadius: 20, borderWidth: 1, borderColor: '#7542A6', backgroundColor: '#291555', flexDirection: 'row', overflow: 'hidden', marginBottom: 4 }, weekLabel: { width: 52, backgroundColor: '#442276', alignItems: 'center', justifyContent: 'center' }, weekLabelText: { color: '#D9B5E9', fontSize: 11, marginBottom: 2 }, weekNumber: { color: '#FFF1FF', fontSize: 19, fontWeight: '800' }, weekDay: { flex: 1, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(130, 82, 179, 0.26)' }, weekDayActive: { backgroundColor: '#84366E' }, weekName: { color: '#CBA7E7', fontSize: 10, marginBottom: 2 }, weekDate: { color: '#FFF0FF', fontSize: 17, fontWeight: '700' }, weekTextActive: { color: '#FFF5FA' },
  pager: { marginTop: 4, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between' }, pagerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, pagerText: { color: '#C69CE6', fontSize: 12, fontWeight: '600' },
});
