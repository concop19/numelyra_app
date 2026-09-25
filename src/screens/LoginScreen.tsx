import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../store/authContext';

const MASCOT = require('../../assets/giao_dien/Whimsical Flame Mascot Reading a Grimoire.png');

interface Props {
  onAuthenticated: () => void;
  onContinueAsGuest: () => void;
  allowGuest?: boolean;
}

export default function LoginScreen({ onAuthenticated, onContinueAsGuest, allowGuest = true }: Props) {
  const { signIn, signUp, signInWithGoogle, isConfigured } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    setMessage('');
    try {
      await signInWithGoogle();
      onAuthenticated();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Hãy nhập một địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setError('Hãy nhập tên của bạn để tạo tài khoản.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (isSignUp) {
        const result = await signUp(normalizedEmail, password, fullName);
        if (result.needsEmailConfirmation) {
          setMessage('Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận, rồi đăng nhập lại.');
          setIsSignUp(false);
          return;
        }
      } else {
        await signIn(normalizedEmail, password);
      }
      onAuthenticated();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={MASCOT} resizeMode="contain" style={styles.mascot} />
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>✦ WELCOME TO</Text>
            <Text style={styles.brand}>NUMELYRA</Text>
            <Text style={styles.tagline}>Unlock your magic ♡</Text>
            <Text style={styles.description}>{isSignUp ? 'Tạo tài khoản để đồng bộ hành trình của bạn.' : 'Đăng nhập để lưu và đồng bộ hành trình của bạn.'}</Text>

            {/* NÚT ĐĂNG NHẬP GOOGLE */}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={loading || googleLoading || !isConfigured}
              onPress={handleGoogleSignIn}
              activeOpacity={0.85}
              style={[styles.googleButton, (!isConfigured || loading || googleLoading) && styles.submitDisabled]}
            >
              {googleLoading ? (
                <ActivityIndicator color="#EA4335" size="small" />
              ) : (
                <>
                  <View style={styles.googleIconBadge}>
                    <Text style={styles.googleIconG}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC VỚI EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {isSignUp && (
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Họ và tên"
                placeholderTextColor="#B68179"
                autoCapitalize="words"
                style={styles.input}
              />
            )}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#B68179"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mật khẩu"
                placeholderTextColor="#B68179"
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'password'}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowPassword((value) => !value)} style={styles.showButton}>
                <Text style={styles.showButtonText}>{showPassword ? 'ẨN' : 'HIỆN'}</Text>
              </TouchableOpacity>
            </View>

            {!isConfigured && <Text style={styles.error}>Chưa có cấu hình Supabase cho mobile app. Bạn vẫn có thể dùng chế độ Khách.</Text>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <TouchableOpacity
              accessibilityRole="button"
              disabled={loading || googleLoading || !isConfigured}
              onPress={submit}
              activeOpacity={0.85}
              style={[styles.submit, (!isConfigured || loading || googleLoading) && styles.submitDisabled]}
            >
              {loading ? <ActivityIndicator color="#FFF9F5" /> : <Text style={styles.submitText}>{isSignUp ? 'TẠO TÀI KHOẢN  →' : 'ĐĂNG NHẬP  →'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" onPress={() => { setIsSignUp((value) => !value); setError(''); setMessage(''); }} style={styles.modeButton}>
              <Text style={styles.modeText}>{isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}<Text style={styles.modeEmphasis}>{isSignUp ? 'Đăng nhập' : 'Tạo tài khoản'}</Text></Text>
            </TouchableOpacity>
            {allowGuest && (
              <TouchableOpacity accessibilityRole="button" onPress={onContinueAsGuest} style={styles.guestButton}>
                <Text style={styles.guestText}>Tiếp tục với tư cách Khách</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#FFF4EC' },
  content: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  hero: { alignItems: 'center', height: 230, overflow: 'hidden' },
  mascot: { width: 245, height: 270, marginTop: -26 },
  card: { backgroundColor: '#FFFDFB', borderRadius: 26, padding: 22, shadowColor: '#C65A35', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22, elevation: 4 },
  eyebrow: { color: '#A54A3A', fontSize: 12, fontWeight: '800', textAlign: 'center', letterSpacing: 2 },
  brand: { color: '#F04435', fontSize: 34, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center', marginTop: 2 },
  tagline: { color: '#CE633C', fontSize: 17, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
  description: { color: '#8E5E58', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 14, marginBottom: 18 },
  input: { minHeight: 50, marginBottom: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#F1CFC7', borderRadius: 13, backgroundColor: '#FFF9F5', color: '#5B302B', fontSize: 15 },
  passwordRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1CFC7', borderRadius: 13, backgroundColor: '#FFF9F5' },
  passwordInput: { flex: 1, paddingHorizontal: 14, color: '#5B302B', fontSize: 15 },
  showButton: { paddingHorizontal: 13, paddingVertical: 12 },
  showButtonText: { color: '#D45B3B', fontSize: 11, fontWeight: '800' },
  submit: { minHeight: 52, marginTop: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04A38' },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#FFF9F5', fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  error: { color: '#A33126', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  message: { color: '#3D7A50', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  modeButton: { alignItems: 'center', paddingTop: 17, paddingBottom: 8 },
  modeText: { color: '#8E5E58', fontSize: 13 },
  modeEmphasis: { color: '#EC4938', fontWeight: '800' },
  guestButton: { alignItems: 'center', paddingVertical: 8 },
  guestText: { color: '#A54A3A', fontSize: 12, textDecorationLine: 'underline' },
  googleButton: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8D2CA',
    marginBottom: 8,
    shadowColor: '#C65A35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    paddingHorizontal: 16,
  },
  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconG: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1CFC7',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: '#B68179',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
