import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, AppState, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../store/authContext';
import { beginCheckout, getBillingStatus, type BillingProvider, type BillingStatus } from '../services/billingService';
import { canUseNativeNotifications, loadDailyReminderSettings, saveDailyReminderSettings, type DailyReminderSettings } from '../services/dailyNotifications';

interface Props {
  onRequestLogin: () => void;
}

export default function SettingsScreen({ onRequestLogin }: Props) {
  const { user, isConfigured, signOut, syncLocalProfiles } = useAuth();
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BillingProvider>('payos');
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState('');
  const [dailyReminder, setDailyReminder] = useState<DailyReminderSettings>({ enabled: false, hour: 20, minute: 0 });

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
  useFocusEffect(useCallback(() => { void loadDailyReminderSettings().then(setDailyReminder); }, []));

  // Payment is completed in the browser. Reload entitlement whenever the app
  // returns to the foreground so the Pro badge updates without reopening it.
  useFocusEffect(useCallback(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshBilling();
    });
    return () => subscription.remove();
  }, [refreshBilling]));

  const handleSignOut = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Đã đồng bộ', 'Hồ sơ trên thiết bị đã được liên kết với tài khoản của bạn.');
    } finally {
      setBusy(false);
    }
  };

  const upgrade = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const updateDailyReminder = async (next: DailyReminderSettings) => {
    const saved = await saveDailyReminderSettings(next);
    setDailyReminder(saved);
    if (next.enabled && !saved.enabled) Alert.alert('Chưa bật thông báo', 'Bạn có thể bật lại quyền thông báo trong Cài đặt thiết bị bất kỳ lúc nào.');
  };

  const activeUntil = billing?.subscription?.current_period_end
    ? new Date(billing.subscription.current_period_end).toLocaleDateString('vi-VN')
    : null;
  const isPro = billing?.plan === 'pro';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient pointerEvents="none" colors={['#211052', '#11082F', '#0C0625']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.sky}>
        <Text style={styles.moon}>☾</Text>
        <Text style={[styles.star, styles.starOne]}>✦</Text>
        <Text style={[styles.star, styles.starTwo]}>✧</Text>
        <Text style={[styles.star, styles.starThree]}>✦</Text>
        <View style={styles.orbit} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroHeader}>
          <Text style={styles.title}>Cài đặt</Text>
          <Text style={styles.subtitle}>Tùy chỉnh hành trình NUMELYRA theo cách của bạn</Text>
        </View>

        <Text style={styles.groupTitle}>NHẮC NHỞ HẰNG NGÀY</Text>
        <SettingsCard>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, styles.reminderIcon]}><Ionicons name="notifications-outline" size={23} color="#FFD26C" /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Nhắc chơi mỗi ngày</Text>
              <Text style={styles.settingHint}>{canUseNativeNotifications ? `Lúc ${String(dailyReminder.hour).padStart(2, '0')}:${String(dailyReminder.minute).padStart(2, '0')} theo giờ thiết bị` : 'Khả dụng trên bản phát hành của ứng dụng'}</Text>
            </View>
            <Switch
              disabled={!canUseNativeNotifications}
              value={dailyReminder.enabled}
              onValueChange={(enabled) => { void updateDailyReminder({ ...dailyReminder, enabled }); }}
              trackColor={{ false: '#59437B', true: '#F5BA5B' }}
              thumbColor="#FFF7E8"
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, styles.timeIcon]}><Ionicons name="time-outline" size={24} color="#C7A4FF" /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Giờ nhắc</Text>
              <Text style={styles.settingHint}>Chọn thời điểm phù hợp với bạn</Text>
            </View>
          </View>
          <View style={styles.timeRow}>{[18, 20, 21].map((hour) => <TouchableOpacity key={hour} disabled={!canUseNativeNotifications} onPress={() => { void updateDailyReminder({ ...dailyReminder, hour, enabled: dailyReminder.enabled }); }} style={[styles.timeButton, dailyReminder.hour === hour && styles.timeButtonActive, !canUseNativeNotifications && styles.disabled]}><Text style={[styles.timeText, dailyReminder.hour === hour && styles.timeTextActive]}>{String(hour).padStart(2, '0')}:00</Text></TouchableOpacity>)}</View>
        </SettingsCard>

        <Text style={styles.groupTitle}>TÀI KHOẢN</Text>
        <SettingsCard>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, styles.profileIcon]}><Ionicons name={user ? "person-outline" : "person-add-outline"} size={24} color="#F4B8FF" /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>{user ? user.email : 'Tài khoản khách'}</Text>
              <Text style={styles.settingHint}>{user ? 'Hồ sơ trên thiết bị có thể đồng bộ' : isConfigured ? 'Đăng nhập để lưu hành trình trên mọi thiết bị' : 'Dữ liệu hiện được lưu trên thiết bị này'}</Text>
            </View>
          </View>
          <View style={styles.rowDivider} />
          {user ? (
            <View style={styles.accountActions}>
              <Action label="Đồng bộ hồ sơ" onPress={sync} disabled={busy} />
              <Action label="Đăng xuất" onPress={handleSignOut} disabled={busy} danger />
            </View>
          ) : (
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={onRequestLogin} style={styles.inlineAction}>
              <Text style={styles.inlineActionText}>{isConfigured ? 'Đăng nhập hoặc tạo tài khoản' : 'Xem hướng dẫn cấu hình'}</Text>
              <Ionicons name="chevron-forward" size={19} color="#FFD36E" />
            </TouchableOpacity>
          )}
          {busy && <ActivityIndicator color="#F5BA5B" style={styles.loader} />}
        </SettingsCard>

        <Text style={styles.groupTitle}>NUMELYRA PRO</Text>
        <SettingsCard pro>
          <View style={styles.proHeading}>
            <View style={styles.proHeadingCopy}>
              <View style={styles.crownIcon}><Text style={styles.crownIconText}>♛</Text></View>
              <View style={styles.proText}>
                <Text style={styles.cardTitle}>GÓI THÀNH VIÊN</Text>
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
              <View style={[styles.upgradeButtonShadow, busy && styles.disabled]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={upgrade}
                  activeOpacity={0.85}
                  style={styles.upgradeButton}
                >
                  <LinearGradient colors={['#FFE8AA', '#F5BD55', '#D98B2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upgradeButtonGradient}>
                    {busy ? <ActivityIndicator color="#110F20" /> : <View style={styles.upgradeContent}><Text style={styles.upgradeButtonText}>{user ? (paymentMethod === 'payos' ? 'THANH TOÁN VIETQR' : 'ĐĂNG KÝ QUA PAYPAL') : 'ĐĂNG NHẬP ĐỂ NÂNG CẤP'}</Text><Ionicons name="arrow-forward" size={18} color="#211443" /></View>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
          {!!billing?.checkoutPending && <Text style={styles.warning}>Bạn có một yêu cầu PayPal chưa hoàn tất. Hãy xác nhận hoặc quay lại website để hủy yêu cầu đó trước khi thử lại.</Text>}
          {!!billingError && <Text accessibilityRole="alert" style={styles.error}>{billingError}</Text>}
          {user && <TouchableOpacity activeOpacity={0.7} disabled={busy} onPress={() => { void Haptics.selectionAsync(); void refreshBilling(); }} style={styles.refreshButton}><Ionicons name="refresh" size={14} color="#C6BDD9" /><Text style={styles.refreshText}>Cập nhật trạng thái Pro</Text></TouchableOpacity>}
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsCard({ children, pro = false }: { children: React.ReactNode; pro?: boolean }) {
  return (
    <View style={[styles.cardShadow, pro && styles.proCardShadow]}>
      <LinearGradient
        colors={pro ? ['#421777', '#321060', '#230944'] : ['#321060', '#291051', '#210943']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, pro && styles.proCard]}
      >
        <LinearGradient pointerEvents="none" colors={['rgba(247, 199, 255, 0.12)', 'rgba(33, 12, 76, 0.04)', 'rgba(8, 4, 34, 0.32)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.cardOverlay} />
        {children}
      </LinearGradient>
    </View>
  );
}

function Action({ label, onPress, disabled, danger = false }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const colors = danger ? ['#5D205E', '#401442', '#281031'] as const : ['#432078', '#31165E', '#211043'] as const;
  return <View style={[styles.actionShadow, danger && styles.dangerActionShadow, disabled && styles.disabled]}><TouchableOpacity activeOpacity={0.7} disabled={disabled} onPress={onPress} style={styles.action}><LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}><Text style={[styles.actionText, danger && styles.dangerText]}>{label}</Text></LinearGradient></TouchableOpacity></View>;
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
      onPress={() => { void Haptics.selectionAsync(); onPress(provider); }}
      activeOpacity={0.7}
      style={[styles.paymentMethod, selected && styles.paymentMethodSelected]}
    >
      <LinearGradient pointerEvents="none" colors={selected ? ['rgba(255, 226, 154, 0.14)', 'rgba(65, 34, 99, 0.12)', 'rgba(14, 7, 39, 0.34)'] : ['rgba(237, 191, 255, 0.09)', 'rgba(13, 6, 42, 0.28)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.paymentOverlay} />
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
  sky: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  moon: { position: 'absolute', top: 12, right: 22, color: '#FFE7A0', fontSize: 86, lineHeight: 92, transform: [{ rotate: '-18deg' }], opacity: 0.95 },
  star: { position: 'absolute', color: '#F8B7FF', fontSize: 16 },
  starOne: { top: 112, left: 26 },
  starTwo: { top: 76, left: 164, color: '#FFE29A', fontSize: 12 },
  starThree: { top: 188, right: 52, color: '#FFD779', fontSize: 20 },
  orbit: { position: 'absolute', top: -105, right: -92, width: 330, height: 250, borderWidth: 1, borderColor: 'rgba(235, 157, 255, 0.32)', borderRadius: 180, transform: [{ rotate: '25deg' }] },
  content: { paddingHorizontal: 17, paddingTop: 12, paddingBottom: 34 },
  heroHeader: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 9, paddingBottom: 26 },
  title: { color: '#FCF5FF', fontSize: 35, lineHeight: 42, fontWeight: '900', letterSpacing: 0.2, textAlign: 'center' },
  subtitle: { color: '#B8A8D8', fontSize: 14, lineHeight: 21, marginTop: 5, textAlign: 'center' },
  groupTitle: { color: '#E4D5FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.05, marginLeft: 5, marginBottom: 9 },
  cardShadow: { borderRadius: 24, marginBottom: 16, shadowColor: '#1A063A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.94, shadowRadius: 19, elevation: 15 },
  proCardShadow: { shadowColor: '#25074A', shadowOpacity: 0.98, shadowRadius: 21, elevation: 17 },
  card: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(153, 95, 210, 0.62)', padding: 17, overflow: 'hidden' },
  proCard: { borderColor: 'rgba(184, 111, 226, 0.70)' },
  cardOverlay: { ...StyleSheet.absoluteFill },
  settingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: 12 },
  settingIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  reminderIcon: { backgroundColor: 'rgba(127, 75, 168, 0.28)', borderColor: 'rgba(255, 209, 109, 0.46)' },
  timeIcon: { backgroundColor: 'rgba(86, 59, 152, 0.36)', borderColor: 'rgba(182, 137, 241, 0.44)' },
  profileIcon: { backgroundColor: 'rgba(139, 58, 157, 0.31)', borderColor: 'rgba(237, 160, 255, 0.45)' },
  settingCopy: { flex: 1, minWidth: 0 },
  settingLabel: { color: '#FCF5FF', fontSize: 16, lineHeight: 21, fontWeight: '800' },
  settingHint: { color: '#BBAED6', fontSize: 12, lineHeight: 17, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: 'rgba(182, 133, 231, 0.23)', marginVertical: 14 },
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
  actionShadow: { height: 55, borderRadius: 20, marginTop: 15, shadowColor: '#2A0A57', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.82, shadowRadius: 10, elevation: 8 },
  dangerActionShadow: { shadowColor: '#4B104E' },
  action: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  actionGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(255, 213, 115, 0.64)', borderRadius: 20 },
  actionText: { color: '#FFE08A', fontSize: 16, fontWeight: '900' },
  dangerText: { color: '#FDA4AF' },
  accountActions: { marginTop: -2 },
  inlineAction: { minHeight: 49, paddingHorizontal: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 211, 110, 0.52)', backgroundColor: 'rgba(73, 38, 119, 0.68)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#190632', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.76, shadowRadius: 9, elevation: 7 },
  inlineActionText: { color: '#FFE08A', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  loader: { marginTop: 13 },
  paymentLabel: { color: '#C6B8E3', fontSize: 13, fontWeight: '900', letterSpacing: 0.7, marginTop: 19, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', gap: 9 },
  paymentMethod: { flex: 1, minHeight: 128, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(128, 77, 183, 0.62)', backgroundColor: '#25104A', overflow: 'hidden', shadowColor: '#17052F', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.78, shadowRadius: 9, elevation: 7 },
  paymentMethodSelected: { borderColor: '#FFD25F', backgroundColor: '#3C1A60', shadowColor: '#2A0B52', shadowOpacity: 0.9 },
  paymentOverlay: { ...StyleSheet.absoluteFill },
  paymentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentIcon: { color: '#B6AFC9', fontSize: 25, fontWeight: '900' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#72589B', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#FFD25F', backgroundColor: '#FFD25F' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4D2B60' },
  paymentTitle: { color: '#F2EAFB', fontSize: 15, fontWeight: '900', marginTop: 14 },
  paymentDetail: { color: '#ADA2C5', fontSize: 12, marginTop: 5 },
  paymentTextSelected: { color: '#F5D27B' },
  upgradeButtonShadow: { height: 56, borderRadius: 20, marginTop: 14, shadowColor: '#E4A039', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.58, shadowRadius: 12, elevation: 10 },
  upgradeButton: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  upgradeButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFF1AA', borderRadius: 20 },
  upgradeContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  upgradeButtonText: { color: '#211443', fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  warning: { color: '#FCD34D', fontSize: 12, lineHeight: 18, marginTop: 12 },
  error: { color: '#FDA4AF', fontSize: 12, lineHeight: 18, marginTop: 12 },
  refreshButton: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 12, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  refreshText: { color: '#C6BDD9', fontSize: 12, textDecorationLine: 'underline' },
  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  reminderLabel: { color: '#F3EAFE', fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  timeButton: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#5A4677' },
  timeButtonActive: { backgroundColor: '#F5BA5B', borderColor: '#F5BA5B' },
  timeText: { color: '#D6C9EB', fontWeight: '800' },
  timeTextActive: { color: '#24133F' },
});
