/**
 * App.tsx - Entry point với Navigation + Onboarding
 *
 * Flow:
 * 1. Kiểm tra profile → chưa có → OnboardingScreen
 * 2. Có profile → Chat là màn chính, các tính năng mở từ nút nổi trong cảnh chat
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet
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
    const response = notifications ? await notifications.getLastNotificationResponseAsync() : null;
    const notificationUrl = response?.notification.request.content.data?.url;
    return typeof notificationUrl === 'string' ? notificationUrl : null;
  },
  subscribe(listener: (url: string) => void) {
    const linkSubscription = Linking.addEventListener('url', ({ url }) => listener(url));
    const notificationSubscription = notifications?.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') listener(url);
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
  const { isReady: isAuthReady, user, syncLocalProfiles } = useAuth();
  const {
    isReady: isProfileReady,
    primaryProfile: profile,
    primaryProfileId,
    refreshProfiles,
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

  // Loading
  if (!isProfileReady || !isAuthReady || !isLocaleReady) {
    content = (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <View style={styles.loadingInner}>
          <Text style={styles.loadingEmoji}>🐱</Text>
          <ActivityIndicator size="large" color="#F5BA5B" style={{ marginTop: 16 }} />
          <Text style={styles.loadingText}>{t('app.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  // Account entry: an anonymous user can continue locally, while a signed-in
  // user goes directly to onboarding so their first profile is synced.
  else if (!profile && !user && !continueAsGuest) {
    content = (
      <LoginScreen
        onAuthenticated={() => {
          setLoginRequested(false);
          void refreshProfiles();
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
          try {
            await syncLocalProfiles();
          } catch (err) {
            console.warn('[App] syncLocalProfiles in onComplete failed:', err);
          }
          await refreshProfiles();
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
          await syncLocalProfiles();
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

  return content;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0B14'
  },
  loadingInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingEmoji: {
    fontSize: 48
  },
  loadingText: {
    color: '#F5BA5B',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic'
  },
});
