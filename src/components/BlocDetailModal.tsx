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
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 720);
import { HourInfo } from '../services/lunarService';
import { CalendarArtItem } from '../config/calendarArtConfig';
import { CaDaoItem } from '../db/cadaoService';
import { UserProfile, getZodiacEmoji, getNguHanhEmoji } from '../store/userProfile';

export type ModalType = 'hoang_dao' | 'art_culture' | 'lunar_destiny' | null;

interface Props {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
  // Dữ liệu cho modal Hoàng Đạo & Việc Cát Hung
  hours?: HourInfo[];
  bestHour?: HourInfo | null;
  direction?: { huong: string; than: string };
  activities?: { yi: string[]; ji: string[] };
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
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerIcon}>
                {type === 'hoang_dao' ? '🧭' : type === 'art_culture' ? '📜' : '✨'}
              </Text>
              <Text style={styles.headerTitle}>
                {type === 'hoang_dao'
                  ? 'HOÀNG LỊCH & VIỆC CÁT HUNG'
                  : type === 'art_culture'
                  ? 'ĐIỂN TÍCH & NGUYÊN TÁC VĂN HỌC'
                  : 'CHI TIẾT ÂM DƯƠNG & BẢN MỆNH'}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { void Haptics.selectionAsync(); onClose(); }} style={styles.closeBtn}>
              <Ionicons name="close" size={21} color="#F5BA5B" />
            </TouchableOpacity>
          </View>
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
                      <View style={styles.highlightBox}>
                        <Text style={styles.highlightTitle}>🌟 GIỜ XUẤT HÀNH ĐẠI CÁT</Text>
                        <Text style={styles.highlightValue}>
                          Giờ {bestHour.name} ({bestHour.range}) • Sao {bestHour.label}
                        </Text>
                        {direction && (
                          <Text style={styles.highlightSub}>
                            🧭 {direction.than}: Hướng {direction.huong}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Bảng 12 giờ */}
                    <Text style={styles.subTitle}>⏰ BẢNG 12 GIỜ HOÀNG ĐẠO & HẮC ĐẠO</Text>
                    {userZodiac ? (
                      <Text style={styles.noteText}>
                        * Biểu tượng ⚠️ đánh dấu khung giờ xung khắc (Tứ Hành Xung) với tuổi {userZodiac} của bạn.
                      </Text>
                    ) : null}

                    <View style={styles.table}>
                      <View style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 1.2 }]}>Giờ</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>Khung giờ</Text>
                        <Text style={[styles.th, { flex: 1.8 }]}>Sao</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Cát/Hung</Text>
                      </View>
                      {hours.map((h, i) => (
                        <View
                          key={i}
                          style={[
                            styles.tableRow,
                            h.isClash ? styles.rowClash : h.isHoangDao ? styles.rowHD : styles.rowHac
                          ]}
                        >
                          <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
                            {h.isClash && <Text style={styles.clashMark}>⚠️ </Text>}
                            <Text style={[styles.td, h.isClash && { color: '#F87171', fontWeight: '700' }]}>
                              {h.name}
                            </Text>
                          </View>
                          <Text style={[styles.td, { flex: 1.5 }]}>{h.range}</Text>
                          <Text style={[styles.td, { flex: 1.8, fontSize: 11 }]}>{h.label}</Text>
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
                      <View style={styles.activitiesCard}>
                        <Text style={styles.subTitle}>📋 VIỆC NÊN LÀM & KIÊNG CỮ HÔM NAY</Text>
                        <View style={styles.actRow}>
                          <View style={styles.actCol}>
                            <Text style={styles.actYiHeader}>✅ NÊN LÀM (YI)</Text>
                            {activities.yi.map((item, idx) => (
                              <Text key={idx} style={styles.actYiItem}>• {item}</Text>
                            ))}
                          </View>
                          <View style={[styles.actCol, styles.actColBorder]}>
                            <Text style={styles.actJiHeader}>🚫 KIÊNG CỮ (JI)</Text>
                            {activities.ji.map((item, idx) => (
                              <Text key={idx} style={styles.actJiItem}>• {item}</Text>
                            ))}
                          </View>
                        </View>
                      </View>
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
                        <View style={styles.poemBox}>
                          <Text style={styles.poemText}>
                            {artItem.fullContent || artItem.excerpt}
                          </Text>
                        </View>

                        {/* Lời bình & Diễn giải */}
                        <View style={styles.descBox}>
                          <Text style={styles.descTitle}>📖 TÍCH XƯA & Ý NGHĨA VĂN HÓA</Text>
                          <Text style={styles.descContent}>{artItem.description}</Text>
                          {artItem.location && (
                            <Text style={styles.locationText}>🏛️ Lưu giữ: {artItem.location}</Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Ca dao tục ngữ bổ sung */}
                    {caDao && (
                      <View style={styles.cadaoSection}>
                        <Text style={styles.cadaoSecTitle}>📜 CA DAO TỤC NGỮ TRONG NGÀY</Text>
                        <Text style={styles.cadaoText}>"{caDao.content}"</Text>
                        {caDao.category ? (
                          <Text style={styles.cadaoCat}>Chủ đề: {caDao.category}</Text>
                        ) : null}
                      </View>
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
    backgroundColor: '#151329',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#3B3363',
    height: SHEET_HEIGHT,
    maxHeight: '90%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252044'
  },
  headerDragZone: { position: 'absolute', top: 0, left: 0, right: 58, height: 60, zIndex: 4, elevation: 4, alignItems: 'center', paddingTop: 7 },
  headerDragHandle: { width: 36, height: 3, borderRadius: 2, backgroundColor: 'rgba(245, 186, 91, 0.78)' },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerIcon: { fontSize: 20, marginRight: 8 },
  headerTitle: {
    color: '#F5BA5B',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252044',
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
  highlightBox: {
    backgroundColor: '#162C1D',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#22C55E'
  },
  highlightTitle: { color: '#4ADE80', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  highlightValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  highlightSub: { color: '#86EFAC', fontSize: 12, marginTop: 4 },

  subTitle: { color: '#F5BA5B', fontSize: 13, fontWeight: '700', marginVertical: 8 },
  noteText: { color: '#94A3B8', fontSize: 11, fontStyle: 'italic', marginBottom: 10 },

  // TABLE
  table: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252044',
    marginBottom: 16
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#201C3A',
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
  rowHD: { backgroundColor: '#132219' },
  rowHac: { backgroundColor: '#18152B' },
  rowClash: { backgroundColor: '#31161D' },
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
    backgroundColor: '#1B1736',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D2852'
  },
  actRow: { flexDirection: 'row', marginTop: 8 },
  actCol: { flex: 1 },
  actColBorder: { borderLeftWidth: 1, borderLeftColor: '#2D2852', paddingLeft: 12 },
  actYiHeader: { color: '#4ADE80', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  actJiHeader: { color: '#F87171', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  actYiItem: { color: '#BBF7D0', fontSize: 12, marginVertical: 3 },
  actJiItem: { color: '#FCA5A5', fontSize: 12, marginVertical: 3 },

  // ART SECTION
  artSection: { marginBottom: 14 },
  modalArtImageCard: {
    width: '100%',
    height: 240,
    backgroundColor: '#1B1736',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C2A676',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalArtImage: {
    width: '100%',
    height: '100%'
  },
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
    backgroundColor: '#1E193C',
    borderRadius: 12,
    padding: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#3D346D'
  },
  poemText: {
    color: '#FFF8EA',
    fontSize: 14,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center'
  },
  descBox: {
    backgroundColor: '#16132C',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2450'
  },
  descTitle: { color: '#F5BA5B', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  descContent: { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  locationText: { color: '#94A3B8', fontSize: 11, fontStyle: 'italic', marginTop: 8 },

  // CADAO
  cadaoSection: {
    backgroundColor: '#1A1633',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2D2852'
  },
  cadaoSecTitle: { color: '#F5BA5B', fontSize: 12, fontWeight: '700', marginBottom: 6 },
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
