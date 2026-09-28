import { Alice_400Regular } from '@expo-google-fonts/alice';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Saira_400Regular,
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
} from '@expo-google-fonts/saira';
import {
  SNPro_400Regular,
  SNPro_500Medium,
  SNPro_600SemiBold,
  SNPro_700Bold,
} from '@expo-google-fonts/sn-pro';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { HeroUINativeProvider } from 'heroui-native';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  KeyboardAvoidingView,
  KeyboardProvider,
} from 'react-native-keyboard-controller';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import '../../global.css';
import { AppThemeProvider } from '../contexts/app-theme-context';

// `setOptions` is a no-op in Expo Go and logs a warning there, so only
// configure the splash animation in dev/production builds.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({
    duration: 300,
    fade: true,
  });
}

/**
 * Component that wraps app content inside KeyboardProvider
 * Contains the contentWrapper and HeroUINativeProvider configuration
 */
function AppContent() {
  const contentWrapper = useCallback(
    (children: React.ReactNode) => (
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior="padding"
        keyboardVerticalOffset={12}
        className="flex-1"
      >
        {children}
      </KeyboardAvoidingView>
    ),
    [],
  );

  return (
    <AppThemeProvider>
      <HeroUINativeProvider
        config={{
          textProps: {
            maxFontSizeMultiplier: 2,
          },
          toast: {
            contentWrapper,
          },
          devInfo: {
            stylingPrinciples: false,
          },
        }}
      >
        <Slot />
      </HeroUINativeProvider>
    </AppThemeProvider>
  );
}

export default function Layout() {
  const fonts = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Saira_400Regular,
    Saira_500Medium,
    Saira_600SemiBold,
    Saira_700Bold,
    SNPro_400Regular,
    SNPro_500Medium,
    SNPro_600SemiBold,
    SNPro_700Bold,
    Alice_400Regular,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  if (!fonts) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <KeyboardProvider>
          <AppContent />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
