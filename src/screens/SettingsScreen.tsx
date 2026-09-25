import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../store/authContext';
import { beginCheckout, getBillingStatus, type BillingProvider, type BillingStatus } from '../services/billingService';

interface Props {
  onRequestLogin: () => void;
}

export default function SettingsScreen({ onRequestLogin }: Props) {
  const { user, isConfigured, signOut, syncLocalProfiles } = useAuth();
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BillingProvider>('payos');
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState('');

  const refreshBilling = useCallback(async () => {
    if (!user) {
      setBilling(null);
      setBillingError('');
      return;
    }

    try {
      setBillingError('');
      const status = await getBillingStatus();
      setBilling(status);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Không thể tải trạng thái gói Pro.');
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void refreshBilling();
  }, [refreshBilling]));

  // Payment is completed in the browser. Reload entitlement whenever the app
  // returns to the foreground so the Pro badge updates without reopening it.
  useFocusEffect(useCallback(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshBilling();
    });
    return () => subscription.remove();
  }, [refreshBilling]));

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Không thể đăng xuất', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      await syncLocalProfiles();
      Alert.alert('Đã đồng bộ', 'Hồ sơ trên thiết bị đã được liên kết với tài khoản của bạn.');
    } finally {
      setBusy(false);
    }
  };

  const upgrade = async () => {
    if (!user) {
      onRequestLogin();
      return;
    }

    setBusy(true);
    setBillingError('');
    try {
      await beginCheckout(paymentMethod);
      // Android resolves as soon as Chrome Custom Tabs opens; iOS resolves on
      // dismissal. Refreshing in either case is harmless and AppState handles
      // the definitive refresh after the payment page is finished.
      await refreshBilling();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể mở trang thanh toán.';
      if (/sign in|đăng nhập|not_authenticated/i.test(message)) {
        onRequestLogin();
      } else {
        setBillingError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const activeUntil = billing?.subscription?.current_period_end
    ? new Date(billing.subscription.current_period_end).toLocaleDateString('vi-VN')
    : null;
  const isPro = billing?.plan === 'pro';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.sky}>
        <Text style={styles.moon}>☾</Text>
        <Text style={[styles.star, styles.starOne]}>✦</Text>
        <Text style={[styles.star, styles.starTwo]}>✧</Text>
        <Text style={[styles.star, styles.starThree]}>✦</Text>
        <View style={styles.orbit} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cài đặt</Text>
        <Text style={styles.subtitle}>Tài khoản và hành trình NUMELYRA của bạn</Text>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={styles.accountIcon}><Text style={styles.accountIconText}>●</Text></View>
            <Text style={styles.cardTitle}>TÀI KHOẢN</Text>
          </View>
          {user ? (
            <>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.helper}>Hồ sơ trên thiết bị sẽ được đồng bộ với tài khoản này.</Text>
              <Action label="Đồng bộ hồ sơ" onPress={sync} disabled={busy} />
              <Action label="Đăng xuất" onPress={handleSignOut} disabled={busy} danger />
            </>
          ) : (
            <>
              <Text style={styles.helper}>{isConfigured ? 'Bạn đang trải nghiệm với tư cách Khách. Đăng nhập để đồng bộ dữ liệu giữa các thiết bị.' : 'Chưa cấu hình Supabase. Chế độ Khách vẫn hoạt động trên thiết bị này.'}</Text>
              <Action label={isConfigured ? 'Đăng nhập hoặc tạo tài khoản' : 'Xem hướng dẫn cấu hình'} onPress={onRequestLogin} />
            </>
          )}
          {busy && <ActivityIndicator color="#F5BA5B" style={styles.loader} />}
        </View>

        <View style={styles.proCard}>
          <View style={styles.proHeading}>
            <View style={styles.proHeadingCopy}>
              <View style={styles.crownIcon}><Text style={styles.crownIconText}>♛</Text></View>
              <View style={styles.proText}>
                <Text style={styles.cardTitle}>NUMELYRA PRO</Text>
                <Text style={styles.proTitle}>{isPro ? 'Bạn đang dùng Pro ✦' : 'Mở khóa hành trình đầy đủ'}</Text>
              </View>
            </View>
            <View style={[styles.planBadge, isPro && styles.planBadgeActive]}>
              <Text style={[styles.planBadgeText, isPro && styles.planBadgeTextActive]}>{isPro ? 'PRO' : 'FREE'}</Text>
            </View>
          </View>

          {isPro ? (
            <Text style={styles.helper}>{billing?.subscription?.provider === 'payos' ? 'Pro qua VietQR / PayOS' : 'Pro qua PayPal'}{activeUntil ? ` · hiệu lực đến ${activeUntil}` : ''}</Text>
          ) : (
            <>
              <Text style={styles.helper}>Tăng lượt luận giải AI, tạo nhiều hình nền hơn và mở khóa các trải bài chuyên sâu.</Text>

              <Text style={styles.paymentLabel}>CHỌN PHƯƠNG THỨC THANH TOÁN</Text>
              <View style={styles.paymentRow}>
                <PaymentMethod
                  provider="payos"
                  selected={paymentMethod === 'payos'}
                  title="VietQR / PayOS"
                  detail="79.000đ · 30 ngày"
                  icon="▣"
                  onPress={setPaymentMethod}
                />
                <PaymentMethod
                  provider="paypal"
                  selected={paymentMethod === 'paypal'}
                  title="PayPal"
                  detail="$3.99 · mỗi tháng"
                  icon="P"
                  onPress={setPaymentMethod}
                />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={upgrade}
                activeOpacity={0.85}
                style={[styles.upgradeButton, busy && styles.disabled]}
              >
                {busy ? <ActivityIndicator color="#110F20" /> : <Text style={styles.upgradeButtonText}>{user ? (paymentMethod === 'payos' ? 'THANH TOÁN VIETQR  →' : 'ĐĂNG KÝ QUA PAYPAL  →') : 'ĐĂNG NHẬP ĐỂ NÂNG CẤP  →'}</Text>}
              </TouchableOpacity>
            </>
          )}
          {!!billing?.checkoutPending && <Text style={styles.warning}>Bạn có một yêu cầu PayPal chưa hoàn tất. Hãy xác nhận hoặc quay lại website để hủy yêu cầu đó trước khi thử lại.</Text>}
          {!!billingError && <Text accessibilityRole="alert" style={styles.error}>{billingError}</Text>}
          {user && <TouchableOpacity disabled={busy} onPress={() => void refreshBilling()} style={styles.refreshButton}><Text style={styles.refreshText}>↻ Cập nhật trạng thái Pro</Text></TouchableOpacity>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ label, onPress, disabled, danger = false }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.action, danger && styles.dangerAction, disabled && styles.disabled]}><Text style={[styles.actionText, danger && styles.dangerText]}>{label}</Text></TouchableOpacity>;
}

function PaymentMethod({ provider, selected, title, detail, icon, onPress }: {
  provider: BillingProvider;
  selected: boolean;
  title: string;
  detail: string;
  icon: string;
  onPress: (provider: BillingProvider) => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onPress(provider)}
      activeOpacity={0.8}
      style={[styles.paymentMethod, selected && styles.paymentMethodSelected]}
    >
      <View style={styles.paymentTopRow}>
        <Text style={[styles.paymentIcon, selected && styles.paymentTextSelected]}>{icon}</Text>
        <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
      </View>
      <Text style={[styles.paymentTitle, selected && styles.paymentTextSelected]}>{title}</Text>
      <Text style={styles.paymentDetail}>{detail}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0E092B' },
  sky: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  moon: { position: 'absolute', top: 12, right: 22, color: '#FFE7A0', fontSize: 86, lineHeight: 92, transform: [{ rotate: '-18deg' }], opacity: 0.95 },
  star: { position: 'absolute', color: '#F8B7FF', fontSize: 16 },
  starOne: { top: 112, left: 26 },
  starTwo: { top: 76, left: 164, color: '#FFE29A', fontSize: 12 },
  starThree: { top: 188, right: 52, color: '#FFD779', fontSize: 20 },
  orbit: { position: 'absolute', top: -105, right: -92, width: 330, height: 250, borderWidth: 1, borderColor: 'rgba(235, 157, 255, 0.32)', borderRadius: 180, transform: [{ rotate: '25deg' }] },
  content: { paddingHorizontal: 17, paddingTop: 10, paddingBottom: 30 },
  title: { color: '#FCF5FF', fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: 0.2 },
  subtitle: { color: '#B8A8D8', fontSize: 14, marginTop: 3, marginBottom: 18 },
  card: { backgroundColor: 'rgba(32, 22, 72, 0.88)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 111, 211, 0.55)', padding: 17, marginBottom: 14 },
  proCard: { backgroundColor: 'rgba(32, 22, 72, 0.92)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(236, 129, 190, 0.52)', padding: 17, marginBottom: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#C88CF1', backgroundColor: '#282057', alignItems: 'center', justifyContent: 'center' },
  accountIconText: { color: '#FFD36E', fontSize: 28, lineHeight: 26 },
  cardTitle: { color: '#FFD16D', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
  proHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  proHeadingCopy: { flexDirection: 'row', flex: 1, minWidth: 0, gap: 12 },
  proText: { flex: 1, minWidth: 0 },
  crownIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#C88CF1', backgroundColor: '#282057', alignItems: 'center', justifyContent: 'center' },
  crownIconText: { color: '#FFD36E', fontSize: 26 },
  proTitle: { color: '#FCF5FF', fontSize: 21, lineHeight: 26, fontWeight: '900', marginTop: 6, flexShrink: 1 },
  planBadge: { backgroundColor: '#27204A', borderWidth: 1, borderColor: '#66518E', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16 },
  planBadgeActive: { backgroundColor: '#F5BA5B', borderColor: '#FFD77F' },
  planBadgeText: { color: '#C7B9E4', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  planBadgeTextActive: { color: '#110F20' },
  email: { color: '#FCF5FF', fontSize: 17, fontWeight: '800', marginTop: 13 },
  helper: { color: '#BBAED6', fontSize: 14, lineHeight: 21, marginTop: 10 },
  action: { marginTop: 15, minHeight: 55, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFD15F', backgroundColor: '#392261' },
  actionText: { color: '#FFE08A', fontSize: 16, fontWeight: '900' },
  dangerAction: { borderColor: '#B21E74', backgroundColor: 'rgba(89, 18, 75, 0.48)' },
  dangerText: { color: '#FDA4AF' },
  disabled: { opacity: 0.55 },
  loader: { marginTop: 13 },
  paymentLabel: { color: '#C6B8E3', fontSize: 13, fontWeight: '900', letterSpacing: 0.7, marginTop: 19, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', gap: 9 },
  paymentMethod: { flex: 1, minHeight: 128, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#45366D', backgroundColor: 'rgba(24, 18, 59, 0.76)' },
  paymentMethodSelected: { borderColor: '#FFD25F', backgroundColor: 'rgba(67, 41, 88, 0.78)' },
  paymentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentIcon: { color: '#B6AFC9', fontSize: 25, fontWeight: '900' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#72589B', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#FFD25F', backgroundColor: '#FFD25F' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4D2B60' },
  paymentTitle: { color: '#F2EAFB', fontSize: 15, fontWeight: '900', marginTop: 14 },
  paymentDetail: { color: '#ADA2C5', fontSize: 12, marginTop: 5 },
  paymentTextSelected: { color: '#F5D27B' },
  upgradeButton: { minHeight: 56, marginTop: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD979', borderWidth: 1, borderColor: '#FFF1AA' },
  upgradeButtonText: { color: '#211443', fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  warning: { color: '#FCD34D', fontSize: 12, lineHeight: 18, marginTop: 12 },
  error: { color: '#FDA4AF', fontSize: 12, lineHeight: 18, marginTop: 12 },
  refreshButton: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 12, marginTop: 5 },
  refreshText: { color: '#C6BDD9', fontSize: 12, textDecorationLine: 'underline' },
});
