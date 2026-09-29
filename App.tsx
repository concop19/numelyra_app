/**
 * App.tsx - Entry point với Navigation + Onboarding
 *
 * Flow:
 * 1. Kiểm tra profile → chưa có → OnboardingScreen
 * 2. Có profile → Bottom Tab Navigator (Chat + Lịch)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';

import OnboardingScreen from './src/screens/OnboardingScreen';
import ChatScreen from './src/screens/ChatScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import WallpaperStudioScreen from './src/screens/WallpaperStudioScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GameHubScreen from './src/screens/GameHubScreen';
import { loadProfile, hasProfile, UserProfile } from './src/store/userProfile';
import { AuthProvider, useAuth } from './src/store/authContext';
import { getNotifications } from './src/services/dailyNotifications';

// Bộ icon 4 Mùa / Linh Vật Lửa cho Thanh Điều Hướng Đáy
const TAB_CHAT_ICON = require('./assets/icons/tab_chat_flame.jpg');
const TAB_CALENDAR_ICON = require('./assets/icons/tab_calendar_flame.jpg');
const TAB_WALLPAPER_ICON = require('./assets/icons/tab_wallpaper_flame.jpg');
const TAB_SETTINGS_ICON = require('./assets/icons/tab_settings_flame.jpg');

const Tab = createBottomTabNavigator();
const notifications = getNotifications();

const linking = {
  prefixes: [Linking.createURL('/'), 'numelyra://'],
  config: { screens: { Games: 'games/:entry?' } },
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
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
              backgroundColor: '#211052',
              borderTopColor: '#6E3A9D',
              borderTopWidth: 1,
              height: 70,
              paddingBottom: 9,
              paddingTop: 6
            },
            tabBarActiveTintColor: '#FFD07A',
            tabBarInactiveTintColor: '#B98BDC',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600'
            }
          }}
        >
          <Tab.Screen
            name="Chat"
            options={{
              tabBarLabel: 'Trò chuyện',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
                  <Image
                    source={TAB_CHAT_ICON}
                    style={[styles.tabIconImage, !focused && styles.tabIconInactive]}
                    resizeMode="cover"
                  />
                </View>
              )
            }}
          >
            {({ navigation }) => <ChatScreen profile={profile} onOpenSettings={() => navigation.navigate('Settings')} />}
          </Tab.Screen>

          <Tab.Screen name="Games" component={GameHubScreen} options={{ tabBarLabel: 'Game Hub', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🎮</Text> }} />

          <Tab.Screen
            name="Calendar"
            options={{
              tabBarLabel: 'Lịch của tôi',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
                  <Image
                    source={TAB_CALENDAR_ICON}
                    style={[styles.tabIconImage, !focused && styles.tabIconInactive]}
                    resizeMode="cover"
                  />
                </View>
              )
            }}
          >
            {() => <CalendarScreen profile={profile} />}
          </Tab.Screen>

          <Tab.Screen
            name="WallpaperStudio"
            options={{
              tabBarLabel: 'Hình nền',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
                  <Image
                    source={TAB_WALLPAPER_ICON}
                    style={[styles.tabIconImage, !focused && styles.tabIconInactive]}
                    resizeMode="cover"
                  />
                </View>
              )
            }}
          >
            {() => <WallpaperStudioScreen profile={profile} />}
          </Tab.Screen>

          <Tab.Screen
            name="Settings"
            options={{
              tabBarLabel: 'Cài đặt',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
                  <Image
                    source={TAB_SETTINGS_ICON}
                    style={[styles.tabIconImage, !focused && styles.tabIconInactive]}
                    resizeMode="cover"
                  />
                </View>
              )
            }}
          >
            {() => <SettingsScreen onRequestLogin={() => setLoginRequested(true)} />}
          </Tab.Screen>
        </Tab.Navigator>
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
  tabIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tabIconWrapFocused: {
    borderWidth: 1.5,
    borderColor: '#FFD07A',
    shadowColor: '#F2A4CF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 7,
    elevation: 4,
  },
  tabIconImage: {
    width: '100%',
    height: '100%',
  },
  tabIconInactive: {
    opacity: 0.5,
  },
});
