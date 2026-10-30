/**
 * App.tsx - Entry point với Navigation + Onboarding
 *
 * Flow:
 * 1. Kiểm tra profile → chưa có → OnboardingScreen
 * 2. Có profile → Chat là màn chính, các tính năng mở từ nút nổi trong cảnh chat
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, type NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import OnboardingScreen from './src/screens/OnboardingScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatReadingDetailScreen, { type ChatReadingDetailParams } from './src/screens/ChatReadingDetailScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AstrologyScreen from './src/screens/AstrologyScreen';
import WallpaperStudioScreen from './src/screens/WallpaperStudioScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChatContinuationScreen from './src/screens/ChatContinuationScreen';
import { AuthProvider, useAuth } from './src/store/authContext';
import { BillingProvider } from './src/store/billingContext';
import { ProfileProvider, useProfiles } from './src/store/profileContext';
import { getNotifications } from './src/services/dailyNotifications';
import { refreshDailyInsightNotifications } from './src/services/dailyNotifications';
import { LocalizationProvider, useLocalization } from './src/i18n/LocalizationContext';
import CloudSyncPill from './src/components/CloudSyncPill';

type RootStackParamList = {
  Main: { dailyDate?: string } | undefined;
  Calendar: undefined;
  Astrology: undefined;
  WallpaperStudio: undefined;
  Settings: undefined;
  ChatReadingDetail: ChatReadingDetailParams;
  ChatContinuation: { sessionId: string; title?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const notifications = getNotifications();
const LOADING_FLAME = require('./assets/char/result_Flame_character_sitting_peacefully_1080p_20261017202140_2_ (1)/idle_1.webp');

function goBackOrMain(navigation: NavigationProp<RootStackParamList>): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('Main');
}

const linking = {
  prefixes: [Linking.createURL('/'), 'numelyra://'],
  config: {
    screens: {
      Main: 'daily/:dailyDate?',
      Calendar: 'calendar',
      Astrology: 'astrology',
      WallpaperStudio: 'wallpaper',
      Settings: 'settings',
      ChatContinuation: 'chat/:sessionId',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) return url;
    const response = notifications?.getLastNotificationResponse() ?? null;
    const notificationUrl = response?.notification.request.content.data?.url;
    if (typeof notificationUrl !== 'string') return null;
    // A notification response is sticky until explicitly cleared. Consume it
    // once so a later ordinary cold start cannot reopen an old Daily Insight.
    try { notifications?.clearLastNotificationResponse(); } catch { /* Navigation must still continue. */ }
    return notificationUrl;
  },
  subscribe(listener: (url: string) => void) {
    const linkSubscription = Linking.addEventListener('url', ({ url }) => listener(url));
    const notificationSubscription = notifications?.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        listener(url);
        try { notifications.clearLastNotificationResponse(); } catch { /* The live route was already delivered. */ }
      }
    });
    return () => { linkSubscription.remove(); notificationSubscription?.remove(); };
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <AuthProvider>
          <ProfileProvider>
            <BillingProvider>
              <AppContent />
            </BillingProvider>
          </ProfileProvider>
        </AuthProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { locale, ready: isLocaleReady, t } = useLocalization();
  const { isReady: isAuthReady, user, signOut, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const {
    isReady: isProfileReady,
    primaryProfile: profile,
    primaryProfileId,
    cloudSyncState,
    syncNow,
  } = useProfiles();
  const [continueAsGuest, setContinueAsGuest] = useState(false);
  const [loginRequested, setLoginRequested] = useState(false);

  useEffect(() => {
    if (!profile || !isLocaleReady) return;
    void refreshDailyInsightNotifications({ profile: { ...profile, id: primaryProfileId }, locale }).catch(() => {
      // Notification refresh must never block the application shell.
    });
  }, [
    isLocaleReady,
    locale,
    primaryProfileId,
    profile?.birthDate,
    profile?.birthLocation?.placeId,
    profile?.birthTime,
    profile?.birthTimeAccuracy,
    profile?.fullName,
  ]);

  let content = null;

  const hasBlockingSyncError = Boolean(
    user
    && !isProfileReady
    && (cloudSyncState.status === 'error' || cloudSyncState.status === 'partial-error')
  );

  // App/bootstrap loading
  if (!isAuthReady || !isLocaleReady) {
    content = (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <View style={styles.loadingInner}>
          <Image source={LOADING_FLAME} resizeMode="contain" style={styles.loadingMascot} />
          <ActivityIndicator size="large" color="#F5BA5B" style={{ marginTop: 16 }} />
          <Text style={styles.loadingText}>{t('app.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  // Password recovery owns the authenticated shell until the new password is
  // saved; profile hydration must not hide this screen on a fresh device.
  else if (isPasswordRecovery) {
    content = (
      <LoginScreen
        allowGuest={false}
        onAuthenticated={() => {
          clearPasswordRecovery();
          setLoginRequested(false);
        }}
        onContinueAsGuest={() => {
          clearPasswordRecovery();
          setLoginRequested(false);
        }}
      />
    );
  }
  // A fresh device must not fall through to onboarding until the cloud profile
  // query has either succeeded with zero rows or the user explicitly leaves.
  else if (!isProfileReady) {
    content = (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <View style={styles.loadingInner}>
          <Image source={LOADING_FLAME} resizeMode="contain" style={styles.loadingMascot} />
          {hasBlockingSyncError ? (
            <>
              <Text style={styles.syncErrorTitle}>{t('cloudSync.blockingErrorTitle')}</Text>
              <Text style={styles.syncErrorBody}>{t('cloudSync.blockingErrorBody')}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => { void syncNow(); }}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => { void signOut().catch((error) => console.warn('[App] Sign out after sync error failed:', error)); }}
                style={styles.signOutButton}
              >
                <Text style={styles.signOutButtonText}>{t('cloudSync.signOut')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#F5BA5B" style={{ marginTop: 16 }} />
              <Text style={styles.loadingText}>{user ? t('cloudSync.checkingProfiles') : t('app.loading')}</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }
  else if (isPasswordRecovery) {
    content = (
      <LoginScreen
        allowGuest={false}
        onAuthenticated={() => {
          clearPasswordRecovery();
          setLoginRequested(false);
        }}
        onContinueAsGuest={() => {
          clearPasswordRecovery();
          setLoginRequested(false);
        }}
      />
    );
  }
  // Account entry: an anonymous user can continue locally, while a signed-in
  // user goes directly to onboarding so their first profile is synced.
  else if (!profile && !user && !continueAsGuest) {
    content = (
      <LoginScreen
        onAuthenticated={() => {
          setLoginRequested(false);
        }}
        onContinueAsGuest={() => setContinueAsGuest(true)}
      />
    );
  }
  // Onboarding
  else if (!profile) {
    content = (
      <OnboardingScreen
        onComplete={async () => {
          await syncNow();
        }}
      />
    );
  }
  else if (loginRequested) {
    content = (
      <LoginScreen
        allowGuest={false}
        onAuthenticated={async () => {
          setLoginRequested(false);
        }}
        onContinueAsGuest={() => setLoginRequested(false)}
      />
    );
  }
  // Main App
  else {
    content = (
      <NavigationContainer linking={linking}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main">
            {({ navigation, route }) => (
              <ChatScreen
                profile={profile}
                primaryProfileId={primaryProfileId}
                openDailyDate={route.params?.dailyDate}
                onDailyDateHandled={() => navigation.setParams({ dailyDate: undefined })}
                onOpenSettings={() => navigation.navigate('Settings')}
                onOpenCalendar={() => navigation.navigate('Calendar')}
                onOpenAstrology={() => navigation.navigate('Astrology')}
                onOpenWallpaper={() => navigation.navigate('WallpaperStudio')}
                onOpenRawReading={(message, previousQuestion) => navigation.navigate('ChatReadingDetail', { message, previousQuestion })}
                onContinueReading={(sessionId, title) => navigation.navigate('ChatContinuation', { sessionId, title })}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Calendar"
            options={{
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <CalendarScreen
                profile={profile}
                onBack={() => goBackOrMain(navigation)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Astrology"
            options={{
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <AstrologyScreen
                profile={profile}
                onBack={() => goBackOrMain(navigation)}
                onOpenCalendar={() => navigation.navigate('Calendar')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="WallpaperStudio"
            options={{
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <WallpaperStudioScreen
                profile={profile}
                onBack={() => goBackOrMain(navigation)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Settings"
            options={{
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <SettingsScreen
                profile={profile}
                onBack={() => goBackOrMain(navigation)}
                onRequestLogin={() => setLoginRequested(true)}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="ChatReadingDetail"
            component={ChatReadingDetailScreen}
          />
          <Stack.Screen name="ChatContinuation">
            {({ navigation, route }) => (
              <ChatContinuationScreen
                sessionId={route.params.sessionId}
                initialTitle={route.params.title}
                onBack={() => goBackOrMain(navigation)}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <View style={styles.appRoot}>
      {content}
      {Boolean(user && profile && isProfileReady) && <CloudSyncPill />}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#0B0B14',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0B14'
  },
  loadingInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingMascot: {
    width: 86,
    height: 108,
  },
  loadingText: {
    color: '#F5BA5B',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic'
  },
  syncErrorTitle: {
    color: '#FFF3D1',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  syncErrorBody: {
    color: '#D8CFEA',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 330,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 180,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 22,
    backgroundColor: '#F5BA5B',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#3A2259',
    fontSize: 14,
    fontWeight: '800',
  },
  signOutButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  signOutButtonText: {
    color: '#CFC5E5',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
