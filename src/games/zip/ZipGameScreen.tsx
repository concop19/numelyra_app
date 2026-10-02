import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Confetti } from './components/zip/Confetti';
import { Grid } from './components/zip/Grid';
import { HUD } from './components/zip/HUD';
import { TutorialModal } from './components/zip/TutorialModal';
import { WinModal } from './components/zip/WinModal';
import { palette } from './game/colors';
import {
  getDailyDateKey,
  getDailyPuzzle,
  getPuzzleById,
  PUZZLES,
} from './game/puzzles';
import {
  advanceDailyStreak,
  loadProgress,
  recordCompletion,
} from './game/storage';
import type { PersistedProgress, Puzzle } from './game/types';
import { useZipGame } from './hooks/useZipGame';
import { useGameAudioMode, useGameSound } from '../shared/useGameSound';

const zipFinishedSound = require('../../../assets/games/sound/zip/finish_game_zip.wav');

type Props = {
  dailyMode?: boolean;
  onDailyComplete?: () => void;
};

const DIFFICULTY_LABELS: Record<Puzzle['difficulty'], { label: string; color: string }> = {
  easy: { label: 'DỄ', color: '#22C55E' },
  medium: { label: 'VỪA', color: '#F5BA5B' },
  hard: { label: 'KHÓ', color: '#F43F5E' },
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ZipGameScreen({ dailyMode = false, onDailyComplete }: Props) {
  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const [selectedId, setSelectedId] = useState<string | null>(
    dailyMode ? dailyPuzzle.id : null,
  );
  const [progress, setProgress] = useState<PersistedProgress | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  const refreshProgress = useCallback(async () => {
    const data = await loadProgress();
    setProgress(data);
  }, []);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const activePuzzle = useMemo(() => {
    if (!selectedId) return null;
    if (selectedId === dailyPuzzle.id) return dailyPuzzle;
    return getPuzzleById(selectedId) ?? PUZZLES[0];
  }, [selectedId, dailyPuzzle]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {!activePuzzle ? (
          <ZipLibrary
            dailyPuzzle={dailyPuzzle}
            progress={progress}
            onSelectPuzzle={(id) => setSelectedId(id)}
            onOpenTutorial={() => setTutorialVisible(true)}
          />
        ) : (
          <ZipGameBoard
            key={activePuzzle.id}
            puzzle={activePuzzle}
            isDaily={activePuzzle.id === dailyPuzzle.id}
            progress={progress}
            onBack={() => {
              setSelectedId(null);
              void refreshProgress();
            }}
            onDailyComplete={onDailyComplete}
            onOpenTutorial={() => setTutorialVisible(true)}
            onProgressUpdated={refreshProgress}
            onSelectNext={(nextId) => setSelectedId(nextId)}
          />
        )}

        <TutorialModal
          visible={tutorialVisible}
          onClose={() => setTutorialVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                LEVEL LIBRARY                               */
/* -------------------------------------------------------------------------- */

interface ZipLibraryProps {
  dailyPuzzle: Puzzle;
  progress: PersistedProgress | null;
  onSelectPuzzle: (id: string) => void;
  onOpenTutorial: () => void;
}

function ZipLibrary({
  dailyPuzzle,
  progress,
  onSelectPuzzle,
  onOpenTutorial,
}: ZipLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const todayKey = getDailyDateKey();
  const isDailyDone = progress?.lastDailyDate === todayKey;

  const filteredPuzzles = useMemo(() => {
    if (filter === 'all') return PUZZLES;
    return PUZZLES.filter((p) => p.difficulty === filter);
  }, [filter]);

  const totalCompleted = useMemo(() => {
    if (!progress) return 0;
    return PUZZLES.filter((p) => progress.completed[p.id]).length;
  }, [progress]);

  return (
    <ScrollView
      style={styles.libraryScroll}
      contentContainerStyle={styles.libraryContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Bar */}
      <View style={styles.libraryHeader}>
        <View>
          <Text style={styles.eyebrow}>TRÒ CHƠI NỐI Ô · ZIP</Text>
          <Text style={styles.libraryTitle}>Chọn màn chơi</Text>
          <Text style={styles.librarySub}>
            Nối toàn bộ ô trong một đường liền mạch. Đi qua các số theo đúng thứ tự.
          </Text>
        </View>

        <Pressable
          onPress={onOpenTutorial}
          style={({ pressed }) => [
            styles.helpBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.helpBtnText}>❓ Luật chơi</Text>
        </Pressable>
      </View>

      {/* Daily Challenge Card */}
      <Pressable
        onPress={() => onSelectPuzzle(dailyPuzzle.id)}
        style={({ pressed }) => [
          styles.dailyCard,
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View style={styles.dailyHeaderRow}>
          <View style={styles.dailyBadge}>
            <Text style={styles.dailyBadgeText}>✦ THỬ THÁCH HÔM NAY</Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>
              🔥 {progress?.streak ?? 0} ngày liên tiếp
            </Text>
          </View>
        </View>

        <Text style={styles.dailyTitle}>Bàn cờ Daily ({todayKey})</Text>
        <Text style={styles.dailyMeta}>
          Kích thước {dailyPuzzle.size}×{dailyPuzzle.size} ·{' '}
          {dailyPuzzle.checkpoints.length} chốt số · Độ khó{' '}
          {DIFFICULTY_LABELS[dailyPuzzle.difficulty].label}
        </Text>

        <View style={styles.dailyBottomRow}>
          <Text
            style={[
              styles.dailyStatusText,
              isDailyDone && styles.dailyStatusDone,
            ]}
          >
            {isDailyDone ? '✓ Đã hoàn thành hôm nay' : 'Chạm để giải đố ngay ›'}
          </Text>
        </View>
      </Pressable>

      {/* Stats summary & Filters */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Màn luyện tập ({totalCompleted}/{PUZZLES.length})
        </Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'easy', 'medium', 'hard'] as const).map((tab) => {
          const active = filter === tab;
          const labels: Record<typeof tab, string> = {
            all: 'Tất cả',
            easy: 'Dễ (5×5)',
            medium: 'Vừa (6×6)',
            hard: 'Khó (7-8×8)',
          };
          return (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterTab, active && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  active && styles.filterTabTextActive,
                ]}
              >
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Puzzle list */}
      <View style={styles.puzzleGrid}>
        {filteredPuzzles.map((item, index) => {
          const record = progress?.completed[item.id];
          const diffInfo = DIFFICULTY_LABELS[item.difficulty];
          const globalIndex = PUZZLES.findIndex((p) => p.id === item.id);

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectPuzzle(item.id)}
              style={({ pressed }) => [
                styles.puzzleCard,
                record && styles.puzzleCardDone,
                pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
              ]}
            >
              <View style={styles.puzzleCardLeft}>
                <View
                  style={[
                    styles.puzzleIndexCircle,
                    record && styles.puzzleIndexCircleDone,
                  ]}
                >
                  <Text style={styles.puzzleIndexText}>
                    {String(globalIndex + 1).padStart(2, '0')}
                  </Text>
                </View>

                <View style={styles.puzzleInfo}>
                  <View style={styles.puzzleNameRow}>
                    <Text style={styles.puzzleName}>{item.name}</Text>
                    {record && (
                      <Text style={styles.checkDone}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.puzzleMetaText}>
                    {item.size}×{item.size} · {item.checkpoints.length} số ·{' '}
                    {item.walls?.length ? `${item.walls.length} rào` : 'Không rào'}
                  </Text>
                  {record && (
                    <Text style={styles.bestScoreText}>
                      Kỷ lục: {formatTime(record.bestTimeSec)} ({record.bestMoves} bước)
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.diffBadge,
                  { borderColor: diffInfo.color, backgroundColor: `${diffInfo.color}15` },
                ]}
              >
                <Text style={[styles.diffBadgeText, { color: diffInfo.color }]}>
                  {diffInfo.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*                              ACTIVE GAME BOARD                             */
/* -------------------------------------------------------------------------- */

interface ZipGameBoardProps {
  puzzle: Puzzle;
  isDaily: boolean;
  progress: PersistedProgress | null;
  onBack: () => void;
  onDailyComplete?: () => void;
  onOpenTutorial: () => void;
  onProgressUpdated: () => void;
  onSelectNext: (id: string) => void;
}

function ZipGameBoard({
  puzzle,
  isDaily,
  progress,
  onBack,
  onDailyComplete,
  onOpenTutorial,
  onProgressUpdated,
  onSelectNext,
}: ZipGameBoardProps) {
  const { width, height } = useWindowDimensions();
  useGameAudioMode();
  const playZipFinished = useGameSound(zipFinishedSound);
  // Ensure board fits vertically and horizontally with comfortable margins
  const boardMax = Math.min(width - 28, Math.max(280, height - 320), 410);

  const [winInfo, setWinInfo] = useState<{
    timeSec: number;
    moves: number;
    backtracks: number;
  } | null>(null);

  const completedRecord = progress?.completed[puzzle.id] ?? null;

  const handleWin = useCallback(
    async (stats: { timeSec: number; moves: number; backtracks: number }) => {
      playZipFinished();
      setWinInfo(stats);
      await recordCompletion({
        puzzleId: puzzle.id,
        timeSec: stats.timeSec,
        moves: stats.moves,
        backtracks: stats.backtracks,
      });
      if (isDaily) {
        await advanceDailyStreak({ todayKey: getDailyDateKey() });
        onDailyComplete?.();
      }
      onProgressUpdated();
    },
    [isDaily, onDailyComplete, onProgressUpdated, playZipFinished, puzzle.id],
  );

  const game = useZipGame({
    puzzle,
    locked: winInfo !== null,
    onWin: handleWin,
  });

  const currentIndex = PUZZLES.findIndex((p) => p.id === puzzle.id);
  const hasNext = currentIndex >= 0 && currentIndex < PUZZLES.length - 1;
  const nextPuzzle = hasNext ? PUZZLES[currentIndex + 1] : null;

  const scoreLabel = isDaily ? 'Zip Daily' : `Zip · ${puzzle.name}`;
  const diffInfo = DIFFICULTY_LABELS[puzzle.difficulty];

  return (
    <View style={styles.boardScreenContainer}>
      {/* Top Navigation */}
      <View style={styles.navRow}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.backBtnText}>‹ Danh sách</Text>
        </Pressable>

        <View style={styles.navTitleCenter}>
          <Text style={styles.navLevelTitle}>
            {isDaily ? 'DAILY CHALLENGE' : puzzle.name}
          </Text>
          <View style={styles.navSubRow}>
            <View
              style={[
                styles.navDiffPill,
                { borderColor: diffInfo.color, backgroundColor: `${diffInfo.color}20` },
              ]}
            >
              <Text style={[styles.navDiffText, { color: diffInfo.color }]}>
                {diffInfo.label}
              </Text>
            </View>
            <Text style={styles.navGridSizeText}>
              {puzzle.size}×{puzzle.size} · {puzzle.checkpoints.length} số
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onOpenTutorial}
          style={({ pressed }) => [
            styles.iconHelpBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.iconHelpText}>?</Text>
        </Pressable>
      </View>

      {/* Main HUD */}
      <View style={styles.hudWrapper}>
        <HUD
          stats={game.stats}
          disabled={game.isComplete}
          onUndo={game.undo}
          onReset={game.reset}
          onHint={game.hint}
        />
      </View>

      {/* Grid Container */}
      <View style={styles.gridOuterContainer}>
        <Grid
          puzzle={puzzle}
          path={game.path}
          hintCell={game.hintCell}
          maxWidth={boardMax}
          disabled={game.isComplete}
          onBegin={game.beginAt}
          onEnter={game.enter}
        />
      </View>

      {/* Footer Instruction */}
      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          {game.path.length === 0
            ? '👉 Chạm vào ô số 1 và giữ tay kéo qua các ô kế tiếp'
            : game.isComplete
            ? '🎉 Đã hoàn thành toàn bộ ô!'
            : `Đang nối... Nhắm tới chốt số ${game.stats.nextCheckpoint ?? 'cuối'}`}
        </Text>
      </View>

      {/* Confetti celebration */}
      <Confetti active={winInfo !== null} />

      {/* Win Modal */}
      <WinModal
        visible={winInfo !== null}
        scoreLabel={scoreLabel}
        timeSec={winInfo?.timeSec ?? 0}
        moves={winInfo?.moves ?? 0}
        backtracks={winInfo?.backtracks ?? 0}
        hasNext={hasNext && !isDaily}
        onNext={() => {
          setWinInfo(null);
          if (nextPuzzle) onSelectNext(nextPuzzle.id);
        }}
        onReplay={() => {
          setWinInfo(null);
          game.restart();
        }}
        onHome={onBack}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },

  // Library Styles
  libraryScroll: {
    flex: 1,
  },
  libraryContent: {
    padding: 16,
    paddingBottom: 40,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 6,
  },
  eyebrow: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  libraryTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  librarySub: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 260,
  },
  helpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  helpBtnText: {
    color: '#FFD54F',
    fontSize: 12,
    fontWeight: '700',
  },

  // Daily Card
  dailyCard: {
    backgroundColor: '#131826',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dailyBadgeText: {
    color: '#FFE082',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  streakPill: {
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
  },
  dailyTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  dailyMeta: {
    color: '#9CA3AF',
    fontSize: 12.5,
    marginTop: 4,
  },
  dailyBottomRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#272B40',
  },
  dailyStatusText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '800',
  },
  dailyStatusDone: {
    color: '#10B981',
  },

  // Section & Filter
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterTabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    borderColor: '#D4AF37',
  },
  filterTabText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#FFD54F',
    fontWeight: '800',
  },

  // Puzzle List
  puzzleGrid: {
    gap: 10,
  },
  puzzleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  puzzleCardDone: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#0F1A1E',
  },
  puzzleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  puzzleIndexCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2337',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  puzzleIndexCircleDone: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  puzzleIndexText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '900',
  },
  puzzleInfo: {
    flex: 1,
  },
  puzzleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  puzzleName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  checkDone: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '900',
  },
  puzzleMetaText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  bestScoreText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Game Board Styles
  boardScreenContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backBtnText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '800',
  },
  navTitleCenter: {
    alignItems: 'center',
  },
  navLevelTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  navSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  navDiffPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  navDiffText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  navGridSizeText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  iconHelpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHelpText: {
    color: '#FFD54F',
    fontSize: 15,
    fontWeight: '900',
  },

  hudWrapper: {
    width: '100%',
  },
  gridOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  footerNote: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  footerNoteText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});
