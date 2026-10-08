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
import { NavigationContainer } from '@react-navigation/native';
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
import GameHubScreen from './src/screens/GameHubScreen';
import { loadProfile, hasProfile, UserProfile } from './src/store/userProfile';
import { AuthProvider, useAuth } from './src/store/authContext';
import { getNotifications } from './src/services/dailyNotifications';

type RootStackParamList = {
  Main: undefined;
  Calendar: undefined;
  Astrology: undefined;
  WallpaperStudio: undefined;
  Settings: undefined;
  Games: undefined;
  ChatReadingDetail: ChatReadingDetailParams;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const notifications = getNotifications();

const linking = {
  prefixes: [Linking.createURL('/'), 'numelyra://'],
  config: {
    screens: {
      Calendar: 'calendar',
      Astrology: 'astrology',
      WallpaperStudio: 'wallpaper',
      Settings: 'settings',
      Games: 'games/:entry?',
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isReady: isAuthReady, user, syncLocalProfiles } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [continueAsGuest, setContinueAsGuest] = useState(false);
  const [loginRequested, setLoginRequested] = useState(false);

  const checkProfile = async () => {
    setIsLoading(true);
    try {
      const exists = await hasProfile();
      if (exists) {
        const p = await loadProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;
    checkProfile();
  }, [isAuthReady, user?.id]);

  let content = null;

  // Loading
  if (isLoading || !isAuthReady) {
    content = (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <View style={styles.loadingInner}>
          <Text style={styles.loadingEmoji}>🐱</Text>
          <ActivityIndicator size="large" color="#F5BA5B" style={{ marginTop: 16 }} />
          <Text style={styles.loadingText}>Tiểu Linh Miêu đang thức dậy...</Text>
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
          checkProfile();
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
          await syncLocalProfiles();
          await checkProfile();
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
            {({ navigation }) => (
              <ChatScreen
                profile={profile}
                onOpenSettings={() => navigation.navigate('Settings')}
                onOpenCalendar={() => navigation.navigate('Calendar')}
                onOpenAstrology={() => navigation.navigate('Astrology')}
                onOpenWallpaper={() => navigation.navigate('WallpaperStudio')}
                onOpenGameHub={() => navigation.navigate('Games')}
                onOpenRawReading={(message, previousQuestion) => navigation.navigate('ChatReadingDetail', { message, previousQuestion })}
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
                onBack={() => navigation.goBack()}
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
                onBack={() => navigation.goBack()}
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
                onBack={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Settings"
            options={{
              headerShown: true,
              headerTransparent: true,
              headerTitle: '',
              headerBackButtonDisplayMode: 'minimal',
              headerTintColor: '#FFD07A',
              headerShadowVisible: false,
            }}
          >
            {() => <SettingsScreen onRequestLogin={() => setLoginRequested(true)} />}
          </Stack.Screen>
          <Stack.Screen
            name="Games"
            component={GameHubScreen}
            options={{ orientation: 'all' }}
          />
          <Stack.Screen
            name="ChatReadingDetail"
            component={ChatReadingDetailScreen}
          />
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
