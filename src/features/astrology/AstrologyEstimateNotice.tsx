import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLocalization } from '../../i18n/LocalizationContext';

interface EstimateMarkProps {
  onPress(): void;
  dark?: boolean;
}

export function AstrologyEstimateMark({ onPress, dark = false }: EstimateMarkProps) {
  const { l } = useLocalization();
  return (
    <TouchableOpacity
      accessibilityLabel={l('Giải thích kết quả tạm tính', 'Explain this estimated result')}
      accessibilityRole="button"
      activeOpacity={0.72}
      hitSlop={8}
      onPress={onPress}
      style={[styles.mark, dark && styles.markDark]}
    >
      <Text style={[styles.markText, dark && styles.markTextDark]}>!</Text>
    </TouchableOpacity>
  );
}

interface EstimateNoticeProps {
  visible: boolean;
  missingBirthTime: boolean;
  missingBirthLocation: boolean;
  onClose(): void;
}

export function AstrologyEstimateNotice({
  visible,
  missingBirthTime,
  missingBirthLocation,
  onClose,
}: EstimateNoticeProps) {
  const { l } = useLocalization();
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          accessibilityLabel={l('Đóng giải thích', 'Close explanation')}
          activeOpacity={1}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.notice}>
          <View style={styles.noticeIcon}>
            <Text style={styles.noticeIconText}>!</Text>
          </View>
          <Text style={styles.noticeTitle}>{l('Kết quả đang tạm tính', 'This result is estimated')}</Text>
          <Text style={styles.noticeBody}>
            {l(
              'Nội dung chiêm tinh này vẫn được hiển thị bằng dữ liệu dự phòng của hồ sơ chính.',
              'This astrology result is still shown using fallback data from the primary profile.',
            )}
          </Text>
          {missingBirthTime && (
            <View style={styles.reasonRow}>
              <Ionicons color="#93610D" name="time-outline" size={17} />
              <Text style={styles.reasonText}>
                {l(
                  'Chưa có giờ sinh chính xác nên hệ thống đang dùng mốc 12:00 để ước tính.',
                  'An exact birth time is missing, so 12:00 is being used as an estimate.',
                )}
              </Text>
            </View>
          )}
          {missingBirthLocation && (
            <View style={styles.reasonRow}>
              <Ionicons color="#93610D" name="location-outline" size={17} />
              <Text style={styles.reasonText}>
                {l(
                  'Chưa có nơi sinh đã xác định nên múi giờ, ASC và 12 Nhà chưa thể chính xác hoàn toàn.',
                  'A resolved birth place is missing, so the time zone, Ascendant, and 12 houses cannot be fully accurate.',
                )}
              </Text>
            </View>
          )}
          <Text style={styles.noticeFootnote}>
            {l(
              'Bổ sung giờ sinh và nơi sinh trong hồ sơ chính để tăng độ chính xác.',
              'Add birth time and birth place to the primary profile for greater accuracy.',
            )}
          </Text>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{l('Đã hiểu', 'Got it')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1BF',
    borderWidth: 1,
    borderColor: '#D69A28',
    marginLeft: 4,
  },
  markDark: { backgroundColor: 'rgba(255,214,155,0.14)', borderColor: '#FFD69B' },
  markText: { color: '#8A5900', fontSize: 11, lineHeight: 13, fontWeight: '900' },
  markTextDark: { color: '#FFD69B' },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(19,10,42,0.58)',
  },
  notice: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#FFF9ED',
    borderWidth: 1,
    borderColor: '#E8C86C',
    shadowColor: '#1F1238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 14,
  },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFE9A8',
    borderWidth: 1,
    borderColor: '#D69A28',
  },
  noticeIconText: { color: '#815100', fontSize: 21, fontWeight: '900' },
  noticeTitle: { color: '#3D285C', fontSize: 19, fontWeight: '900', textAlign: 'center', marginTop: 11 },
  noticeBody: { color: '#5E526A', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 13 },
  reasonText: { flex: 1, color: '#54485F', fontSize: 12, lineHeight: 18 },
  noticeFootnote: { color: '#776785', fontSize: 11, lineHeight: 17, marginTop: 15, textAlign: 'center' },
  closeButton: {
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D4AA5',
    marginTop: 17,
  },
  closeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
