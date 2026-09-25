/**
 * OnboardingScreen.tsx - Màn hình nhập thông tin lần đầu
 */
import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { saveProfile, UserProfile } from '../store/userProfile';

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [fullName, setFullName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên của bạn.');
      return;
    }

    const d = parseInt(birthDay, 10);
    const m = parseInt(birthMonth, 10);
    const y = parseInt(birthYear, 10);

    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1920 || y > 2025) {
      Alert.alert('Ngày sinh không hợp lệ', 'Vui lòng kiểm tra lại ngày/tháng/năm sinh.');
      return;
    }

    const birthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    setSaving(true);
    try {
      const profile: UserProfile = { fullName: fullName.trim(), birthDate, gender };
      await saveProfile(profile);
      onComplete();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Mascot */}
        <View style={styles.mascotContainer}>
          <Text style={styles.mascotEmoji}>🐱</Text>
          <Text style={styles.mascotGlow}>✨</Text>
        </View>

        <Text style={styles.title}>Xin chào, tôi là Tiểu Linh Miêu!</Text>
        <Text style={styles.subtitle}>
          Hãy cho tôi biết đôi điều về bạn để tôi có thể tư vấn phong thủy, lịch cá nhân và vận mệnh chính xác hơn nhé.
        </Text>

        {/* Họ tên */}
        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nguyễn Văn A"
          placeholderTextColor="#64748B"
        />

        {/* Ngày sinh */}
        <Text style={styles.label}>Ngày sinh (dương lịch)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={birthDay}
            onChangeText={setBirthDay}
            placeholder="DD"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={styles.dateSep}>/</Text>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={birthMonth}
            onChangeText={setBirthMonth}
            placeholder="MM"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={styles.dateSep}>/</Text>
          <TextInput
            style={[styles.input, styles.dateInputYear]}
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="YYYY"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            maxLength={4}
          />
        </View>

        {/* Giới tính */}
        <Text style={styles.label}>Giới tính</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'male' && styles.genderActive]}
            onPress={() => setGender('male')}
          >
            <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>👨 Nam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'female' && styles.genderActive]}
            onPress={() => setGender('female')}
          >
            <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>👩 Nữ</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>{saving ? 'Đang lưu...' : '✨ Bắt đầu hành trình'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0B14'
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center'
  },
  mascotContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16142A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F5BA5B'
  },
  mascotEmoji: {
    fontSize: 36
  },
  mascotGlow: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 20
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 16
  },
  input: {
    width: '100%',
    backgroundColor: '#1C1A32',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2E2954'
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%'
  },
  dateInput: {
    flex: 1,
    textAlign: 'center'
  },
  dateInputYear: {
    flex: 1.5,
    textAlign: 'center'
  },
  dateSep: {
    color: '#64748B',
    fontSize: 18,
    marginHorizontal: 6
  },
  genderRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1C1A32',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2954'
  },
  genderActive: {
    borderColor: '#F5BA5B',
    backgroundColor: '#26224A'
  },
  genderText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600'
  },
  genderTextActive: {
    color: '#F5BA5B'
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#F5BA5B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 36
  },
  submitText: {
    color: '#0B0B14',
    fontSize: 16,
    fontWeight: '700'
  }
});
