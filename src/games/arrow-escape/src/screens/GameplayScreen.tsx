import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { AmbientBackground } from '../components/AmbientBackground';
import { BottomControls } from '../components/BottomControls';
import { GameHeader } from '../components/GameHeader';
import { LivesIndicator } from '../components/LivesIndicator';
import { PuzzleBoardCanvas } from '../components/PuzzleBoardCanvas';
import { SettingsModal } from '../components/SettingsModal';
import { isFrontClear } from '../game/engine';
import type { ArrowNode } from '../game/types';
import { useGameStore } from '../state/gameStore';
import { theme } from '../theme/theme';
import type { AppNavigation } from '../types/navigation';
import { playCorrectFeedback, playWrongFeedback } from '../utils/feedback';

export function GameplayScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { width, height } = useWindowDimensions();
  const board = useGameStore((s) => s.board);
  const status = useGameStore((s) => s.status);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const tapArrow = useGameStore((s) => s.tapArrow);
  const retry = useGameStore((s) => s.retry);
  const undo = useGameStore((s) => s.undo);
  const useHint = useGameStore((s) => s.useHint);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [exitingArrows, setExitingArrows] = useState<ArrowNode[]>([]);
  const pendingNav = useRef<'Victory' | 'Fail' | null>(null);
  const boardScale = useSharedValue(1);
  const boardOpacity = useSharedValue(1);

  const maxW = width * 0.95;
  const maxH = height * 0.60;
  const { columns, rows } = board.level.gridSize;
  const sizeFromWidth = maxW / columns;
  const sizeFromHeight = maxH / rows;
  const cellSize = Math.min(sizeFromWidth, sizeFromHeight, 60);
  const boardWidth = cellSize * columns;

  const animatedBoardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
    opacity: boardOpacity.value
  }));

  useEffect(() => {
    if (status === 'won') pendingNav.current = 'Victory';
    if (status === 'failed') pendingNav.current = 'Fail';
    if ((status === 'won' || status === 'failed') && exitingArrows.length === 0) {
      const t = setTimeout(() => {
        if (pendingNav.current) navigation.replace(pendingNav.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [status, exitingArrows.length, navigation]);

  useEffect(() => {
    boardOpacity.value = 0;
    boardScale.value = 0.96;
    boardOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    boardScale.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, [currentLevelId]);

  const handleExitDone = useCallback((arrowId: string) => {
    setExitingArrows((prev) => prev.filter((a) => a.id !== arrowId));
  }, []);

  const handleArrowPress = useCallback((arrowId: string) => {
    const arrow = board.arrows.find((a) => a.id === arrowId);
    const result = tapArrow(arrowId);

    if (result === 'REMOVED' && arrow) {
      setExitingArrows((prev) => [...prev, arrow]);
      boardScale.value = withSequence(
        withTiming(0.98, { duration: 70 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      void playCorrectFeedback();
    } else if (result === 'BLOCKED') {
      void playWrongFeedback(hapticsEnabled);
    }
  }, [board.arrows, tapArrow, hapticsEnabled, boardScale]);

  const handleHint = useCallback(() => {
    const hintArrow = board.arrows.find((a) => isFrontClear(a, board));
    const hintedId = useHint();
    if (hintedId && hintArrow) {
      setExitingArrows((prev) => [...prev, hintArrow]);
      boardScale.value = withSequence(
        withTiming(0.97, { duration: 100 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
      void playCorrectFeedback();
    } else {
      Alert.alert('No Hint', 'No valid move right now. Try Undo!');
    }
  }, [board, useHint, boardScale]);

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientBackground />
      <GameHeader
        title={`Level ${currentLevelId}`}
        difficulty={board.level.difficulty}
        arrowsLeft={board.arrows.length}
        totalArrows={board.level.arrows.length}
        onBack={() => navigation.replace('Home')}
        onSettings={() => setSettingsVisible(true)}
      />
      <LivesIndicator livesLeft={board.livesLeft} />
      <View style={styles.boardStage}>
        <Animated.View style={animatedBoardStyle}>
          <PuzzleBoardCanvas
            board={board}
            exitingArrows={exitingArrows}
            width={boardWidth}
            onArrowPress={handleArrowPress}
            onExitDone={handleExitDone}
          />
        </Animated.View>
      </View>
      <BottomControls onUndo={undo} onHint={handleHint} onRestart={retry} />
      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
        onRestart={() => {
          setSettingsVisible(false);
          retry();
        }} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  boardStage: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
