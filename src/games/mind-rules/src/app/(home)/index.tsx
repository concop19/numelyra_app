import { AppText } from '@/src/components/app-text';
import { Icon } from '@/src/components/icons';
import { RatingStars } from '@/src/components/levels/rating-stars';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { useAppTheme } from '@/src/contexts/app-theme-context';
import { TOTAL_LEVELS } from '@/src/data/puzzles';
import { useHaptics } from '@/src/helpers/hooks/use-haptics';
import { useProgress } from '@/src/store/hooks/use-progress';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, PressableFeedback, useThemeColor } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const getDailyLevel = () => {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const day = Math.floor((Date.now() - start) / 86_400_000);
  return (day % TOTAL_LEVELS) + 1;
};

const DAILY_LEVEL = getDailyLevel();

export default function Start() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { tap } = useHaptics();
  const { totalStars, completedCount, nextLevel, hasStarted } = useProgress();
  const [accent] = useThemeColor(['accent']);

  const go = (path: string) => {
    tap();
    router.push(path as never);
  };

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={[accent, 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '55%',
          opacity: isDark ? 0.16 : 0.12,
        }}
      />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-4 pt-1">
          <PressableFeedback
            onPress={() => go('/settings')}
            className="rounded-full p-2"
          >
            <Icon.Settings
              size={20}
              className="text-foreground"
            />
          </PressableFeedback>
          <ThemeToggle />
        </View>

        {/* Hero */}
        <Animated.View
          entering={FadeIn.duration(500)}
          className="flex-1 items-center justify-center gap-3 px-6"
        >
          <View className="size-20 items-center justify-center rounded-3xl bg-accent/15">
            <Icon.Lightbulb size={44} className="text-accent" />
          </View>
          <AppText
            maxFontSizeMultiplier={1.2}
            className="font-heading text-6xl text-default-foreground"
          >
            Mind
          </AppText>
          <AppText className="-mt-2 text-base tracking-[6px] text-muted">
            PUZZLE
          </AppText>
          <AppText className="mt-1 text-center text-base text-muted">
            Spot the hidden pattern. Solve for the missing number.
          </AppText>

          {/* Progress summary */}
          <View className="mt-3 flex-row items-center gap-2 rounded-full bg-surface/70 px-4 py-2">
            <RatingStars filled={1} count={1} starClassName="size-4" />
            <AppText className="font-mono-medium text-sm text-default-foreground">
              {totalStars}
            </AppText>
            <View className="mx-1 h-4 w-px bg-default" />
            <AppText className="font-mono-medium text-sm text-default-foreground">
              {completedCount}/{TOTAL_LEVELS}
            </AppText>
            <AppText className="text-sm text-muted">cleared</AppText>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          className="gap-3 px-6 pb-2"
        >
          <Button
            variant="primary"
            size="lg"
            onPress={() => go(`/levels/game/${String(nextLevel)}`)}
            className="h-14 rounded-2xl"
          >
            <Button.Label className="font-display-semibold text-base tracking-wide">
              {hasStarted ? `Continue · Level ${nextLevel}` : 'Play'}
            </Button.Label>
          </Button>

          <View className="flex-row gap-3">
            <Button
              variant="secondary"
              onPress={() => go('/levels')}
              className="h-12 flex-1 rounded-2xl"
            >
              <Button.Label>Levels</Button.Label>
            </Button>
            <Button
              variant="secondary"
              onPress={() => go(`/levels/game/${String(DAILY_LEVEL)}`)}
              className="h-12 flex-1 rounded-2xl"
            >
              <Icon.Calendar
                size={16}
                className="text-foreground"
              />
              <Button.Label className="ml-1.5">Daily</Button.Label>
            </Button>
          </View>

          <PressableFeedback
            onPress={() => go('/how-to-play')}
            className="items-center py-2"
          >
            <AppText className="text-sm text-muted">How to play</AppText>
          </PressableFeedback>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
