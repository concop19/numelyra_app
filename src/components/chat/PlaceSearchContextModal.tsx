import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlaceBudget, PlaceCompanion, PlaceSearchPreferences } from '../../services/placeLocation';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onUseCurrentLocation: (preferences: PlaceSearchPreferences) => Promise<void>;
}

const distanceOptions = [2, 5, 10];
const budgets: Array<{ value: PlaceBudget; label: string }> = [
  { value: 'low', label: 'Tiết kiệm' },
  { value: 'medium', label: 'Vừa phải' },
  { value: 'flexible', label: 'Linh hoạt' },
];
const companions: Array<{ value: PlaceCompanion; label: string }> = [
  { value: 'solo', label: 'Một mình' },
  { value: 'date', label: 'Hẹn hò' },
  { value: 'friends', label: 'Bạn bè' },
  { value: 'family', label: 'Gia đình' },
];

export function PlaceSearchContextModal({ visible, onCancel, onUseCurrentLocation }: Props) {
  const [maxDistanceKm, setMaxDistanceKm] = useState(5);
  const [budget, setBudget] = useState<PlaceBudget>('medium');
  const [companion, setCompanion] = useState<PlaceCompanion>('solo');
  const [openNow, setOpenNow] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const preferences: PlaceSearchPreferences = { maxDistanceKm, budget, companion, openNow };

  const chooseCurrentLocation = async () => {
    setError('');
    setIsLocating(true);
    try {
      await onUseCurrentLocation(preferences);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lấy được vị trí. Bạn có thể nhập khu vực thay thế.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headingRow}>
            <View style={styles.headingIcon}><Ionicons name="location-outline" size={20} color="#FFD28B" /></View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Dùng vị trí để tìm nơi phù hợp</Text>
              <Text style={styles.subtitle}>Vị trí chỉ dùng cho lần tìm này, không lưu lại.</Text>
            </View>
          </View>

          <Text style={styles.label}>Khoảng cách tối đa</Text>
          <View style={styles.optionRow}>
            {distanceOptions.map((value) => (
              <ChoiceChip key={value} label={`${value} km`} active={maxDistanceKm === value} onPress={() => setMaxDistanceKm(value)} />
            ))}
          </View>

          <Text style={styles.label}>Ngân sách</Text>
          <View style={styles.optionRow}>
            {budgets.map((item) => (
              <ChoiceChip key={item.value} label={item.label} active={budget === item.value} onPress={() => setBudget(item.value)} />
            ))}
          </View>

          <Text style={styles.label}>Đi cùng</Text>
          <View style={styles.optionRow}>
            {companions.map((item) => (
              <ChoiceChip key={item.value} label={item.label} active={companion === item.value} onPress={() => setCompanion(item.value)} />
            ))}
          </View>

          <TouchableOpacity style={styles.openNowRow} onPress={() => setOpenNow((value) => !value)} activeOpacity={0.8}>
            <Ionicons name={openNow ? 'checkbox' : 'square-outline'} size={20} color={openNow ? '#FFD28B' : '#B6ABC8'} />
            <Text style={styles.openNowText}>Ưu tiên nơi đang mở</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.primaryButton, isLocating && styles.disabledButton]} onPress={chooseCurrentLocation} disabled={isLocating} activeOpacity={0.8}>
            {isLocating ? <ActivityIndicator color="#2D173B" /> : <Ionicons name="navigate" size={17} color="#2D173B" />}
            <Text style={styles.primaryButtonText}>{isLocating ? 'Đang xác định vị trí' : 'Dùng vị trí hiện tại'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>Để sau</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6, 4, 12, 0.74)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#191326', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#3E315A' },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  headingIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 210, 139, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headingCopy: { flex: 1 },
  title: { color: '#F9F5FF', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#B6ABC8', fontSize: 12, marginTop: 3 },
  label: { color: '#DAD0E7', fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#241B35', borderRadius: 10, borderWidth: 1, borderColor: '#45355E', paddingHorizontal: 11, paddingVertical: 8 },
  chipActive: { backgroundColor: 'rgba(255, 210, 139, 0.14)', borderColor: '#FFD28B' },
  chipText: { color: '#C8BDD8', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFD28B' },
  openNowRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  openNowText: { color: '#E8E0F0', fontSize: 13, fontWeight: '600' },
  error: { color: '#FCA5A5', fontSize: 12, lineHeight: 17, marginTop: 12 },
  primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: '#FFD28B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#2D173B', fontSize: 14, fontWeight: '800' },
  cancelButton: { alignItems: 'center', paddingVertical: 13 },
  cancelButtonText: { color: '#A99EBA', fontSize: 13, fontWeight: '600' },
});
