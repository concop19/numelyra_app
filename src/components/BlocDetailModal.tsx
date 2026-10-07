/**
 * BlocDetailModal.tsx - Modal Popup chi tiết cho các vùng thông tin trên Tờ Lịch Blốc
 * 
 * Khi người dùng chạm vào:
 * 1. 'hoang_dao': Chi tiết 12 Giờ Hoàng/Hắc Đạo, Giờ kỵ tuổi, Giờ xuất hành, Việc Nên/Kiêng
 * 2. 'art_culture': Điển tích, toàn văn bài thơ / ca dao, ý nghĩa nhân sinh
 * 3. 'lunar_destiny': Chi tiết Âm Dương, Tiết khí, Ngũ hành bản mệnh người dùng
 */
import React from 'react';
import {
  Animated, Modal, PanResponder, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 720);
import type { DayActivities, DayDirection, HourInfo } from '../services/lunarService';
import { CalendarArtItem } from '../config/calendarArtConfig';
import { CaDaoItem } from '../db/cadaoService';
import { UserProfile, getZodiacEmoji, getNguHanhEmoji } from '../store/userProfile';

export type ModalType = 'hoang_dao' | 'art_culture' | 'lunar_destiny' | null;

const MODAL_META = {
  hoang_dao: { icon: 'compass-outline', title: 'HOÀNG LỊCH & VIỆC CÁT HUNG' },
  art_culture: { icon: 'book-outline', title: 'ĐIỂN TÍCH & NGUYÊN TÁC VĂN HỌC' },
  lunar_destiny: { icon: 'sparkles-outline', title: 'CHI TIẾT ÂM DƯƠNG & BẢN MỆNH' },
} as const;

function SectionTitle({
  icon,
  title,
  tone = 'gold',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  tone?: 'gold' | 'green' | 'pink';
}) {
  const colors = tone === 'green'
    ? (['#5EEAD4', '#34D399'] as const)
    : tone === 'pink'
      ? (['#F9A8D4', '#C084FC'] as const)
      : (['#FFE29A', '#EAB45D'] as const);

  return (
    <View style={styles.sectionTitleRow}>
      <LinearGradient colors={colors} style={styles.sectionIcon}>
        <Ionicons name={icon} size={15} color="#241335" />
      </LinearGradient>
      <Text style={styles.subTitle}>{title}</Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
  // Dữ liệu cho modal Hoàng Đạo & Việc Cát Hung
  hours?: HourInfo[];
  bestHour?: HourInfo | null;
  direction?: DayDirection;
  activities?: DayActivities;
  userZodiac?: string;
  // Dữ liệu cho modal Văn Hóa & Điển Tích
  artItem?: CalendarArtItem | null;
  caDao?: CaDaoItem | null;
  // Dữ liệu cho modal Âm Dương & Bản Mệnh
  lunar?: { day: number; month: number; year: number; leap: boolean };
  canChiDay?: string;
  canChiMonth?: string;
  canChiYear?: string;
  solarTerm?: string;
  warning?: string | null;
  profile?: UserProfile;
  userNguHanh?: string;
  userNapAm?: string;
  dayHoangDaoStatus?: { isHoangDao: boolean; label: string };
  isLunarMonthFull?: boolean;
  /** Tiến độ 0→1 để điều khiển bottom sheet khi người dùng kéo từ cạnh dưới. */
  sheetProgress?: Animated.Value;
  /** Khóa cuộn nội dung trong lúc sheet đang được kéo lên. */
  contentScrollEnabled?: boolean;
  /** Các callback kéo xuống từ thanh tiêu đề của bottom sheet. */
  onSheetDragStart?: () => void;
  onSheetDragMove?: (translationY: number) => void;
  onSheetDragEnd?: (translationY: number, velocityY: number) => void;
}

export default function BlocDetailModal({
  visible,
  type,
  onClose,
  hours = [],
  bestHour,
  direction,
  activities,
  userZodiac = '',
  artItem,
  caDao,
  lunar,
  canChiDay,
  canChiMonth,
  canChiYear,
  solarTerm,
  warning,
  profile,
  userNguHanh = '',
  userNapAm = '',
  dayHoangDaoStatus,
  isLunarMonthFull,
  sheetProgress,
  contentScrollEnabled = true,
  onSheetDragStart,
  onSheetDragMove,
  onSheetDragEnd
}: Props) {
  const [failedCalendarImageId, setFailedCalendarImageId] = React.useState<string | null>(null);
  const calendarImageSource = artItem?.imageUri
    ? (failedCalendarImageId === artItem.id ? artItem.imageUri.fallback : artItem.imageUri)
    : null;
  const headerDragResponder = React.useMemo(() => {
    if (!sheetProgress || !onSheetDragStart || !onSheetDragMove || !onSheetDragEnd) return null;
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: onSheetDragStart,
      onPanResponderMove: (_event: any, gesture: any) => onSheetDragMove(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event: any, gesture: any) => onSheetDragEnd(Math.max(0, gesture.dy), gesture.vy),
      onPanResponderTerminate: () => onSheetDragEnd(0, 0),
    });
  }, [sheetProgress, onSheetDragStart, onSheetDragMove, onSheetDragEnd]);

  if (!visible || !type) return null;
  const meta = MODAL_META[type];

  return (
    <Modal
      transparent
      visible={visible}
      animationType={sheetProgress ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, sheetProgress && styles.interactiveOverlay]}>
        {sheetProgress && (
          <Animated.View
            pointerEvents="none"
            style={[styles.dragBackdrop, { opacity: sheetProgress }]}
          />
        )}
        {/* Chạm vào nền mờ để đóng modal */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalCard,
            sheetProgress && {
              transform: [{
                translateY: sheetProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SHEET_HEIGHT, 0],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          {/* Header Modal */}
          <LinearGradient
            colors={['#3B1D69', '#24124A', '#120B2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <LinearGradient colors={['#FFE6A9', '#E9A65A']} style={styles.headerIconCircle}>
                  <Ionicons name={meta.icon} size={19} color="#2B1642" />
                </LinearGradient>
                <View style={styles.headerTextStack}>
                  <Text style={styles.headerEyebrow}>NUMELYRA CALENDAR</Text>
                  <Text style={styles.headerTitle}>{meta.title}</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { void Haptics.selectionAsync(); onClose(); }} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Đóng chi tiết">
                <Ionicons name="close" size={20} color="#FFE4A2" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          {headerDragResponder && (
            <View collapsable={false} style={styles.headerDragZone} {...headerDragResponder.panHandlers}>
              <View style={styles.headerDragHandle} />
            </View>
          )}

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={contentScrollEnabled}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. NỘI DUNG HOÀNG ĐẠO */}
            {type === 'hoang_dao' && (
                  <View>
                    {/* Giờ xuất hành đại cát */}
                    {bestHour && (
                      <LinearGradient colors={['#183D39', '#17302E', '#1B1A39']} style={styles.highlightBox}>
                        <SectionTitle icon="sunny-outline" title="GIỜ XUẤT HÀNH ĐẠI CÁT" tone="green" />
                        <Text style={styles.highlightValue}>
                          {bestHour.canChi} ({bestHour.range}) • Sao {bestHour.label}
                        </Text>
                        <Text style={styles.highlightSub}>Lý Thuần Phong: {bestHour.lyThuanPhong}</Text>
                        {direction && (
                          <View style={styles.highlightDirection}><Ionicons name="navigate-outline" size={14} color="#99F6E4" /><Text style={styles.highlightSub}>Hỷ Thần: {direction.hyThan} · Tài Thần: {direction.taiThan}{direction.hacThan ? ` · Tránh Hạc Thần: ${direction.hacThan}` : ''}</Text></View>
                        )}
                      </LinearGradient>
                    )}

                    {/* Bảng 12 giờ */}
                    <SectionTitle icon="time-outline" title="BẢNG 12 GIỜ HOÀNG ĐẠO & HẮC ĐẠO" />
                    {userZodiac ? (
                      <Text style={styles.noteText}>
                        * ⚠️ là giờ xung tuổi {userZodiac}; “Nhật Phá” là giờ xung với Địa Chi của ngày.
                      </Text>
                    ) : null}

                    <View style={styles.table}>
                      <LinearGradient colors={['#42226F', '#2A164E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 1.2 }]}>Giờ</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>Khung giờ</Text>
                        <Text style={[styles.th, { flex: 1.8 }]}>Sao</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Cát/Hung</Text>
                      </LinearGradient>
                      {hours.map((h, i) => (
                        <View
                          key={i}
                          style={[
                            styles.tableRow,
                            (h.isClash || h.isDayClash) ? styles.rowClash : h.isHoangDao ? styles.rowHD : styles.rowHac
                          ]}
                        >
                          <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
                            {(h.isClash || h.isDayClash) && <Text style={styles.clashMark}>⚠️ </Text>}
                            <Text style={[styles.td, (h.isClash || h.isDayClash) && { color: '#F87171', fontWeight: '700' }]}>
                              {h.canChi}
                            </Text>
                          </View>
                          <Text style={[styles.td, { flex: 1.5 }]}>{h.range}</Text>
                          <Text style={[styles.td, { flex: 1.8, fontSize: 11 }]}>{h.label}{'\n'}{h.lyThuanPhong}{h.isDayClash ? ' · Nhật Phá' : ''}</Text>
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={[styles.badge, h.isHoangDao ? styles.badgeHD : styles.badgeHac]}>
                              {h.isHoangDao ? 'Hoàng Đạo' : 'Hắc Đạo'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Việc nên & Việc kiêng */}
                    {activities && (
                      <LinearGradient colors={['#251640', '#17112E']} style={styles.activitiesCard}>
                        <SectionTitle icon="calendar-outline" title={`TRỰC ${activities.trucName.toUpperCase()} (${activities.trucQuality.toUpperCase()})`} tone="pink" />
                        <View style={styles.actRow}>
                          <View style={styles.actCol}>
                            <View style={styles.activityHeader}><Ionicons name="checkmark-circle" size={16} color="#6EE7B7" /><Text style={styles.actYiHeader}>NÊN LÀM</Text></View>
                            {activities.yi.map((item, idx) => (
                              <Text key={idx} style={styles.actYiItem}>• {item}</Text>
                            ))}
                          </View>
                          <View style={[styles.actCol, styles.actColBorder]}>
                            <View style={styles.activityHeader}><Ionicons name="close-circle" size={16} color="#FDA4AF" /><Text style={styles.actJiHeader}>KIÊNG CỮ</Text></View>
                            {activities.ji.map((item, idx) => (
                              <Text key={idx} style={styles.actJiItem}>• {item}</Text>
                            ))}
                          </View>
                        </View>
                      </LinearGradient>
                    )}
                  </View>
                )}

                {/* 2. NỘI DUNG VĂN HÓA & ĐIỂN TÍCH */}
                {type === 'art_culture' && (
                  <View>
                    {artItem && (
                      <View style={styles.artSection}>
                        {/* Tranh minh họa 4 Mùa dân gian Việt Nam */}
                        {calendarImageSource && (
                          <View style={styles.modalArtImageCard}>
                            <Image
                              source={calendarImageSource}
                              style={styles.modalArtImage}
                              resizeMode="contain"
                              onError={() => setFailedCalendarImageId(artItem.id)}
                            />
                            <LinearGradient colors={['rgba(35, 15, 71, 0.00)', 'rgba(15, 8, 38, 0.64)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.modalArtOverlay} pointerEvents="none" />
                            <View style={styles.modalSeasonTag}>
                              <Text style={styles.modalSeasonTagText}>
                                {artItem.seasonEmoji} {artItem.seasonName} • {artItem.seasonHan}
                              </Text>
                            </View>
                          </View>
                        )}

                        <Text style={styles.artTitle}>{artItem.title}</Text>
                        {artItem.hanTitle && (
                          <Text style={styles.artHan}>{artItem.hanTitle}</Text>
                        )}
                        <Text style={styles.artAuthor}>
                          {artItem.author} {artItem.period ? `(${artItem.period})` : ''}
                        </Text>

                        {/* Đoạn trích / Toàn văn */}
                        <LinearGradient colors={['#302052', '#1D1539']} style={styles.poemBox}>
                          <View style={styles.poemQuoteIcon}><Ionicons name="chatbox-ellipses-outline" size={16} color="#FFD990" /></View>
                          <Text style={styles.poemText}>
                            {artItem.fullContent || artItem.excerpt}
                          </Text>
                        </LinearGradient>

                        {/* Lời bình & Diễn giải */}
                        <LinearGradient colors={['#241B45', '#151129']} style={styles.descBox}>
                          <SectionTitle icon="library-outline" title="TÍCH XƯA & Ý NGHĨA VĂN HÓA" />
                          <Text style={styles.descContent}>{artItem.description}</Text>
                          {artItem.location && (
                            <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color="#CBB5FF" /><Text style={styles.locationText}>Lưu giữ: {artItem.location}</Text></View>
                          )}
                        </LinearGradient>
                      </View>
                    )}

                    {/* Ca dao tục ngữ bổ sung */}
                    {caDao && (
                      <LinearGradient colors={['#352050', '#1A1535']} style={styles.cadaoSection}>
                        <SectionTitle icon="reader-outline" title="CA DAO TỤC NGỮ TRONG NGÀY" tone="pink" />
                        <Text style={styles.cadaoText}>"{caDao.content}"</Text>
                        {caDao.category ? (
                          <Text style={styles.cadaoCat}>Chủ đề: {caDao.category}</Text>
                        ) : null}
                      </LinearGradient>
                    )}
                  </View>
                )}

                {/* 3. NỘI DUNG ÂM DƯƠNG & BẢN MỆNH */}
                {type === 'lunar_destiny' && (
                  <View>
                    {/* Cảnh báo đặc biệt */}
                    {warning && (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningText}>{warning}</Text>
                      </View>
                    )}

                    {/* Khối Âm lịch & Can Chi */}
                    <View style={styles.destinyCard}>
                      <Text style={styles.destinyCardTitle}>🗓️ TỔNG QUAN THỜI GIAN ÂM DƯƠNG</Text>
                      <View style={styles.destinyRow}>
                        <Text style={styles.destinyLabel}>Ngày Can Chi:</Text>
                        <Text style={styles.destinyValue}>{canChiDay}</Text>
                      </View>
                      <View style={styles.destinyRow}>
                        <Text style={styles.destinyLabel}>Tháng Can Chi:</Text>
                        <Text style={styles.destinyValue}>{canChiMonth}</Text>
                      </View>
                      <View style={styles.destinyRow}>
                        <Text style={styles.destinyLabel}>Năm Can Chi:</Text>
                        <Text style={styles.destinyValue}>{canChiYear}</Text>
                      </View>
                      <View style={styles.destinyRow}>
                        <Text style={styles.destinyLabel}>24 Tiết Khí:</Text>
                        <Text style={[styles.destinyValue, { color: '#4ADE80' }]}>{solarTerm}</Text>
                      </View>
                      {dayHoangDaoStatus && (
                        <View style={styles.destinyRow}>
                          <Text style={styles.destinyLabel}>Cát/Hắc nhật:</Text>
                          <Text style={styles.destinyValue}>{dayHoangDaoStatus.label}</Text>
                        </View>
                      )}
                      {typeof isLunarMonthFull === 'boolean' && (
                        <View style={styles.destinyRow}>
                          <Text style={styles.destinyLabel}>Tháng âm:</Text>
                          <Text style={styles.destinyValue}>{isLunarMonthFull ? 'Tháng đủ (30 ngày)' : 'Tháng thiếu (29 ngày)'}</Text>
                        </View>
                      )}
                    </View>

                    {/* Khối Bản mệnh người dùng */}
                    {profile && (
                      <View style={[styles.destinyCard, { borderColor: '#F5BA5B' }]}>
                        <Text style={styles.destinyCardTitle}>🔮 TƯƠNG QUAN BẢN MỆNH BẠN</Text>
                        <View style={styles.destinyRow}>
                          <Text style={styles.destinyLabel}>Họ và tên:</Text>
                          <Text style={styles.destinyValue}>{profile.fullName}</Text>
                        </View>
                        <View style={styles.destinyRow}>
                          <Text style={styles.destinyLabel}>Con giáp:</Text>
                          <Text style={styles.destinyValue}>
                            {getZodiacEmoji(userZodiac)} Tuổi {userZodiac}
                          </Text>
                        </View>
                        <View style={styles.destinyRow}>
                          <Text style={styles.destinyLabel}>Ngũ Hành:</Text>
                          <Text style={styles.destinyValue}>
                            {getNguHanhEmoji(userNguHanh)} Mệnh {userNguHanh}
                          </Text>
                        </View>
                        {userNapAm ? (
                          <View style={styles.destinyRow}>
                            <Text style={styles.destinyLabel}>Nạp Âm:</Text>
                            <Text style={styles.destinyValue}>{userNapAm}</Text>
                          </View>
                        ) : null}
                        <Text style={styles.destinyAdvice}>
                          💡 Khởi sự công việc vào các khung giờ Hoàng Đạo và hướng xuất hành phù hợp để thu hút cát khí và tài lộc.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 12, 0.75)',
    justifyContent: 'flex-end'
  },
  interactiveOverlay: { backgroundColor: 'transparent' },
  dragBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 5, 12, 0.75)' },
  modalCard: {
    backgroundColor: '#120C29',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(217, 164, 255, 0.55)',
    height: SHEET_HEIGHT,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    overflow: 'hidden',
    shadowColor: '#050212',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.62,
    shadowRadius: 24,
    elevation: 24,
  },
  headerGradient: { borderBottomWidth: 1, borderBottomColor: 'rgba(250, 219, 155, 0.24)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 14,
  },
  headerDragZone: { position: 'absolute', top: 0, left: 0, right: 58, height: 60, zIndex: 4, elevation: 4, alignItems: 'center', paddingTop: 7 },
  headerDragHandle: { width: 36, height: 3, borderRadius: 2, backgroundColor: 'rgba(245, 186, 91, 0.78)' },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10, shadowColor: '#F7C66B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.38, shadowRadius: 6, elevation: 5 },
  headerTextStack: { flex: 1 },
  headerEyebrow: { color: '#D8B9FF', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 2 },
  headerTitle: {
    color: '#FFF3D6',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 240, 203, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 222, 153, 0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14
  },
  bodyContent: {
    paddingBottom: 60,
    flexGrow: 1
  },

  // HIGHLIGHT BOX
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionIcon: { width: 25, height: 25, borderRadius: 12.5, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  highlightBox: {
    borderRadius: 17,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.58)',
    shadowColor: '#091E28',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
    elevation: 8,
  },
  highlightValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  highlightDirection: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  highlightSub: { color: '#99F6E4', fontSize: 12, fontWeight: '700' },

  subTitle: { color: '#FFE2A5', fontSize: 12, fontWeight: '800', letterSpacing: 0.25, flex: 1 },
  noteText: { color: '#94A3B8', fontSize: 11, fontStyle: 'italic', marginBottom: 10 },

  // TABLE
  table: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(165, 114, 220, 0.42)',
    marginBottom: 16,
    backgroundColor: '#181230',
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  th: { color: '#F5BA5B', fontSize: 11, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#252044'
  },
  rowHD: { backgroundColor: 'rgba(25, 75, 62, 0.72)' },
  rowHac: { backgroundColor: 'rgba(34, 25, 61, 0.92)' },
  rowClash: { backgroundColor: 'rgba(87, 31, 55, 0.76)' },
  td: { color: '#E2E8F0', fontSize: 12 },
  clashMark: { fontSize: 11 },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeHD: { backgroundColor: '#166534', color: '#BBF7D0' },
  badgeHac: { backgroundColor: '#7F1D1D', color: '#FCA5A5' },

  // ACTIVITIES
  activitiesCard: {
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(186, 129, 243, 0.38)',
    shadowColor: '#080315',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 7,
  },
  actRow: { flexDirection: 'row', marginTop: 8 },
  actCol: { flex: 1 },
  actColBorder: { borderLeftWidth: 1, borderLeftColor: '#2D2852', paddingLeft: 12 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  actYiHeader: { color: '#6EE7B7', fontSize: 12, fontWeight: '800' },
  actJiHeader: { color: '#FDA4AF', fontSize: 12, fontWeight: '800' },
  actYiItem: { color: '#BBF7D0', fontSize: 12, marginVertical: 3 },
  actJiItem: { color: '#FCA5A5', fontSize: 12, marginVertical: 3 },

  // ART SECTION
  artSection: { marginBottom: 14 },
  modalArtImageCard: {
    width: '100%',
    height: 240,
    backgroundColor: '#1B1736',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#C2A676',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#050212',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  modalArtImage: {
    width: '100%',
    height: '100%'
  },
  modalArtOverlay: { ...StyleSheet.absoluteFill },
  modalSeasonTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(28, 20, 10, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5BA5B'
  },
  modalSeasonTagText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  artTitle: { color: '#F5BA5B', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  artHan: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', marginTop: 2, letterSpacing: 2 },
  artAuthor: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4, fontWeight: '600' },
  poemBox: {
    borderRadius: 17,
    padding: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 201, 255, 0.32)',
    shadowColor: '#080315',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 9,
    elevation: 6,
  },
  poemQuoteIcon: { alignSelf: 'center', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 217, 144, 0.12)', marginBottom: 7 },
  poemText: {
    color: '#FFF8EA',
    fontSize: 14,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center'
  },
  descBox: {
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(160, 126, 224, 0.30)'
  },
  descContent: { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  locationText: { color: '#CBB5FF', fontSize: 11, fontStyle: 'italic', flex: 1 },

  // CADAO
  cadaoSection: {
    borderRadius: 17,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(209, 160, 255, 0.34)',
    shadowColor: '#080315',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 9,
    elevation: 6,
  },
  cadaoText: { color: '#E2E8F0', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  cadaoCat: { color: '#94A3B8', fontSize: 11, marginTop: 6 },

  // DESTINY
  warningBox: {
    backgroundColor: '#35161C',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#991B1B'
  },
  warningText: { color: '#FCA5A5', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  destinyCard: {
    backgroundColor: '#1A1633',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2852'
  },
  destinyCardTitle: { color: '#F5BA5B', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  destinyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#252044'
  },
  destinyLabel: { color: '#94A3B8', fontSize: 13 },
  destinyValue: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  destinyAdvice: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 10, fontStyle: 'italic' }
});
