/**
 * Modal chi tiết Âm Dương và bản mệnh trên màn Tờ Lịch Blốc.
 * Phần giờ Hoàng/Hắc Đạo được hiển thị bởi HourDirectionSheet.
 */
import React from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { UserProfile, getNguHanhEmoji, getZodiacEmoji } from '../store/userProfile';
import { useLocalization } from '../i18n/LocalizationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 720);

export type ModalType = 'lunar_destiny' | null;

interface Props {
  visible: boolean;
  type: ModalType;
  onClose: () => void;
  canChiDay?: string;
  canChiMonth?: string;
  canChiYear?: string;
  solarTerm?: string;
  warning?: string | null;
  profile?: UserProfile;
  userZodiac?: string;
  userNguHanh?: string;
  userNapAm?: string;
  dayHoangDaoStatus?: { isHoangDao: boolean; label: string };
  isLunarMonthFull?: boolean;
}

export default function BlocDetailModal({
  visible,
  type,
  onClose,
  canChiDay,
  canChiMonth,
  canChiYear,
  solarTerm,
  warning,
  profile,
  userZodiac = '',
  userNguHanh = '',
  userNapAm = '',
  dayHoangDaoStatus,
  isLunarMonthFull,
}: Props) {
  const { t, l } = useLocalization();
  if (!visible || type !== 'lunar_destiny') return null;

  const closeWithFeedback = () => {
    void Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          <LinearGradient
            colors={['#3B1D69', '#24124A', '#120B2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <LinearGradient colors={['#FFE6A9', '#E9A65A']} style={styles.headerIconCircle}>
                  <Ionicons name="sparkles-outline" size={19} color="#2B1642" />
                </LinearGradient>
                <View style={styles.headerTextStack}>
                  <Text style={styles.headerEyebrow}>NUMELYRA CALENDAR</Text>
                  <Text style={styles.headerTitle}>{l('CHI TIẾT ÂM DƯƠNG & BẢN MỆNH', 'LUNAR CALENDAR & DESTINY DETAILS')}</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={closeWithFeedback}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={20} color="#FFE4A2" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator
            bounces
            keyboardShouldPersistTaps="handled"
          >
            {warning ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ) : null}

            <View style={styles.destinyCard}>
              <Text style={styles.destinyCardTitle}>🗓️ {l('TỔNG QUAN THỜI GIAN ÂM DƯƠNG', 'LUNAR TIME OVERVIEW')}</Text>
              <View style={styles.destinyRow}>
                <Text style={styles.destinyLabel}>{l('Ngày Can Chi:', 'Day stem-branch:')}</Text>
                <Text style={styles.destinyValue}>{canChiDay}</Text>
              </View>
              <View style={styles.destinyRow}>
                <Text style={styles.destinyLabel}>{l('Tháng Can Chi:', 'Month stem-branch:')}</Text>
                <Text style={styles.destinyValue}>{canChiMonth}</Text>
              </View>
              <View style={styles.destinyRow}>
                <Text style={styles.destinyLabel}>{l('Năm Can Chi:', 'Year stem-branch:')}</Text>
                <Text style={styles.destinyValue}>{canChiYear}</Text>
              </View>
              <View style={styles.destinyRow}>
                <Text style={styles.destinyLabel}>{l('24 Tiết Khí:', 'Solar term:')}</Text>
                <Text style={[styles.destinyValue, styles.solarTermValue]}>{solarTerm}</Text>
              </View>
              {dayHoangDaoStatus ? (
                <View style={styles.destinyRow}>
                  <Text style={styles.destinyLabel}>{l('Cát/Hắc nhật:', 'Day quality:')}</Text>
                  <Text style={styles.destinyValue}>{dayHoangDaoStatus.label}</Text>
                </View>
              ) : null}
              {typeof isLunarMonthFull === 'boolean' ? (
                <View style={styles.destinyRow}>
                  <Text style={styles.destinyLabel}>{l('Tháng âm:', 'Lunar month:')}</Text>
                  <Text style={styles.destinyValue}>{isLunarMonthFull ? l('Tháng đủ (30 ngày)', 'Full month (30 days)') : l('Tháng thiếu (29 ngày)', 'Short month (29 days)')}</Text>
                </View>
              ) : null}
            </View>

            {profile ? (
              <View style={[styles.destinyCard, styles.profileCard]}>
                <Text style={styles.destinyCardTitle}>🔮 {l('TƯƠNG QUAN BẢN MỆNH BẠN', 'YOUR DESTINY PROFILE')}</Text>
                <View style={styles.destinyRow}>
                  <Text style={styles.destinyLabel}>{l('Họ và tên:', 'Full name:')}</Text>
                  <Text style={styles.destinyValue}>{profile.fullName}</Text>
                </View>
                <View style={styles.destinyRow}>
                  <Text style={styles.destinyLabel}>{l('Con giáp:', 'Zodiac:')}</Text>
                  <Text style={styles.destinyValue}>{getZodiacEmoji(userZodiac)} {l('Tuổi', 'Sign')} {userZodiac}</Text>
                </View>
                <View style={styles.destinyRow}>
                  <Text style={styles.destinyLabel}>{l('Ngũ Hành:', 'Five element:')}</Text>
                  <Text style={styles.destinyValue}>{getNguHanhEmoji(userNguHanh)} {l('Mệnh', 'Element')} {userNguHanh}</Text>
                </View>
                {userNapAm ? (
                  <View style={styles.destinyRow}>
                    <Text style={styles.destinyLabel}>{l('Nạp Âm:', 'Na Yin:')}</Text>
                    <Text style={styles.destinyValue}>{userNapAm}</Text>
                  </View>
                ) : null}
                <Text style={styles.destinyAdvice}>
                  💡 {l('Khởi sự công việc vào các khung giờ Hoàng Đạo và hướng xuất hành phù hợp để thu hút cát khí và tài lộc.', 'Begin important activities during favorable hours and choose a suitable direction to support positive momentum.')}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(5, 5, 12, 0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#120C29',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(217, 164, 255, 0.55)',
    height: MODAL_HEIGHT,
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 15, paddingBottom: 14 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10, shadowColor: '#F7C66B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.38, shadowRadius: 6, elevation: 5 },
  headerTextStack: { flex: 1 },
  headerEyebrow: { color: '#D8B9FF', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 2 },
  headerTitle: { color: '#FFF3D6', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 240, 203, 0.10)', borderWidth: 1, borderColor: 'rgba(255, 222, 153, 0.25)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  bodyContent: { paddingBottom: 60, flexGrow: 1 },
  warningBox: { backgroundColor: '#35161C', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#991B1B' },
  warningText: { color: '#FCA5A5', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  destinyCard: { backgroundColor: '#1A1633', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2D2852' },
  profileCard: { borderColor: '#F5BA5B' },
  destinyCardTitle: { color: '#F5BA5B', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  destinyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#252044' },
  destinyLabel: { color: '#94A3B8', fontSize: 13 },
  destinyValue: { color: '#F8FAFC', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  solarTermValue: { color: '#4ADE80' },
  destinyAdvice: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 10, fontStyle: 'italic' },
});
