import trophyJson from '@/assets/animations/trophy.json';
import { AppText } from '@/src/components/app-text';
import { RatingStars } from '@/src/components/levels/rating-stars';
import SafeScreenView from '@/src/components/views/safe-screen';
import { LEVELS_CONFIG } from '@/src/constants';
import { TOTAL_LEVELS } from '@/src/data/puzzles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Surface } from 'heroui-native';
import LottieView from 'lottie-react-native';
import React from 'react';
import { AccessibilityInfo, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Confetti from './confetti';
import StatsGrid from './performance';

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const LevelComplete: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { HORIZONTAL_PADDING } = LEVELS_CONFIG;

  const params = useLocalSearchParams<{
    level?: string;
    stars?: string;
    timeSpent?: string;
    accuracy?: string;
    coins?: string;
    xp?: string;
  }>();

  const level = num(params.level, 1);
  const stars = num(params.stars, 3);
  const timeSpent = num(params.timeSpent, 48);
  const accuracy = num(params.accuracy, 100);
  const coins = num(params.coins, 50);
  const xp = num(params.xp, 120);

  const title = React.useMemo(() => {
    if (stars >= 3) return 'Perfect!';
    if (stars === 2) return 'Great Job!';
    if (stars === 1) return 'Nice Try!';
    return 'Level Complete!';
  }, [stars]);

  // Entrance animation for the whole card.
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  const announceForA11y = () => {
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (enabled) {
        AccessibilityInfo.announceForAccessibility(
          `Level ${level} complete. ${title}`
        );
      }
    });
  };

  React.useEffect(() => {
    scale.value = withTiming(1, { duration: 420 });
    opacity.value = withTiming(1, { duration: 420 }, (finished) => {
      if (finished) scheduleOnRN(announceForA11y);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isLastLevel = level >= TOTAL_LEVELS;

  return (
    <SafeScreenView
      edges={['top', 'bottom']}
      style={{ flex: 1, paddingHorizontal: HORIZONTAL_PADDING }}
    >
      {stars >= 3 && <Confetti />}

      <Animated.View
        style={[
          { flex: 1, alignItems: 'center', justifyContent: 'center' },
          containerStyle,
        ]}
      >
        <View className="w-full gap-5">
          <View className="items-center">
            <View className="items-center rounded-full bg-warning/10">
              <LottieView
                autoPlay
                loop={false}
                source={trophyJson}
                resizeMode="contain"
                style={{ height: width / 2, width: width / 2 }}
              />
            </View>

            <AppText className="text-xs uppercase tracking-widest text-muted">
              Level {level}
            </AppText>

            <View className="my-3">
              <RatingStars
                filled={stars}
                animated={stars >= 2}
                starClassName="size-9"
              />
            </View>

            <AppText className="font-heading text-3xl text-default-foreground">
              {title}
            </AppText>
          </View>

          <Surface className="gap-3 bg-surface/50">
            <StatsGrid
              timeSpent={timeSpent}
              accuracy={accuracy}
              coinsEarned={coins}
              xpEarned={xp}
            />

            <View className="gap-2">
              <View className="flex-row gap-2">
                <Button
                  variant="secondary"
                  onPress={() => router.navigate('/levels')}
                  className="h-12 flex-1 rounded-2xl"
                >
                  <Button.Label>Levels</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() =>
                    router.replace(`/levels/game/${String(level)}`)
                  }
                  className="h-12 flex-1 rounded-2xl"
                >
                  <Button.Label>Retry</Button.Label>
                </Button>
              </View>
              <Button
                variant="primary"
                onPress={() =>
                  isLastLevel
                    ? router.replace('/levels')
                    : router.replace(`/levels/game/${String(level + 1)}`)
                }
                accessibilityLabel={
                  isLastLevel ? 'Back to levels' : 'Go to next level'
                }
                className="h-12 rounded-2xl"
              >
                <Button.Label className="font-display-semibold tracking-wide">
                  {isLastLevel ? 'Finish' : 'Next Level'}
                </Button.Label>
              </Button>
            </View>
          </Surface>
        </View>
      </Animated.View>
    </SafeScreenView>
  );
};

export default LevelComplete;
