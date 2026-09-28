import { useNavigation } from '@react-navigation/native';
import { Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AmbientBackground } from '../components/AmbientBackground';
import { GameHeader } from '../components/GameHeader';
import { HintBubble } from '../components/HintBubble';
import { PuzzleBoardCanvas } from '../components/PuzzleBoardCanvas';
import { createInitialBoard } from '../game/engine';
import { getLevel } from '../levels/levels';
import { useGameStore } from '../state/gameStore';
import { theme } from '../theme/theme';
import type { AppNavigation } from '../types/navigation';

const tutorialBoard = createInitialBoard(getLevel(1));

export function TutorialScreen() {
  const navigation = useNavigation<AppNavigation>();
  const completeTutorial = useGameStore((state) => state.completeTutorial);
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(width * 0.44, 220);

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientBackground />
      <GameHeader title="Level 1" showBack={false} />
      <View style={styles.content}>
        <HintBubble text="Tap an arrow" />
        <Pressable
          style={[styles.boardRow, { cursor: 'pointer' as any }]}
          onPress={() => {
            completeTutorial();
            navigation.replace('Gameplay');
          }}
        >
          <PuzzleBoardCanvas
            board={tutorialBoard}
            width={boardWidth}
            exitingArrows={[]}
            onExitDone={() => {}}
            onArrowPress={() => {
              completeTutorial();
              navigation.replace('Gameplay');
            }}
          />
          <Text style={styles.hand}>☝</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
    flex: 1
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 180
  },
  boardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 48
  },
  hand: {
    color: theme.colors.arrowStroke,
    fontSize: 58,
    marginLeft: -6,
    marginTop: 48,
    transform: [{ rotate: '-25deg' }]
  }
});
