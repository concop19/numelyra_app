import { Icon } from '@/src/components/icons';
import { cn } from 'heroui-native';
import React from 'react';
import { Animated, View } from 'react-native';

type RatingStarsProps = {
  /** Number of filled (earned) stars */
  filled: number;
  /** Total stars to render */
  count?: number;
  /** Play the entrance + idle pulse animation (used on the result screen) */
  animated?: boolean;
  /** Tailwind size class applied to each star icon */
  starClassName?: string;
  className?: string;
};

/**
 * Single source of truth for the 3-star rating used across the levels grid
 * (static, small) and the result screen (animated, large).
 */
export const RatingStars: React.FC<RatingStarsProps> = ({
  filled,
  count = 3,
  animated = false,
  starClassName = 'size-4',
  className,
}) => {
  const [anims] = React.useState(() =>
    Array.from({ length: count }).map(() => new Animated.Value(animated ? 0.2 : 1))
  );

  React.useEffect(() => {
    if (!animated) return;

    const entrance = anims.map((value, idx) =>
      Animated.sequence([
        Animated.delay(idx * 60),
        Animated.spring(value, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(120, entrance).start(() => {
      // Gentle idle pulse on the filled stars only.
      anims.slice(0, filled).forEach((value, i) => {
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.loop(
            Animated.sequence([
              Animated.timing(value, {
                toValue: 1.12,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(value, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.delay(400),
            ])
          ),
        ]).start();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  return (
    <View className={cn('flex-row items-center justify-center gap-1', className)}>
      {Array.from({ length: count }).map((_, i) => {
        const value = anims[i];
        const style = animated
          ? {
              opacity: value.interpolate({
                inputRange: [0.2, 1],
                outputRange: [0, 1],
              }),
              transform: [
                { scale: value },
                {
                  translateY: value.interpolate({
                    inputRange: [0.2, 1, 1.12],
                    outputRange: [10, 0, -2],
                  }),
                },
              ],
            }
          : undefined;

        return (
          <Animated.View key={i} style={style}>
            <Icon.Star
              className={cn(
                starClassName,
                i < filled ? 'text-amber-500' : 'text-default-foreground/30'
              )}
            />
          </Animated.View>
        );
      })}
    </View>
  );
};

export default RatingStars;
