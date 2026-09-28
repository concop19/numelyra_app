import { AppText } from '@/src/components/app-text';
import { LevelItem } from '@/src/components/levels/elements';
import { RatingStars } from '@/src/components/levels/rating-stars';
import SafeScreenView from '@/src/components/views/safe-screen';
import { LEVELS_CONFIG } from '@/src/constants';
import { TOTAL_LEVELS } from '@/src/data/puzzles';
import { useHaptics } from '@/src/helpers/hooks/use-haptics';
import { useProgress } from '@/src/store/hooks/use-progress';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LevelSelect: React.FC = () => {
  const { ROW_GAP, COLUMN_GAP, NUM_COLUMNS, HORIZONTAL_PADDING } =
    LEVELS_CONFIG;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tap } = useHaptics();
  const { width: windowWidth } = useWindowDimensions();
  const { starsFor, isUnlocked, nextLevel, totalStars, completedCount } =
    useProgress();

  const itemWidth = React.useMemo(() => {
    const totalGaps = COLUMN_GAP * (NUM_COLUMNS - 1);
    const available = windowWidth - HORIZONTAL_PADDING * 2 - totalGaps;
    return Math.floor(available / NUM_COLUMNS);
  }, [COLUMN_GAP, NUM_COLUMNS, windowWidth, HORIZONTAL_PADDING]);

  const levels = React.useMemo(
    () =>
      Array.from({ length: TOTAL_LEVELS }).map((_, idx) => {
        const id = idx + 1;
        return { id, locked: !isUnlocked(id), stars: starsFor(id) };
      }),
    [isUnlocked, starsFor],
  );

  return (
    <SafeScreenView
      edges={['bottom']}
      style={{ flex: 1, paddingHorizontal: HORIZONTAL_PADDING }}
    >
      <FlatList
        data={levels}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ gap: COLUMN_GAP, marginBottom: ROW_GAP }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <View className="mb-4 mt-3 flex-row items-center justify-between rounded-2xl bg-default px-4 py-3">
            <View>
              <AppText className="text-xs text-muted">Completed</AppText>
              <AppText className="font-mono-medium text-lg text-default-foreground">
                {completedCount}
                <AppText className="text-base text-muted">
                  {' '}
                  / {TOTAL_LEVELS}
                </AppText>
              </AppText>
            </View>
            <View className="items-end">
              <AppText className="text-xs text-muted">Stars earned</AppText>
              <View className="flex-row items-center gap-1.5">
                <RatingStars filled={1} count={1} starClassName="size-4" />
                <AppText className="font-mono-medium text-lg text-default-foreground">
                  {totalStars}
                </AppText>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(260).delay(index * 35)}>
            <LevelItem
              id={item.id}
              locked={item.locked}
              stars={item.stars}
              current={item.id === nextLevel && !item.locked}
              width={itemWidth}
              onPress={() => {
                tap();
                router.push(`/levels/game/${String(item.id)}`);
              }}
            />
          </Animated.View>
        )}
      />
    </SafeScreenView>
  );
};

export default LevelSelect;
