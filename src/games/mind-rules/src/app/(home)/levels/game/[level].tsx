import { AppText } from '@/src/components/app-text';
import { Icon } from '@/src/components/icons';
import SafeScreenView from '@/src/components/views/safe-screen';
import { LEVELS_CONFIG } from '@/src/constants';
import { computeStars, getPuzzle } from '@/src/data/puzzles';
import { useHaptics } from '@/src/helpers/hooks/use-haptics';
import { useProgress } from '@/src/store/hooks/use-progress';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { cn, Surface, useToast } from 'heroui-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GameMenu from './menu';
import Controls from './number-pad';

const MAX_ANSWER_LENGTH = 6;
type Status = 'idle' | 'correct' | 'wrong';

const Equation: React.FC<{
  input: number | string;
  output: string;
  tone?: 'default' | 'accent' | 'success' | 'danger';
}> = ({ input, output, tone = 'default' }) => {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-default-foreground';

  return (
    <View className="flex-row items-center justify-center gap-4">
      <AppText
        maxFontSizeMultiplier={1.1}
        className="font-mono-bold text-3xl text-default-foreground"
      >
        {input}
      </AppText>
      <Icon.ArrowRight size={20} className="text-muted" />
      <AppText
        maxFontSizeMultiplier={1.1}
        className={cn('font-mono-bold text-3xl', toneClass)}
      >
        {output}
      </AppText>
    </View>
  );
};

const Game: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { tap, success, error } = useHaptics();
  const { recordStars } = useProgress();
  const { level } = useLocalSearchParams<{ level: string }>();

  const levelNum = Number(level) || 1;
  const puzzle = React.useMemo(() => getPuzzle(levelNum), [levelNum]);

  const { HORIZONTAL_PADDING } = LEVELS_CONFIG;

  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const hintUsedRef = React.useRef(false);
  const [hintUsed, setHintUsed] = useState(false);
  const wrongAttemptsRef = React.useRef(0);
  const startedAtRef = React.useRef(0);

  React.useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const shakeX = useSharedValue(0);
  const popScale = useSharedValue(1);

  const answerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: popScale.value }],
  }));

  const reset = () => {
    setAnswer('');
    setStatus('idle');
    hintUsedRef.current = false;
    setHintUsed(false);
    wrongAttemptsRef.current = 0;
    startedAtRef.current = Date.now();
  };

  const handleSubmit = () => {
    if (status !== 'idle' || !answer) return;

    if (Number(answer) === puzzle.answer) {
      success();
      setStatus('correct');
      // eslint-disable-next-line react-hooks/immutability
      popScale.value = withSequence(
        withSpring(1.25, { damping: 6 }),
        withSpring(1)
      );

      const stars = computeStars(hintUsedRef.current, wrongAttemptsRef.current);
      const timeSpent = Math.round((Date.now() - startedAtRef.current) / 1000);
      recordStars(levelNum, stars);

      setTimeout(() => {
        router.replace({
          pathname: '/levels/game/result',
          params: {
            level: String(levelNum),
            stars: String(stars),
            timeSpent: String(timeSpent),
            coins: String(stars * 20),
            xp: String(50 + stars * 25),
          },
        });
      }, 720);
    } else {
      error();
      wrongAttemptsRef.current += 1;
      setStatus('wrong');
      // eslint-disable-next-line react-hooks/immutability
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 80 }),
        withTiming(-6, { duration: 80 }),
        withTiming(0, { duration: 60 })
      );
      setTimeout(() => {
        setAnswer('');
        setStatus('idle');
      }, 600);
    }
  };

  const showHint = () => {
    if (hintUsedRef.current) return;
    hintUsedRef.current = true;
    setHintUsed(true);
    tap();
    toast.show({
      variant: 'success',
      label: 'Hint unlocked',
      description: puzzle.hint,
      icon: <Icon.Lightbulb size={32} className="text-success" />,
      actionLabel: 'Got it',
      duration: 6000,
      onActionPress: ({ hide }) => hide(),
    });
  };

  const showHowToPlay = () => {
    toast.show({
      variant: 'default',
      label: 'How to play',
      description:
        'Each example shows how an input becomes an output. Work out the rule, then enter the result for the final number.',
      duration: 5000,
    });
  };

  const outputTone =
    status === 'correct' ? 'success' : status === 'wrong' ? 'danger' : 'accent';

  return (
    <>
      <Stack.Screen
        options={{
          title: `Level ${levelNum}`,
          headerRight: () => (
            <GameMenu
              onRestart={reset}
              onHowToPlay={showHowToPlay}
              onQuit={() => router.navigate('/levels')}
            />
          ),
        }}
      />
      <SafeScreenView
        edges={['bottom']}
        style={{ flex: 1, paddingHorizontal: HORIZONTAL_PADDING }}
      >
        <View className="flex-1 gap-3 pt-3">
          <Surface className="flex-1 justify-center gap-6 bg-surface/50">
            <View className="items-center gap-1">
              <AppText className="text-xs uppercase tracking-widest text-accent">
                {puzzle.title}
              </AppText>
              <AppText className="text-center text-sm text-muted">
                Find the rule, solve for the missing value
              </AppText>
            </View>

            <View className="gap-3">
              {puzzle.equations.map((eq, idx) => (
                <Equation
                  key={idx}
                  input={eq.input}
                  output={String(eq.output)}
                />
              ))}

              <View className="my-1 h-px w-24 self-center bg-default" />

              <Animated.View style={answerStyle}>
                <Equation
                  input={puzzle.question}
                  output={answer || '?'}
                  tone={outputTone}
                />
              </Animated.View>
            </View>
          </Surface>

          <Surface className="bg-surface/50 p-2.5">
            <Controls
              value={answer}
              hintUsed={hintUsed}
              disabled={status === 'correct'}
              onHint={showHint}
              onSubmit={handleSubmit}
              onBackspace={() => {
                tap();
                setAnswer((p) => p.slice(0, -1));
              }}
              onPressNumber={(d) => {
                tap();
                setAnswer((p) =>
                  p.length >= MAX_ANSWER_LENGTH ? p : p === '0' ? d : p + d
                );
              }}
            />
          </Surface>
        </View>
      </SafeScreenView>
    </>
  );
};

export default Game;
