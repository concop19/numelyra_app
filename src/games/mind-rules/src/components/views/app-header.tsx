import { AppText } from '@/src/components/app-text';
import { Icon } from '@/src/components/icons';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom Stack header.
 *
 * The native stack header double-counts the status bar inset on Android
 * edge-to-edge (a blank status-bar-height band appears above the title), and
 * `headerStatusBarHeight` isn't exposed by this version of native-stack. So we
 * render our own header and apply the top safe-area inset exactly once.
 */
export function AppHeader({ navigation, options, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const [background, foreground] = useThemeColor(['background', 'foreground']);
  const title = options.title ?? '';

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: background }}>
      <View className="h-14 flex-row items-center justify-center px-2">
        {back ? (
          <PressableFeedback
            onPress={navigation.goBack}
            className="absolute left-1 z-10 rounded-full p-2"
            accessibilityLabel="Go back"
          >
            <Icon.ChevronRight
              size={24}
              className="text-foreground"
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </PressableFeedback>
        ) : null}

        <AppText
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          className="font-heading text-lg text-foreground"
        >
          {title}
        </AppText>

        {options.headerRight ? (
          <View className="absolute right-1 z-10">
            {options.headerRight({ canGoBack: !!back, tintColor: foreground })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
