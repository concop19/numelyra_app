import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { AstroFortuneQuota } from '../../services/astro/astroFortuneService';
import type { ProfileItem } from '../../store/userProfile';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  profile: ProfileItem | null;
  quota: AstroFortuneQuota | null;
  onCancel(): void;
  onCompleteBirthData(): void;
  onCreate(): void;
}

function hasExactBirthTime(profile: ProfileItem): boolean {
  if (!profile.birthTime?.trim()) return false;
  return profile.birthTimeAccuracy ? profile.birthTimeAccuracy === 'exact' : true;
}

export function AstrologyProfileFortunePrompt({
  profile,
  quota,
  onCancel,
  onCompleteBirthData,
  onCreate,
}: Props) {
  const { l } = useLocalization();
  if (!profile) return null;

  const missingBirthTime = !hasExactBirthTime(profile);
  const missingBirthLocation = !profile.birthLocation;
  const hasMissingBirthData = missingBirthTime || missingBirthLocation;
  const missingDataLabel = missingBirthTime && missingBirthLocation
    ? l('giờ sinh và nơi sinh', 'birth time and birth place')
    : missingBirthTime
      ? l('giờ sinh', 'birth time')
      : l('nơi sinh', 'birth place');

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          accessibilityLabel={l('Hủy tạo Fortune', 'Cancel Fortune creation')}
          activeOpacity={1}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['#17275E', '#11163F', '#090C27']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconHalo}>
            <Ionicons name="sparkles" size={25} color="#FFE58E" />
          </View>

          <Text style={styles.eyebrow}>{l('FORTUNE THEO HỒ SƠ', 'PROFILE-BASED FORTUNE')}</Text>
          <Text style={styles.title}>
            {l(`Tạo Fortune cho ${profile.fullName}?`, `Create a Fortune for ${profile.fullName}?`)}
          </Text>
          <Text style={styles.body}>
            {l(
              'Fortune hôm nay sẽ dựa trên dữ liệu sinh của hồ sơ này. Nếu chưa có Fortune hôm nay, hệ thống sẽ tạo mới và sử dụng 1 lượt.',
              "Today's Fortune will use this profile's birth data. If none exists for today, a new Fortune will be created and use 1 allowance.",
            )}
          </Text>

          {quota && (
            <View style={styles.quotaPill}>
              <Ionicons name="planet-outline" size={16} color="#FFE58E" />
              <Text style={styles.quotaText}>
                {l(
                  `Còn ${quota.remaining}/${quota.limit} lượt hôm nay`,
                  `${quota.remaining}/${quota.limit} remaining today`,
                )}
              </Text>
            </View>
          )}

          {hasMissingBirthData && (
            <View style={styles.warningCard}>
              <Ionicons name="information-circle-outline" size={22} color="#74E5FF" />
              <Text style={styles.warningText}>
                {l(
                  `Hồ sơ đang thiếu ${missingDataLabel}. Hãy bổ sung để xác định cung Mọc, 12 nhà và nhận lời khuyên chính xác hơn.`,
                  `This profile is missing ${missingDataLabel}. Add it to calculate the Ascendant and 12 houses for more accurate guidance.`,
                )}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {hasMissingBirthData && (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.84}
                onPress={onCompleteBirthData}
                style={styles.primaryButton}
              >
                <LinearGradient
                  colors={['#FFE58E', '#F0A95E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Ionicons name="create-outline" size={18} color="#25173E" />
                  <Text style={styles.primaryText}>{l('Bổ sung rồi tạo', 'Complete and create')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onCreate}
              style={[styles.secondaryButton, !hasMissingBirthData && styles.createButton]}
            >
              <Ionicons name="sparkles-outline" size={18} color="#F7E8FF" />
              <Text style={styles.secondaryText}>
                {hasMissingBirthData ? l('Vẫn tạo Fortune', 'Create anyway') : l('Tạo Fortune', 'Create Fortune')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{l('Hủy', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(3, 5, 20, 0.76)',
  },
  card: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 225, 139, 0.34)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.44,
    shadowRadius: 28,
    elevation: 18,
  },
  iconHalo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
    backgroundColor: 'rgba(130, 78, 196, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 229, 142, 0.48)',
  },
  eyebrow: { color: '#D4BEFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.45 },
  title: { color: '#FFF5D3', fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  body: { color: '#D8D8EA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 11 },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 15,
    backgroundColor: 'rgba(111, 70, 161, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 229, 142, 0.2)',
  },
  quotaText: { color: '#FFF0BA', fontSize: 12, fontWeight: '800' },
  warningCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    borderRadius: 16,
    padding: 13,
    backgroundColor: 'rgba(35, 123, 161, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(116, 229, 255, 0.28)',
  },
  warningText: { flex: 1, color: '#DDF9FF', fontSize: 13, lineHeight: 19 },
  actions: { width: '100%', marginTop: 18, gap: 10 },
  primaryButton: { borderRadius: 15, overflow: 'hidden' },
  primaryGradient: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryText: { color: '#25173E', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(129, 79, 190, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(218, 184, 255, 0.34)',
  },
  createButton: { backgroundColor: '#7449B6', borderColor: 'rgba(255, 229, 142, 0.46)' },
  secondaryText: { color: '#F7E8FF', fontSize: 14, fontWeight: '800' },
  cancelButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#AAA6C1', fontSize: 14, fontWeight: '700' },
});
