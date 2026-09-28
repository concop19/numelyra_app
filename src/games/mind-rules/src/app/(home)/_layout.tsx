import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useThemeColor } from 'heroui-native';
import React from 'react';
import { Platform } from 'react-native';
import { AppHeader } from '../../components/views/app-header';
import { ThemeToggle } from '../../components/theme-toggle';
import { useAppTheme } from '../../contexts/app-theme-context';

// Claude-palette window colors (hex so the native color parser is happy).
const WINDOW_BG = { light: '#FAF9F5', dark: '#262624' } as const;

export default function Layout() {
  const { isDark } = useAppTheme();
  const [background] = useThemeColor(['background']);

  // Paint the OS window + Android nav bar to match the theme so the system
  // bars don't show the default white/grey (especially in dark mode).
  React.useEffect(() => {
    const bg = isDark ? WINDOW_BG.dark : WINDOW_BG.light;
    SystemUI.setBackgroundColorAsync(bg);
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setStyle(isDark ? 'light' : 'dark');
      } catch {
        // no-op on unsupported configurations
      }
    }
  }, [isDark]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          header: (props) => <AppHeader {...props} />,
          contentStyle: { backgroundColor: background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="levels/index"
          options={{ title: 'Levels', headerRight: () => <ThemeToggle /> }}
        />
        <Stack.Screen name="levels/game/[level]" options={{ title: 'Level' }} />
        <Stack.Screen
          name="levels/game/result/index"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen
          name="how-to-play"
          options={{ title: 'How to Play', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
