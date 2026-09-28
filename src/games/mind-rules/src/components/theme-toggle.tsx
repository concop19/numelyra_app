import { Icon } from './icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { cn } from 'heroui-native';
import { type FC } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useAppTheme } from '../contexts/app-theme-context';

export const ThemeToggle: FC = () => {
  const { toggleTheme, isLight } = useAppTheme();

  const isLGAvailable = isLiquidGlassAvailable();

  return (
    <TouchableOpacity
      onPressIn={() => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
      onPressOut={() => {
        toggleTheme();
      }}
      className={cn('p-3 z-50', isLGAvailable && 'px-2.5 py-2')}
      hitSlop={12}
      activeOpacity={0.8}
    >
      {isLight ? (
        <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
          <Icon.Moon size={20} className="text-foreground" />
        </Animated.View>
      ) : (
        <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
          <Icon.Sun size={20} className="text-foreground" />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};
