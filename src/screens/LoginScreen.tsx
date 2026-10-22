import React, { useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ThreeDButton from '../components/ThreeDButton';
import { useAuth } from '../store/authContext';
import { useLocalization } from '../i18n/LocalizationContext';

const MASCOT = require('../../assets/giao_dien/Whimsical Flame Mascot Reading a Grimoire.png');

interface Props {
  onAuthenticated: () => void;
  onContinueAsGuest: () => void;
  allowGuest?: boolean;
}

export default function LoginScreen({ onAuthenticated, onContinueAsGuest, allowGuest = true }: Props) {
  const { signIn, signUp, signInWithGoogle, signInWithFacebook, isConfigured } = useAuth();
  const { locale } = useLocalization();
  const en = locale === 'en';
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    setError('');
    setMessage('');
    try {
      await signInWithGoogle();
      onAuthenticated();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : (en ? 'Google sign-in failed. Please try again.' : 'Đăng nhập Google thất bại. Vui lòng thử lại.'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacebookLoading(true);
    setError('');
    setMessage('');
    try {
      await signInWithFacebook();
      onAuthenticated();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : (en ? 'Facebook sign-in failed. Please try again.' : 'Đăng nhập Facebook thất bại. Vui lòng thử lại.'));
    } finally {
      setFacebookLoading(false);
    }
  };

  const submit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError(en ? 'Enter a valid email address.' : 'Hãy nhập một địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError(en ? 'Password must contain at least 6 characters.' : 'Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setError(en ? 'Enter your name to create an account.' : 'Hãy nhập tên của bạn để tạo tài khoản.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (isSignUp) {
        const result = await signUp(normalizedEmail, password, fullName);
        if (result.needsEmailConfirmation) {
          setMessage(en ? 'Your account was created. Confirm your email, then sign in.' : 'Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận, rồi đăng nhập lại.');
          setIsSignUp(false);
          return;
        }
      } else {
        await signIn(normalizedEmail, password);
      }
      onAuthenticated();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : (en ? 'Unable to sign in. Please try again.' : 'Không thể đăng nhập. Vui lòng thử lại.'));
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
            <Text style={styles.eyebrow}>✦ {en ? 'WELCOME TO' : 'CHÀO MỪNG ĐẾN VỚI'}</Text>
            <Text style={styles.brand}>NUMELYRA</Text>
            <Text style={styles.tagline}>{en ? 'Unlock your magic ♡' : 'Đánh thức phép màu của bạn ♡'}</Text>
            <Text style={styles.description}>{isSignUp ? (en ? 'Create an account to sync your journey.' : 'Tạo tài khoản để đồng bộ hành trình của bạn.') : (en ? 'Sign in to save and sync your journey.' : 'Đăng nhập để lưu và đồng bộ hành trình của bạn.')}</Text>

            {/* NÚT ĐĂNG NHẬP GOOGLE */}
            <ThreeDButton
              accessibilityLabel={en ? 'Continue with Google' : 'Tiếp tục với Google'}
              disabled={loading || googleLoading || facebookLoading || !isConfigured}
              fullWidth
              label={en ? 'Continue with Google' : 'Tiếp tục với Google'}
              leadingIcon={(
                <View style={styles.googleIconBadge}>
                  <Text style={styles.googleIconG}>G</Text>
                </View>
              )}
              loading={googleLoading}
              onPress={handleGoogleSignIn}
              style={styles.oauthButton3d}
              textStyle={styles.oauthButtonText}
              variant="light"
            />

            {/* NÚT ĐĂNG NHẬP FACEBOOK */}
            <ThreeDButton
              accessibilityLabel={en ? 'Continue with Facebook' : 'Tiếp tục với Facebook'}
              disabled={loading || googleLoading || facebookLoading || !isConfigured}
              fullWidth
              label={en ? 'Continue with Facebook' : 'Tiếp tục với Facebook'}
              leadingIcon={(
                <View style={styles.fbIconBadge}>
                  <Ionicons name="logo-facebook" size={16} color="#FFFFFF" />
                </View>
              )}
              loading={facebookLoading}
              onPress={handleFacebookSignIn}
              style={styles.oauthButton3d}
              textStyle={styles.oauthButtonText}
              variant="light"
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{en ? 'OR WITH EMAIL' : 'HOẶC VỚI EMAIL'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {isSignUp && (
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={en ? 'Full name' : 'Họ và tên'}
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
                placeholder={en ? 'Password' : 'Mật khẩu'}
                placeholderTextColor="#B68179"
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'password'}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity activeOpacity={0.7} accessibilityRole="button" onPress={() => { void Haptics.selectionAsync(); setShowPassword((value) => !value); }} style={styles.showButton}>
                <Text style={styles.showButtonText}>{showPassword ? (en ? 'HIDE' : 'ẨN') : (en ? 'SHOW' : 'HIỆN')}</Text>
              </TouchableOpacity>
            </View>

            {!isConfigured && <Text style={styles.error}>{en ? 'Supabase is not configured. You can still continue as a guest.' : 'Chưa có cấu hình Supabase cho mobile app. Bạn vẫn có thể dùng chế độ Khách.'}</Text>}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <ThreeDButton
              disabled={loading || googleLoading || facebookLoading || !isConfigured}
              fullWidth
              label={isSignUp ? (en ? 'CREATE ACCOUNT' : 'TẠO TÀI KHOẢN') : (en ? 'SIGN IN' : 'ĐĂNG NHẬP')}
              loading={loading}
              onPress={submit}
              size="lg"
              style={styles.submit3d}
              trailingIcon={<Ionicons name="arrow-forward" size={18} color="#3F205C" />}
              variant="brand"
            />

            <TouchableOpacity activeOpacity={0.7} accessibilityRole="button" onPress={() => { void Haptics.selectionAsync(); setIsSignUp((value) => !value); setError(''); setMessage(''); }} style={styles.modeButton}>
              <Text style={styles.modeText}>{isSignUp ? (en ? 'Already have an account? ' : 'Đã có tài khoản? ') : (en ? 'New to Numelyra? ' : 'Chưa có tài khoản? ')}<Text style={styles.modeEmphasis}>{isSignUp ? (en ? 'Sign in' : 'Đăng nhập') : (en ? 'Create account' : 'Tạo tài khoản')}</Text></Text>
            </TouchableOpacity>
            {allowGuest && (
              <TouchableOpacity activeOpacity={0.7} accessibilityRole="button" onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onContinueAsGuest(); }} style={styles.guestButton}>
                <Text style={styles.guestText}>{en ? 'Continue as guest' : 'Tiếp tục với tư cách Khách'}</Text>
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
  submit3d: { marginTop: 16 },
  error: { color: '#A33126', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  message: { color: '#3D7A50', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  modeButton: { alignItems: 'center', paddingTop: 17, paddingBottom: 8 },
  modeText: { color: '#8E5E58', fontSize: 13 },
  modeEmphasis: { color: '#EC4938', fontWeight: '800' },
  guestButton: { alignItems: 'center', paddingVertical: 8 },
  guestText: { color: '#A54A3A', fontSize: 12, textDecorationLine: 'underline' },
  googleButton3d: { marginBottom: 8 },
  oauthButton3d: { marginBottom: 8 },
  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconG: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  fbIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  oauthButtonText: {
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
