/**
 * Game screen
 *
 * Wires the `useZipGame` hook to the visible Grid + HUD + WinModal. Handles
 * the win persistence flow (advance streak when in daily mode, save best
 * time/moves either way).
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/zip/Confetti';
import { Grid } from '@/components/zip/Grid';
import { HUD } from '@/components/zip/HUD';
import { TutorialModal } from '@/components/zip/TutorialModal';
import { WinModal } from '@/components/zip/WinModal';
import { palette } from '@/game/colors';
import {
  getDailyDateKey,
  getPuzzleById,
  PUZZLES,
} from '@/game/puzzles';
import {
  advanceDailyStreak,
  loadProgress,
  markTutorialSeen,
  recordCompletion,
} from '@/game/storage';
import { useZipGame } from '@/hooks/useZipGame';

export default function GameScreen() {
  const params = useLocalSearchParams<{ puzzleId?: string; mode?: string }>();
  const puzzleId = params.puzzleId ?? PUZZLES[0].id;
  const mode = params.mode === 'daily' ? 'daily' : 'practice';

  const puzzle = useMemo(
    () => getPuzzleById(puzzleId) ?? PUZZLES[0],
    [puzzleId],
  );

  const [winInfo, setWinInfo] = useState<{
    timeSec: number;
    moves: number;
    backtracks: number;
  } | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [completedSnapshot, setCompletedSnapshot] = useState<{
    bestTimeSec: number;
    bestMoves: number;
    bestBacktracks: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProgress().then((progress) => {
      if (!cancelled && !progress.hasSeenTutorial) {
        setTutorialVisible(true);
      }
      if (!cancelled) {
        setCompletedSnapshot(progress.completed[puzzle.id] ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [puzzle.id]);

  const handleWin = useCallback(
    async (stats: { timeSec: number; moves: number; backtracks: number }) => {
      setWinInfo(stats);
      const progress = await recordCompletion({
        puzzleId: puzzle.id,
        timeSec: stats.timeSec,
        moves: stats.moves,
        backtracks: stats.backtracks,
      });
      setCompletedSnapshot(progress.completed[puzzle.id] ?? null);
      if (mode === 'daily') {
        await advanceDailyStreak({ todayKey: getDailyDateKey() });
      }
    },
    [mode, puzzle.id],
  );

  const solvedInitialState = useMemo(
    () =>
      completedSnapshot
        ? {
            path: puzzle.solution,
            moves: completedSnapshot.bestMoves,
            backtracks: completedSnapshot.bestBacktracks,
            elapsedSec: completedSnapshot.bestTimeSec,
            isComplete: true,
          }
        : null,
    [completedSnapshot, puzzle.solution],
  );

  const isLockedSolved = completedSnapshot !== null && winInfo === null;

  const game = useZipGame({
    puzzle,
    locked: isLockedSolved,
    initialState: solvedInitialState,
    onWin: handleWin,
  });

  const { width } = useWindowDimensions();
  const boardMax = Math.min(width - 32, 480);

  // Find the next puzzle in the practice list for the WinModal "Next" button.
  const currentIndex = PUZZLES.findIndex((p) => p.id === puzzle.id);
  const hasNext = currentIndex >= 0 && currentIndex < PUZZLES.length - 1;
  const nextPuzzle = hasNext ? PUZZLES[currentIndex + 1] : null;
  const scoreLabel = mode === 'daily' ? 'Zip Daily' : `Zip ${puzzle.name}`;

  const shareScore = useCallback(async () => {
    if (!winInfo) return;
    const flawless = winInfo.backtracks === 0;
    const minutes = Math.floor(winInfo.timeSec / 60);
    const seconds = String(winInfo.timeSec % 60).padStart(2, '0');
    const time = `${minutes}:${seconds}`;
    const lineOne = `${scoreLabel} | ${time}${flawless ? ' and flawless 🏁' : ' complete 🏁'}`;
    const lineTwo = flawless
      ? 'With no backtracks 🟢'
      : `With ${winInfo.backtracks} backtrack${winInfo.backtracks === 1 ? '' : 's'} 🟡`;

    await Share.share({
      message: `${lineOne}\n${lineTwo}`,
    });
  }, [scoreLabel, winInfo]);

  const closeTutorial = useCallback(() => {
    setTutorialVisible(false);
    markTutorialSeen().catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.modeKicker}>
            {mode === 'daily' ? 'Daily' : 'Practice'}
          </Text>
          <Text style={styles.titleText}>{puzzle.name}</Text>
        </View>
        <View style={{ width: 64 }} />
      </View>

      <View style={styles.body}>
        <HUD
          stats={game.stats}
          disabled={game.isComplete}
          onUndo={game.undo}
          onReset={game.reset}
          onHint={game.hint}
        />

        <View style={styles.boardWrap}>
          <Grid
            puzzle={puzzle}
            path={game.path}
            hintCell={game.hintCell}
            maxWidth={boardMax}
            disabled={isLockedSolved}
            onBegin={game.beginAt}
            onEnter={game.enter}
          />
        </View>

        <Text style={styles.helper}>
          {isLockedSolved
            ? 'Already solved. This zip is locked with your saved result.'
            : game.path.length === 0
            ? `Press and hold on "1" to start drawing.`
            : game.stats.nextCheckpoint !== null
              ? `Heading for ${game.stats.nextCheckpoint}.`
              : `Fill the rest of the board to finish.`}
        </Text>

        <Pressable
          onPress={() => setTutorialVisible(true)}
          style={({ pressed }) => [styles.helpLink, pressed && { opacity: 0.65 }]}
        >
          <Text style={styles.helpLinkText}>How to play</Text>
        </Pressable>
      </View>

      <Confetti active={game.isComplete} />

      <WinModal
        visible={game.isComplete && winInfo !== null}
        scoreLabel={scoreLabel}
        timeSec={winInfo?.timeSec ?? 0}
        moves={winInfo?.moves ?? 0}
        backtracks={winInfo?.backtracks ?? 0}
        hasNext={hasNext}
        onShare={shareScore}
        onNext={() => {
          if (!nextPuzzle) return;
          setWinInfo(null);
          router.replace({
            pathname: '/game',
            params: { puzzleId: nextPuzzle.id, mode: 'practice' },
          });
        }}
        onReplay={() => {
          setWinInfo(null);
          game.restart();
          setCompletedSnapshot(null);
        }}
        onHome={() => {
          setWinInfo(null);
          router.replace('/');
        }}
      />

      <TutorialModal visible={tutorialVisible} onClose={closeTutorial} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 64,
  },
  backText: {
    color: palette.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  modeKicker: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 18,
  },
  boardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  helpLink: {
    marginTop: -8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  helpLinkText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
