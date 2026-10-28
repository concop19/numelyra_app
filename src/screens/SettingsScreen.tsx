import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

import FlameMascot from '../components/chat/FlameMascot';
import ThreeDButton from '../components/ThreeDButton';
import ProfilePickerModal from '../components/ProfilePickerModal';
import { useAuth } from '../store/authContext';
import { useProfiles } from '../store/profileContext';
import {
  beginCheckout,
  getGooglePlayMonthlyDisplayPrice,
  getGooglePlayProduct,
  restoreGooglePlayPurchases,
  type BillingProvider,
} from '../services/billingService';
import { useBilling } from '../store/billingContext';
import {
  canUseNativeNotifications,
  DEFAULT_DAILY_REMINDER_SETTINGS,
  loadDailyReminderSettings,
  saveDailyReminderSettings,
  type DailyReminderSettings,
} from '../services/dailyNotifications';
import type { UserProfile } from '../store/userProfile';
import { useLocalization } from '../i18n/LocalizationContext';
import type { LanguagePreference } from '../i18n/translations';
import { getGlobalPendingMessageCount } from '../db/chatDatabaseService';
import {
  downloadAndSyncAllUserData,
  syncPendingMessagesBatch,
} from '../services/chatSessionSyncService';

const SKY_BACKGROUND = require('../../assets/giao_dien/giaodien1/setting/background.webp');
const GROUND_BACKGROUND = require('../../assets/giao_dien/giaodien1/setting/background_ground.webp');

interface Props {
  profile: UserProfile;
  onBack: () => void;
  onRequestLogin: () => void;
}

type SettingItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBackground: string;
  label: string;
  detail?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
};

export default function SettingsScreen({ profile, onBack, onRequestLogin }: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user, isConfigured, signOut, syncLocalProfiles } = useAuth();
  const { billing, error: initialBillingError, reloadBilling } = useBilling();
  const { locale, preference, setPreference, t, l } = useLocalization();
  const {
    primaryProfileId,
    primaryProfileItem,
    refreshProfiles,
    setPrimaryProfile,
  } = useProfiles();
  const [busy, setBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [playPrice, setPlayPrice] = useState<string | null>(null);
  const [dailyReminder, setDailyReminder] = useState<DailyReminderSettings>({ ...DEFAULT_DAILY_REMINDER_SETTINGS });
  const [profileManagerVisible, setProfileManagerVisible] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useFocusEffect(useCallback(() => {
    void loadDailyReminderSettings().then(setDailyReminder);
    void getGlobalPendingMessageCount().then(setPendingSyncCount).catch(() => undefined);
    if (Platform.OS === 'android' && user) {
      void getGooglePlayProduct()
        .then((product) => setPlayPrice(getGooglePlayMonthlyDisplayPrice(product)))
        .catch(() => setPlayPrice(null));
    }
  }, [user?.id]));

  const openCloudSyncActions = () => {
    void Haptics.selectionAsync();
    if (!user) {
      Alert.alert(
        l('Cần đăng nhập', 'Sign in required'),
        l('Vui lòng đăng nhập để đồng bộ dữ liệu đám mây.', 'Please sign in to sync cloud data.'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: l('Đăng nhập', 'Sign in'), onPress: onRequestLogin },
        ]
      );
      return;
    }

    Alert.alert(
      l('Đồng bộ đám mây', 'Cloud sync'),
      l(
        `Hiện có ${pendingSyncCount} tin nhắn đang chờ đồng bộ.\n(Hệ thống tự động đồng bộ lên máy chủ mỗi khi tích lũy đủ 10 tin nhắn).`,
        `Currently ${pendingSyncCount} pending messages waiting to sync.\n(Automatically syncs to server every 10 messages).`
      ),
      [
        {
          text: l('Tải toàn bộ từ máy chủ về', 'Download all from server'),
          onPress: async () => {
            setBusy(true);
            try {
              const res = await downloadAndSyncAllUserData();
              await refreshProfiles();
              const count = await getGlobalPendingMessageCount();
              setPendingSyncCount(count);
              Alert.alert(
                l('Tải về thành công', 'Download successful'),
                l(`Đã tải về ${res.profilesCount} hồ sơ và ${res.messagesCount} tin nhắn từ máy chủ.`, `Successfully downloaded ${res.profilesCount} profiles and ${res.messagesCount} messages from server.`)
              );
            } catch {
              Alert.alert(l('Thất bại', 'Failed'), l('Không thể tải dữ liệu từ máy chủ.', 'Could not download data from server.'));
            } finally {
              setBusy(false);
            }
          },
        },
        {
          text: l('Đồng bộ ngay lên máy chủ', 'Sync now to server'),
          onPress: async () => {
            setBusy(true);
            try {
              const res = await syncPendingMessagesBatch(1, true);
              const count = await getGlobalPendingMessageCount();
              setPendingSyncCount(count);
              Alert.alert(
                l('Đồng bộ thành công', 'Sync successful'),
                l(`Đã đồng bộ ${res.syncedCount} tin nhắn lên máy chủ.`, `Synced ${res.syncedCount} messages to server.`)
              );
            } catch {
              Alert.alert(l('Thất bại', 'Failed'), l('Không thể đồng bộ tin nhắn.', 'Could not sync messages.'));
            } finally {
              setBusy(false);
            }
          },
        },
        { text: t('common.close'), style: 'cancel' },
      ]
    );
  };

  const handleSignOut = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert(l('Không thể đăng xuất', 'Unable to sign out'), error instanceof Error ? error.message : l('Vui lòng thử lại.', 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      await syncLocalProfiles();
      await refreshProfiles();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(l('Đã đồng bộ', 'Sync complete'), l('Hồ sơ trên thiết bị đã được liên kết với tài khoản của bạn.', 'The profiles on this device are now linked to your account.'));
    } catch (error) {
      Alert.alert(l('Không thể đồng bộ', 'Unable to sync'), error instanceof Error ? error.message : l('Vui lòng thử lại.', 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const upgrade = async (provider: BillingProvider) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      onRequestLogin();
      return;
    }

    setBusy(true);
    setBillingError('');
    try {
      await beginCheckout(provider, locale);
      await reloadBilling();
    } catch (error) {
      const message = error instanceof Error ? error.message : l('Không thể mở trang thanh toán.', 'Unable to open the payment page.');
      if (/sign in|đăng nhập|not_authenticated/i.test(message)) onRequestLogin();
      else setBillingError(message);
    } finally {
      setBusy(false);
    }
  };

  const updateDailyReminder = async (next: DailyReminderSettings) => {
    const saved = await saveDailyReminderSettings(next, { profile: { ...profile, id: primaryProfileId }, locale });
    setDailyReminder(saved);
    if (next.enabled && !saved.enabled) {
      Alert.alert(l('Chưa bật thông báo', 'Notifications are off'), l('Bạn có thể bật lại quyền thông báo trong Cài đặt thiết bị bất kỳ lúc nào.', 'You can enable notification permission later in your device settings.'));
    }
  };

  const isPro = billing?.plan === 'pro';
  const activeUntil = billing?.subscription?.current_period_end
    ? new Date(billing.subscription.current_period_end).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN')
    : null;
  const handle = user?.email ? `@${user.email.split('@')[0]}` : '@numelyra';
  const planDetail = isPro
    ? `Premium${activeUntil ? ` ${l('đến', 'until')} ${activeUntil}` : ''}`
    : l('Khám phá gói Premium', 'Explore Premium');

  const openAccountActions = () => {
    void Haptics.selectionAsync();
    if (!user) {
      onRequestLogin();
      return;
    }
    Alert.alert(
      t('settings.personal'),
      user.email ?? l('Tài khoản NUMELYRA', 'NUMELYRA account'),
      [
        { text: l('Đồng bộ hồ sơ', 'Sync profiles'), onPress: () => { void sync(); } },
        { text: l('Đăng xuất', 'Sign out'), style: 'destructive', onPress: () => { void handleSignOut(); } },
        { text: t('common.close'), style: 'cancel' },
      ],
    );
  };

  const openPackageActions = () => {
    void Haptics.selectionAsync();
    if (!user) {
      onRequestLogin();
      return;
    }
    if (isPro) {
      Alert.alert(l('Gói Premium', 'Premium plan'), activeUntil ? l(`Gói của bạn có hiệu lực đến ${activeUntil}.`, `Your plan is active until ${activeUntil}.`) : l('Gói Premium đang hoạt động.', 'Your Premium plan is active.'), [
        ...(Platform.OS === 'android' ? [{ text: l('Khôi phục giao dịch', 'Restore purchases'), onPress: () => { void restoreGooglePlayPurchases().then(() => reloadBilling()).catch((error) => setBillingError(error.message)); } }] : []),
        { text: l('Cập nhật trạng thái', 'Refresh status'), onPress: () => { void reloadBilling(); } },
        { text: t('common.close'), style: 'cancel' },
      ]);
      return;
    }
    if (Platform.OS === 'android') {
      Alert.alert('NUMELYRA Pro', l(`200 lượt AI/tháng · ${playPrice || 'giá hiển thị bởi Google Play'}`, `200 AI responses/month · ${playPrice || 'localized Google Play price'}`), [
        { text: l('Đăng ký qua Google Play', 'Subscribe with Google Play'), onPress: () => { void upgrade('google_play'); } },
        { text: l('Khôi phục giao dịch', 'Restore purchases'), onPress: () => { void restoreGooglePlayPurchases().then((restored) => restored ? reloadBilling() : setBillingError(l('Không tìm thấy giao dịch hợp lệ.', 'No valid purchase was found.'))).catch((error) => setBillingError(error.message)); } },
        { text: l('Để sau', 'Not now'), style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(l('Nâng cấp Premium', 'Upgrade to Premium'), l('Chọn phương thức thanh toán', 'Choose a payment method'), [
      { text: 'VietQR / PayOS · 249.000đ', onPress: () => { void upgrade('payos'); } },
      { text: 'PayPal · $9.99', onPress: () => { void upgrade('paypal'); } },
      { text: l('Để sau', 'Not now'), style: 'cancel' },
    ]);
  };

  const chooseReminderTime = () => {
    if (!canUseNativeNotifications) {
      Alert.alert(t('settings.dailyReminder'), l('Tính năng này khả dụng trên bản phát hành cài trên thiết bị.', 'This feature is available in the installed mobile app.'));
      return;
    }
    Alert.alert(l('Chọn giờ nhắc', 'Choose reminder time'), l('NUMELYRA sẽ nhẹ nhàng nhắc bạn mỗi ngày.', 'NUMELYRA will send you a gentle daily reminder.'), [8, 20, 21].map((hour) => ({
      text: `${String(hour).padStart(2, '0')}:00`,
      onPress: () => { void updateDailyReminder({ ...dailyReminder, hour, minute: 0 }); },
    })));
  };

  const chooseLanguage = () => {
    const apply = (next: LanguagePreference) => {
      void setPreference(next).catch(() => Alert.alert(t('language.title'), t('language.saveError')));
    };
    Alert.alert(t('language.title'), undefined, [
      { text: `${preference === 'system' ? '✓ ' : ''}${t('language.system')}`, onPress: () => apply('system') },
      { text: `${preference === 'vi' ? '✓ ' : ''}${t('language.vi')}`, onPress: () => apply('vi') },
      { text: `${preference === 'en' ? '✓ ' : ''}${t('language.en')}`, onPress: () => apply('en') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const requestPrimaryProfileChange = (nextId: string) => {
    if (nextId === primaryProfileId) {
      setProfileManagerVisible(false);
      return;
    }
    const apply = async () => {
      setBusy(true);
      try {
        const result = await setPrimaryProfile(nextId);
        setProfileManagerVisible(false);
        if (!result.synced && user) {
          Alert.alert(
            l('Đã lưu trên thiết bị', 'Saved on this device'),
            l('Hồ sơ chính sẽ được đồng bộ khi thiết bị có mạng.', 'The primary profile will sync when the device is online.'),
          );
        }
      } finally {
        setBusy(false);
      }
    };
    Alert.alert(
      l('Đổi hồ sơ chính?', 'Change primary profile?'),
      l('Daily Insight, vận hôm nay và thông báo sẽ được cá nhân hóa theo hồ sơ này.', 'Daily Insight, today’s fortune and notifications will use this profile.'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: l('Đặt làm hồ sơ chính', 'Set as primary'), onPress: () => { void apply(); } },
      ],
    );
  };

  const contentWidth = Math.min(windowWidth - 36, 504);

  return (
    <View style={[styles.root, { width: windowWidth, height: windowHeight }]}>
      <Image source={SKY_BACKGROUND} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12, 8, 79, 0.03)', 'rgba(27, 8, 89, 0.20)', 'rgba(16, 5, 66, 0.70)']}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.groundCrop}>
        <Image source={GROUND_BACKGROUND} resizeMode="cover" style={styles.groundImage} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          activeOpacity={0.75}
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={29} color="#FFE8F6" />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { width: contentWidth }]}
        >
          <View style={styles.hero}>
            <View style={styles.shootingStar} />
            <Ionicons name="sparkles" size={19} color="#FFE17D" style={styles.heroSparkleLeft} />
            <Ionicons name="sparkles" size={14} color="#FFF3A8" style={styles.heroSparkleRight} />
            <View style={styles.heroMoon}>
              <View style={styles.heroMoonCutout} />
            </View>

            <View style={styles.mascotHaloOuter}>
              <LinearGradient colors={['#FFB6D7', '#FFD98B', '#9D6CFF']} style={styles.mascotHaloBorder}>
                <View style={styles.mascotHaloInner}>
                  <FlameMascot state="idle" size={112} />
                </View>
              </LinearGradient>
            </View>

            <View pointerEvents="none" style={styles.heroClouds}>
              <View style={[styles.cloudBubble, styles.cloudOne]} />
              <View style={[styles.cloudBubble, styles.cloudTwo]} />
              <View style={[styles.cloudBubble, styles.cloudThree]} />
              <View style={[styles.cloudBubble, styles.cloudFour]} />
            </View>

            <Text style={styles.title}>{t('settings.title')}</Text>
            <Text style={styles.handle}>{handle}</Text>
          </View>

          <View style={styles.settingsPanel}>
            <SettingItem
              icon="person-circle"
              iconColor="#5D238B"
              iconBackground="#FFF0C9"
              label={l('Hồ sơ chính', 'Primary profile')}
              detail={primaryProfileItem?.fullName || profile.fullName}
              onPress={() => setProfileManagerVisible(true)}
            />
            <SettingItem
              icon={user ? 'person' : 'person-add'}
              iconColor="#5D238B"
              iconBackground="#FFEADB"
              label={t('settings.personal')}
              detail={user?.email ?? (isConfigured ? l('Đăng nhập để đồng bộ hồ sơ', 'Sign in to sync profiles') : l('Tài khoản khách', 'Guest account'))}
              onPress={openAccountActions}
            />
            <SettingItem
              icon="cloud-done-outline"
              iconColor="#3B82F6"
              iconBackground="#DBEAFE"
              label={l('Đồng bộ đám mây', 'Cloud sync')}
              detail={pendingSyncCount > 0
                ? `${pendingSyncCount} ${l('tin nhắn chờ đồng bộ (10 tin/lô)', 'pending messages (10/batch)')}`
                : l('Đã đồng bộ toàn bộ', 'All messages synced')}
              onPress={openCloudSyncActions}
            />
            <SettingItem
              icon="diamond"
              iconColor="#9A4B31"
              iconBackground="#FFE2BB"
              label={t('settings.plan')}
              detail={planDetail}
              onPress={openPackageActions}
            />
            <SettingItem
              icon="globe"
              iconColor="#5B35D2"
              iconBackground="#FFD8E6"
              label={t('language.title')}
              detail={preference === 'system' ? t('language.system') : t(`language.${preference}`)}
              onPress={chooseLanguage}
            />
            <SettingItem
              icon="notifications"
              iconColor="#5930C5"
              iconBackground="#F7D4E4"
              label={t('settings.notifications')}
              trailing={(
                <Switch
                  accessibilityLabel={t('settings.notifications')}
                  disabled={!canUseNativeNotifications}
                  value={dailyReminder.enabled}
                  onValueChange={(enabled) => { void updateDailyReminder({ ...dailyReminder, enabled }); }}
                  trackColor={{ false: '#C9BCD8', true: '#7442D8' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C9BCD8"
                />
              )}
            />
            <SettingItem
              icon="sunny-outline"
              iconColor="#F47D16"
              iconBackground="#FFE7C7"
              label={t('settings.dailyReminder')}
              detail={t('settings.everyDay', { time: `${String(dailyReminder.hour).padStart(2, '0')}:${String(dailyReminder.minute).padStart(2, '0')}` })}
              onPress={chooseReminderTime}
            />
            <SettingItem
              icon="time-outline"
              iconColor="#E27721"
              iconBackground="#FFF0CE"
              label={t('settings.luckyReminder')}
              detail="07:00–22:00"
              trailing={(
                <Switch
                  accessibilityLabel={t('settings.luckyReminder')}
                  disabled={!canUseNativeNotifications || !dailyReminder.enabled}
                  value={dailyReminder.luckyTimeEnabled}
                  onValueChange={(luckyTimeEnabled) => { void updateDailyReminder({ ...dailyReminder, luckyTimeEnabled }); }}
                  trackColor={{ false: '#C9BCD8', true: '#E28A36' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C9BCD8"
                />
              )}
            />
            <SettingItem
              icon="stats-chart"
              iconColor="#6B32B2"
              iconBackground="#FFDCE4"
              label={t('settings.activity')}
              detail={l('Lịch sử trải bài, lịch sử hỏi AI', 'Card readings and AI question history')}
              onPress={() => Alert.alert(t('settings.activity'), l('12 lượt xem tarot tháng này\n8 lần xem chiêm tinh\n5 ngày mở lịch liên tiếp', '12 tarot readings this month\n8 astrology views\n5 consecutive calendar days'))}
            />
            <SettingItem
              icon="lock-closed"
              iconColor="#5D35C5"
              iconBackground="#F1DBED"
              label={t('settings.privacy')}
              onPress={() => Alert.alert(t('settings.privacy'), l('Dữ liệu cá nhân của bạn được lưu và đồng bộ theo trạng thái tài khoản.', 'Your personal data is stored and synced according to your account status.'))}
            />
            <SettingItem
              icon="help-circle"
              iconColor="#6D218B"
              iconBackground="#FBE1E4"
              label={t('settings.help')}
              onPress={() => Alert.alert(t('settings.help'), l('Nếu bạn cần hỗ trợ, hãy gửi phản hồi từ trang NUMELYRA.', 'If you need help, send feedback from the NUMELYRA page.'))}
              last
            />
          </View>

          <LinearGradient
            colors={['rgba(45, 23, 124, 0.96)', 'rgba(52, 23, 137, 0.93)', 'rgba(33, 14, 104, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activityCard}
          >
            <Ionicons name="diamond" size={24} color="#F777E5" />
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>{l('Hoạt động gần đây', 'Recent activity')}</Text>
              <Text style={styles.activityLine}>•  {l('12 lượt xem tarot tháng này', '12 tarot readings this month')}</Text>
              <Text style={styles.activityLine}>•  {l('8 lần xem chiêm tinh', '8 astrology views')}</Text>
              <Text style={styles.activityLine}>•  {l('5 ngày mở lịch liên tiếp', '5 consecutive calendar days')}</Text>
            </View>
            <Ionicons name="sparkles" size={18} color="#FFE473" style={styles.activitySparkle} />
            <View pointerEvents="none" style={styles.activityMoon}>
              <View style={styles.activityMoonCutout} />
            </View>
            <View pointerEvents="none" style={styles.miniClouds}>
              <View style={[styles.miniCloud, { left: 0, width: 64, height: 31 }]} />
              <View style={[styles.miniCloud, { left: 47, bottom: -7, width: 78, height: 38 }]} />
              <View style={[styles.miniCloud, { left: 110, bottom: -12, width: 52, height: 27 }]} />
            </View>
          </LinearGradient>

          <ThreeDButton
            disabled={busy}
            fullWidth
            label={isPro ? l('Quản lý gói Premium', 'Manage Premium') : l('Quản lý gói', 'Manage plan')}
            leadingIcon={<Ionicons name="diamond" size={22} color="#FFF5BE" />}
            loading={busy}
            onPress={openPackageActions}
            shape="pill"
            size="lg"
            style={styles.packageButton3d}
            trailingIcon={<Ionicons name="chevron-forward" size={24} color="#FFFFFF" />}
            variant="purple"
          />

          {!!billing?.checkoutPending && (
            <Text style={styles.warning}>{l('Bạn có một yêu cầu PayPal chưa hoàn tất. Hãy hoàn tất hoặc hủy yêu cầu trước khi thử lại.', 'You have an unfinished PayPal request. Complete or cancel it before trying again.')}</Text>
          )}
          {!!(billingError || initialBillingError) && <Text accessibilityRole="alert" style={styles.error}>{billingError || initialBillingError}</Text>}
        </ScrollView>
      </SafeAreaView>
      <ProfilePickerModal
        visible={profileManagerVisible}
        onClose={() => setProfileManagerVisible(false)}
        selectedProfiles={primaryProfileItem ? [primaryProfileItem] : []}
        onProfilesSelected={(items) => {
          const selected = items[0];
          if (selected) requestPrimaryProfileChange(selected.id);
        }}
        allowCoupleMode={false}
        managementMode="full"
        onProfilesChanged={refreshProfiles}
        primaryProfileId={primaryProfileId}
        title={l('Quản lý hồ sơ', 'Manage profiles')}
        selectCreatedProfile={false}
      />
    </View>
  );
}

function SettingItem({
  icon,
  iconColor,
  iconBackground,
  label,
  detail,
  onPress,
  trailing,
  last = false,
}: SettingItemProps) {
  const content = (
    <>
      <View style={[styles.settingIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>
      <View style={styles.settingCopy}>
        <Text numberOfLines={1} style={styles.settingLabel}>{label}</Text>
        {!!detail && <Text numberOfLines={1} style={styles.settingDetail}>{detail}</Text>}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={21} color="#736684" /> : null)}
    </>
  );

  return (
    <View style={[styles.settingRowWrap, !last && styles.settingDivider]}>
      {onPress ? (
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.66} onPress={onPress} style={styles.settingRow}>
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.settingRow}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#140B57' },
  safeArea: { flex: 1 },
  scrollContent: { alignSelf: 'center', paddingBottom: 38 },
  groundCrop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 210, overflow: 'hidden', opacity: 0.88 },
  groundImage: { position: 'absolute', left: '-31%', bottom: -7, width: '162%', height: 340 },
  backButton: {
    position: 'absolute', zIndex: 20, top: 8, left: 18, width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(76, 43, 157, 0.90)',
    borderWidth: 1, borderColor: 'rgba(255, 209, 241, 0.25)', shadowColor: '#100435',
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.40, shadowRadius: 10, elevation: 8,
  },
  hero: { height: 276, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 },
  shootingStar: {
    position: 'absolute', top: 67, left: 78, width: 56, height: 1, backgroundColor: '#FFAFDD',
    transform: [{ rotate: '-38deg' }], shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 4,
  },
  heroSparkleLeft: { position: 'absolute', top: 75, left: 36 },
  heroSparkleRight: { position: 'absolute', top: 82, right: 66 },
  heroMoon: {
    position: 'absolute', top: 24, right: 31, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFE88A', shadowColor: '#FFD75D', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.90, shadowRadius: 13, elevation: 8, transform: [{ rotate: '-17deg' }],
  },
  heroMoonCutout: { position: 'absolute', top: -5, left: 15, width: 49, height: 49, borderRadius: 25, backgroundColor: '#321774' },
  mascotHaloOuter: {
    position: 'absolute', top: 20, width: 150, height: 150, borderRadius: 75, shadowColor: '#FF9CCB',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 16, elevation: 12,
  },
  mascotHaloBorder: { flex: 1, borderRadius: 75, padding: 4 },
  mascotHaloInner: {
    flex: 1, borderRadius: 71, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(43, 18, 115, 0.84)',
  },
  heroClouds: { position: 'absolute', left: -20, right: -20, top: 145, height: 58, overflow: 'hidden', opacity: 0.92 },
  cloudBubble: {
    position: 'absolute', bottom: -27, backgroundColor: '#A245C5', shadowColor: '#FF83BE',
    shadowOffset: { width: 0, height: -7 }, shadowOpacity: 0.60, shadowRadius: 8, elevation: 5,
  },
  cloudOne: { left: -10, width: 126, height: 71, borderRadius: 52 },
  cloudTwo: { left: 82, width: 132, height: 62, borderRadius: 50, backgroundColor: '#7533AF' },
  cloudThree: { right: 82, width: 132, height: 70, borderRadius: 52, backgroundColor: '#7E3AB7' },
  cloudFour: { right: -18, width: 126, height: 76, borderRadius: 55, backgroundColor: '#B34DAF' },
  title: {
    color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '900', textAlign: 'center',
    textShadowColor: 'rgba(32, 8, 92, 0.80)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5,
  },
  handle: { color: '#E8DFFC', fontSize: 16, lineHeight: 21, fontWeight: '600', marginTop: 2 },
  settingsPanel: {
    borderRadius: 23, backgroundColor: '#FFF4E8', paddingHorizontal: 19, paddingVertical: 8,
    shadowColor: '#130139', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.36, shadowRadius: 18, elevation: 12,
  },
  settingRowWrap: { minHeight: 59, justifyContent: 'center' },
  settingDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(92, 58, 105, 0.18)' },
  settingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1, minWidth: 0 },
  settingLabel: { color: '#2E2052', fontSize: 16, lineHeight: 21, fontWeight: '800' },
  settingDetail: { color: '#8D7D91', fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  activityCard: {
    position: 'relative', minHeight: 142, marginTop: 14, borderRadius: 22, borderWidth: 1.5,
    borderColor: 'rgba(255, 124, 190, 0.62)', paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, overflow: 'hidden', shadowColor: '#180343',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.36, shadowRadius: 14, elevation: 9,
  },
  activityCopy: { flex: 1, zIndex: 2 },
  activityTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  activityLine: { color: '#F5ECFF', fontSize: 14, lineHeight: 22, fontWeight: '600' },
  activitySparkle: { position: 'absolute', top: 17, right: 91 },
  activityMoon: {
    position: 'absolute', right: 28, top: 24, width: 45, height: 45, borderRadius: 23,
    backgroundColor: '#FFE56E', transform: [{ rotate: '-18deg' }], shadowColor: '#FFD65F',
    shadowOpacity: 0.8, shadowRadius: 9,
  },
  activityMoonCutout: { position: 'absolute', top: -4, left: 13, width: 40, height: 40, borderRadius: 20, backgroundColor: '#351A87' },
  miniClouds: { position: 'absolute', right: -9, bottom: 0, width: 170, height: 54, opacity: 0.95 },
  miniCloud: {
    position: 'absolute', bottom: -2, borderRadius: 40, backgroundColor: '#A849C3', shadowColor: '#F675C0',
    shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.55, shadowRadius: 8,
  },
  packageButton3d: { marginTop: 12 },
  warning: { color: '#FFE27B', fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  error: { color: '#FFD1DC', fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
});
