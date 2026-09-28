import { AppText } from '@/src/components/app-text';
import { Icon } from '@/src/components/icons';
import { cn, PressableFeedback, Surface } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import { RatingStars } from './rating-stars';

type LevelItemProps = {
  id: number;
  locked?: boolean;
  stars?: number;
  /** The next playable level — highlighted with an accent ring */
  current?: boolean;
  /** Tile width (height is derived to keep it square) */
  width: number;
  onPress?: () => void;
};

export const LevelItem: React.FC<LevelItemProps> = React.memo(
  ({ id, locked = false, stars = 0, current = false, width, onPress }) => {
    return (
      <PressableFeedback
        isDisabled={locked}
        onPress={locked ? undefined : onPress}
        style={{ width }}
        className="rounded-3xl"
      >
        <Surface
          style={{ height: width }}
          className={cn(
            'items-center justify-center gap-2 rounded-3xl border border-transparent bg-surface',
            current && 'border-2 border-accent bg-accent/5',
            // locked && 'opacity-40',
          )}
        >
          {locked ? (
            <Icon.Lock size={28} className="text-default-foreground/60" />
          ) : (
            <>
              <AppText
                maxFontSizeMultiplier={1.3}
                className={cn(
                  'font-mono-bold text-2xl',
                  current ? 'text-accent' : 'text-default-foreground',
                )}
              >
                {id}
              </AppText>
              <RatingStars filled={stars} starClassName="size-3" />
            </>
          )}
        </Surface>
        {current && (
          <View className="absolute -top-1.5 right-3 rounded-full bg-accent px-2 py-0.5">
            <AppText
              maxFontSizeMultiplier={1.2}
              className="text-[10px] font-display-bold uppercase tracking-wider text-accent-foreground"
            >
              Play
            </AppText>
          </View>
        )}
      </PressableFeedback>
    );
  },
);

LevelItem.displayName = 'LevelItem';
