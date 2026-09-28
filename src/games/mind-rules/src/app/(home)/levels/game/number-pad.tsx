import { Icon } from '@/src/components/icons';
import { Button, cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

type ControlsProps = {
  value?: string;
  disabled?: boolean;
  onPressNumber?: (digit: string) => void;
  onBackspace?: () => void;
  onSubmit?: () => void;
  onHint?: () => void;
  hintUsed?: boolean;
};

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

const KEY_CLASS = 'flex-1 h-12 rounded-2xl items-center justify-center';
const DIGIT_LABEL = 'font-mono-medium text-xl text-default-foreground';

/** Numeric keypad: 1–9, then [hint] [0] [backspace], with a full-width ENTER. */
const Controls: React.FC<ControlsProps> = React.memo(
  ({
    value = '',
    disabled = false,
    onPressNumber,
    onBackspace,
    onSubmit,
    onHint,
    hintUsed = false,
  }) => {
    return (
      <View className="w-full gap-2">
        {DIGIT_ROWS.map((row) => (
          <View key={row.join('')} className="flex-row gap-2">
            {row.map((digit) => (
              <Button
                key={digit}
                variant="tertiary"
                isDisabled={disabled}
                onPress={() => onPressNumber?.(digit)}
                className={KEY_CLASS}
              >
                <Button.Label className={DIGIT_LABEL}>{digit}</Button.Label>
              </Button>
            ))}
          </View>
        ))}

        <View className="flex-row gap-2">
          <Button
            variant="tertiary"
            onPress={onHint}
            isDisabled={hintUsed || disabled}
            className={KEY_CLASS}
          >
            <Icon.Lightbulb
              size={24}
              className={cn(
                hintUsed ? 'text-default-foreground/30' : 'text-warning'
              )}
            />
          </Button>
          <Button
            variant="tertiary"
            isDisabled={disabled}
            onPress={() => onPressNumber?.('0')}
            className={KEY_CLASS}
          >
            <Button.Label className={DIGIT_LABEL}>0</Button.Label>
          </Button>
          <Button
            variant="tertiary"
            isDisabled={disabled}
            onPress={onBackspace}
            className={KEY_CLASS}
          >
            <Icon.Backspace
              size={22}
              className="text-default-foreground"
            />
          </Button>
        </View>

        <Button
          variant="primary"
          onPress={onSubmit}
          isDisabled={!value || disabled}
          className="h-14 rounded-2xl"
        >
          <Button.Label className="font-display-semibold tracking-wider">
            ENTER
          </Button.Label>
        </Button>
      </View>
    );
  }
);

Controls.displayName = 'Controls';

export default Controls;
