import React, { useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ThreeDButton from '../components/ThreeDButton';
import { useAuth } from '../store/authContext';
import { useLocalization } from '../i18n/LocalizationContext';

const MASCOT = require('../../assets/giao_dien/Whimsical Flame Mascot Reading a Grimoire.png');
const AUTH_BACKGROUND = require('../../assets/giao_dien/auth/auth-celestial-background-v1.png');
const INPUT_PLACEHOLDER_COLOR = '#BEB2DC';

interface Props {
  onAuthenticated: () => void;
  onContinueAsGuest: () => void;
  allowGuest?: boolean;
}

export default function LoginScreen({ onAuthenticated, onContinueAsGuest, allowGuest = true }: Props) {
  const { signIn, signUp, signInWithGoogle, isConfigured } = useAuth();
  const { locale } = useLocalization();
  const en = locale === 'en';
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const revealFocusedInput = () => {
    // Browsers already keep focused inputs visible. Forcing the nested
    // ScrollView to the end here makes the entire auth page jump on focus.
    if (Platform.OS === 'web') return;

    const keyboardAnimationDelay = Platform.OS === 'ios' ? 260 : 180;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, keyboardAnimationDelay);
  };

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
    <View style={styles.root}>
      <Image source={AUTH_BACKGROUND} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11, 8, 73, 0.18)', 'rgba(17, 8, 71, 0.34)', 'rgba(21, 7, 68, 0.72)']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          enabled={Platform.OS !== 'web'}
          keyboardVerticalOffset={0}
          style={styles.flex}
        >
          <ScrollView
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={styles.content}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Ionicons name="sparkles" size={22} color="#FFE38D" style={styles.heroSparkleLeft} />
              <Ionicons name="sparkles" size={15} color="#FFB8D7" style={styles.heroSparkleRight} />
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
              disabled={loading || googleLoading || !isConfigured}
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
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                autoCapitalize="words"
                onFocus={revealFocusedInput}
                style={styles.input}
              />
            )}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onFocus={revealFocusedInput}
              style={styles.input}
            />
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={en ? 'Password' : 'Mật khẩu'}
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'password'}
                onFocus={revealFocusedInput}
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
              disabled={loading || googleLoading || !isConfigured}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#171061' },
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 22, justifyContent: 'center' },
  hero: { alignItems: 'center', justifyContent: 'center', height: 220, overflow: 'visible' },
  heroSparkleLeft: { position: 'absolute', left: 34, top: 55 },
  heroSparkleRight: { position: 'absolute', right: 42, top: 28 },
  mascot: { width: 198, height: 219, marginTop: -12 },
  card: {
    backgroundColor: 'rgba(42, 27, 111, 0.92)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 187, 218, 0.24)',
    padding: 22,
    shadowColor: '#090322',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 10,
  },
  eyebrow: { color: '#FFD59A', fontSize: 12, fontWeight: '800', textAlign: 'center', letterSpacing: 2 },
  brand: { color: '#FFF8FE', fontSize: 34, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center', marginTop: 2, textShadowColor: 'rgba(255, 116, 179, 0.62)', textShadowRadius: 12 },
  tagline: { color: '#FFB2CF', fontSize: 17, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
  description: { color: '#DED5F3', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 14, marginBottom: 18 },
  input: { minHeight: 50, marginBottom: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(218, 185, 255, 0.28)', borderRadius: 13, backgroundColor: 'rgba(103, 78, 187, 0.32)', color: '#FFF9FE', fontSize: 15 },
  passwordRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(218, 185, 255, 0.28)', borderRadius: 13, backgroundColor: 'rgba(103, 78, 187, 0.32)' },
  passwordInput: { flex: 1, paddingHorizontal: 14, color: '#FFF9FE', fontSize: 15 },
  showButton: { paddingHorizontal: 13, paddingVertical: 12 },
  showButtonText: { color: '#FFB1CF', fontSize: 11, fontWeight: '800' },
  submit3d: { marginTop: 16 },
  error: { color: '#FFD0DA', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  message: { color: '#A8F1D0', fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  modeButton: { alignItems: 'center', paddingTop: 17, paddingBottom: 8 },
  modeText: { color: '#D7CEE9', fontSize: 13 },
  modeEmphasis: { color: '#FFADC9', fontWeight: '800' },
  guestButton: { alignItems: 'center', paddingVertical: 8 },
  guestText: { color: '#CFC5E5', fontSize: 12, textDecorationLine: 'underline' },
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
    backgroundColor: 'rgba(223, 197, 255, 0.27)',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: '#BEB2DC',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
