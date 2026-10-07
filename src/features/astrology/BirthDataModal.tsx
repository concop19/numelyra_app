import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  resolveBirthLocation,
  resolveBirthPlaceSuggestion,
  searchBirthPlaceSuggestions,
  type BirthPlaceSuggestion,
} from '../../services/astro/birthLocation';
import type { UserProfile } from '../../store/userProfile';

interface Props {
  visible: boolean;
  profile: UserProfile;
  onSave(profile: UserProfile): Promise<void>;
  onClose(): void;
}

function isValidBirthTime(value: string): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(value.trim())) return false;
  const [hour, minute] = value.trim().split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function BirthDataModal({ visible, profile, onSave, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState(profile.birthPlace ?? profile.birthLocation?.userLabel ?? '');
  const [knowsBirthTime, setKnowsBirthTime] = useState(
    profile.birthTimeAccuracy === 'exact' || (!profile.birthTimeAccuracy && !!profile.birthTime)
  );
  const [birthTime, setBirthTime] = useState(profile.birthTime ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<BirthPlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<BirthPlaceSuggestion | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPlace(profile.birthPlace ?? profile.birthLocation?.userLabel ?? '');
    setKnowsBirthTime(
      profile.birthTimeAccuracy === 'exact' || (!profile.birthTimeAccuracy && !!profile.birthTime)
    );
    setBirthTime(profile.birthTime ?? '');
    setError(null);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setSearching(false);
    setSearchError(null);
  }, [profile, visible]);

  useEffect(() => {
    if (!visible) return;
    const normalized = place.trim();
    const existingLabel = profile.birthLocation?.userLabel.trim();
    if (
      normalized.length < 3
      || normalized === existingLabel
      || selectedSuggestion?.userLabel === normalized
    ) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void searchBirthPlaceSuggestions(normalized, controller.signal)
        .then((items) => {
          setSuggestions(items);
          if (items.length === 0) setSearchError('Không tìm thấy địa điểm phù hợp.');
        })
        .catch((caught) => {
          if (caught instanceof Error && caught.name === 'AbortError') return;
          setSuggestions([]);
          setSearchError(
            caught instanceof Error ? caught.message : 'Không thể tải đề xuất địa điểm.'
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [place, profile.birthLocation?.userLabel, selectedSuggestion, visible]);

  const handleSave = async () => {
    const normalizedPlace = place.trim();
    if (normalizedPlace.length < 3) {
      setError('Vui lòng nhập thành phố hoặc khu vực nơi bạn sinh ra.');
      return;
    }
    if (knowsBirthTime && !isValidBirthTime(birthTime)) {
      setError('Giờ sinh cần đúng định dạng HH:mm, ví dụ 14:30.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const unchanged = profile.birthLocation
        && normalizedPlace.toLocaleLowerCase('vi-VN')
          === profile.birthLocation.userLabel.toLocaleLowerCase('vi-VN');
      const birthLocation = unchanged && profile.birthLocation
        ? profile.birthLocation
        : selectedSuggestion?.userLabel === normalizedPlace
          ? resolveBirthPlaceSuggestion(selectedSuggestion)
          : await resolveBirthLocation(normalizedPlace);
      await onSave({
        ...profile,
        birthPlace: birthLocation.userLabel,
        birthLocation,
        birthTime: knowsBirthTime ? birthTime.trim().padStart(5, '0') : undefined,
        birthTimeAccuracy: knowsBirthTime ? 'exact' : 'unknown',
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu dữ liệu nơi sinh.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <LinearGradient
          colors={['#0D1E4D', '#080E29', '#050718']}
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 8) }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>HOÀN THIỆN LÁ SỐ</Text>
              <Text style={styles.title}>Nơi sinh & giờ sinh</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Đóng" style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="#ECF9FF" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#66E5FF" />
              <Text style={styles.privacyText}>
                Numelyra dùng tên nơi sinh để xác định múi giờ và 12 nhà. Ứng dụng không đọc GPS hiện tại và không gửi tọa độ thô cho AI.
              </Text>
            </View>

            <Text style={styles.label}>Nơi sinh</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location-outline" size={20} color="#78DDF5" />
              <TextInput
                value={place}
                onChangeText={(value) => {
                  setPlace(value);
                  setSelectedSuggestion(null);
                  setError(null);
                }}
                style={styles.input}
                placeholder="Ví dụ: Hà Nội, Việt Nam"
                placeholderTextColor="#70819E"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
                returnKeyType="done"
              />
            </View>
            <Text style={styles.hint}>Ghi thêm tỉnh hoặc quốc gia nếu có nhiều địa danh trùng tên.</Text>

            {(searching || suggestions.length > 0 || searchError) && (
              <View style={styles.suggestionPanel}>
                {searching && (
                  <View style={styles.searchStatus}>
                    <ActivityIndicator size="small" color="#71E7FF" />
                    <Text style={styles.searchStatusText}>Đang tìm địa điểm…</Text>
                  </View>
                )}
                {!searching && suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.placeId}
                    activeOpacity={0.74}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setSelectedSuggestion(suggestion);
                      setPlace(suggestion.userLabel);
                      setSuggestions([]);
                      setSearchError(null);
                    }}
                  >
                    <Ionicons name="location-outline" size={18} color="#71E7FF" />
                    <View style={styles.suggestionCopy}>
                      <Text style={styles.suggestionPrimary}>{suggestion.primaryText}</Text>
                      {!!suggestion.secondaryText && (
                        <Text numberOfLines={1} style={styles.suggestionSecondary}>
                          {suggestion.secondaryText}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                {!searching && !!searchError && (
                  <Text style={styles.searchError}>{searchError}</Text>
                )}
                <Text style={styles.nativeGeocoderNote}>Đề xuất từ dịch vụ địa điểm của thiết bị</Text>
              </View>
            )}

            <Text style={styles.label}>Bạn có biết chính xác giờ sinh?</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceButton, knowsBirthTime && styles.choiceButtonActive]}
                onPress={() => setKnowsBirthTime(true)}
              >
                <Text style={[styles.choiceText, knowsBirthTime && styles.choiceTextActive]}>Có</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, !knowsBirthTime && styles.choiceButtonActive]}
                onPress={() => setKnowsBirthTime(false)}
              >
                <Text style={[styles.choiceText, !knowsBirthTime && styles.choiceTextActive]}>Không rõ</Text>
              </TouchableOpacity>
            </View>

            {knowsBirthTime && (
              <>
                <Text style={styles.label}>Giờ sinh (24 giờ)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="time-outline" size={20} color="#78DDF5" />
                  <TextInput
                    value={birthTime}
                    onChangeText={setBirthTime}
                    style={styles.input}
                    placeholder="14:30"
                    placeholderTextColor="#70819E"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    editable={!saving}
                  />
                </View>
              </>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#FF92A3" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={saving}
              style={[styles.saveButton, saving && styles.disabled]}
              onPress={() => void handleSave()}
            >
              {saving ? (
                <ActivityIndicator color="#061126" />
              ) : (
                <Ionicons name="sparkles" size={19} color="#061126" />
              )}
              <Text style={styles.saveText}>{saving ? 'Đang dựng dữ liệu lá số…' : 'Lưu và phân tích lại'}</Text>
            </TouchableOpacity>

            {!profile.birthLocation && (
              <TouchableOpacity disabled={saving} style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterText}>Để sau — dùng phân tích theo ngày sinh</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,3,16,0.68)' },
  sheet: {
    maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(104,220,255,0.42)', overflow: 'hidden',
  },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: 'rgba(190,232,255,0.48)', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(126,216,255,0.24)' },
  titleBlock: { flex: 1 },
  eyebrow: { color: '#71E7FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#FFFFFF', fontSize: 22, fontFamily: 'serif', marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(85,164,217,0.14)', borderWidth: 1, borderColor: 'rgba(152,225,255,0.25)' },
  content: { padding: 20, paddingBottom: 10 },
  privacyNote: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(21,72,112,0.38)', borderWidth: 1, borderColor: 'rgba(102,229,255,0.25)', marginBottom: 18 },
  privacyText: { flex: 1, color: '#C6DAE9', fontSize: 12, lineHeight: 18 },
  label: { color: '#DDEAF5', fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 12 },
  inputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(118,205,244,0.38)', backgroundColor: 'rgba(11,25,58,0.84)', paddingHorizontal: 13 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  hint: { color: '#8398B3', fontSize: 11, lineHeight: 16, marginTop: 6 },
  suggestionPanel: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(113,231,255,0.25)', backgroundColor: 'rgba(7,19,49,0.96)', overflow: 'hidden' },
  searchStatus: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchStatusText: { color: '#BBD4E5', fontSize: 12, fontWeight: '600' },
  suggestionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(124,204,238,0.16)' },
  suggestionCopy: { flex: 1 },
  suggestionPrimary: { color: '#F2FAFF', fontSize: 13, fontWeight: '800' },
  suggestionSecondary: { color: '#8FA8BF', fontSize: 11, marginTop: 3 },
  searchError: { color: '#F6BBC5', fontSize: 11, lineHeight: 16, paddingHorizontal: 13, paddingVertical: 11 },
  nativeGeocoderNote: { color: '#8EA1B7', fontSize: 9, fontWeight: '600', textAlign: 'right', paddingHorizontal: 10, paddingVertical: 6 },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choiceButton: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(126,173,210,0.32)', backgroundColor: 'rgba(15,29,64,0.72)' },
  choiceButtonActive: { borderColor: '#65DDF6', backgroundColor: 'rgba(32,137,181,0.32)' },
  choiceText: { color: '#97A9C0', fontWeight: '700' },
  choiceTextActive: { color: '#F1FCFF' },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 13, backgroundColor: 'rgba(122,31,55,0.28)' },
  errorText: { flex: 1, color: '#FFD1D8', fontSize: 12, lineHeight: 18 },
  saveButton: { marginTop: 22, height: 52, borderRadius: 26, backgroundColor: '#6FE5FF', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', shadowColor: '#36CCFF', shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  saveText: { color: '#061126', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.65 },
  laterButton: { alignSelf: 'center', paddingVertical: 15, paddingHorizontal: 10 },
  laterText: { color: '#91A8C0', fontSize: 12, fontWeight: '600' },
});
