/**
 * Home screen
 *
 * Shows: app title, today's daily puzzle (with streak), and a list of all
 * available puzzles tagged by difficulty + best time when previously solved.
 */

import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/game/colors';
import {
  getDailyDateKey,
  getDailyPuzzle,
  PUZZLES,
} from '@/game/puzzles';
import { loadProgress } from '@/game/storage';
import type { PersistedProgress, Puzzle } from '@/game/types';

const DIFFICULTY_COLOR: Record<Puzzle['difficulty'], string> = {
  easy: '#15803D',
  medium: '#B45309',
  hard: '#BE185D',
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  const [progress, setProgress] = useState<PersistedProgress | null>(null);
  const daily = getDailyPuzzle();
  const todayKey = getDailyDateKey();
  const dailyDoneToday = progress?.lastDailyDate === todayKey;

  // Reload progress whenever this screen comes back into focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadProgress().then((p) => {
        if (!cancelled) setProgress(p);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>ZIP</Text>
        <Text style={styles.tagline}>
          Connect every cell. Hit the numbers in order.
        </Text>

        {/* Daily card */}
        <Link
          href={{ pathname: '/game', params: { puzzleId: daily.id, mode: 'daily' } }}
          asChild
        >
          <Pressable
            style={({ pressed }) => [
              styles.dailyCard,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.dailyKicker}>Today&apos;s puzzle</Text>
              <Text style={styles.dailyTitle}>{daily.name}</Text>
              <Text style={styles.dailySubtitle}>
                {daily.size}×{daily.size} ·{' '}
                {daily.checkpoints.length} numbers ·{' '}
                {daily.difficulty}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakValue}>{progress?.streak ?? 0}</Text>
              <Text style={styles.streakLabel}>
                day{(progress?.streak ?? 0) === 1 ? '' : 's'}
              </Text>
              {dailyDoneToday && (
                <View style={styles.doneDot} />
              )}
            </View>
          </Pressable>
        </Link>

        {/* Practice list */}
        <Text style={styles.sectionTitle}>Practice</Text>

        <View style={styles.list}>
          {PUZZLES.map((p) => {
            const record = progress?.completed[p.id];
            return (
              <Link
                key={p.id}
                href={{ pathname: '/game', params: { puzzleId: p.id, mode: 'practice' } }}
                asChild
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowName}>{p.name}</Text>
                    <Text style={styles.rowSub}>
                      {p.size}×{p.size} · {p.checkpoints.length} numbers
                      {p.walls?.length ? ` · ${p.walls.length} walls` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    {record && (
                      <Text style={styles.bestTime}>
                        {formatTime(record.bestTimeSec)}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.diffPill,
                        { borderColor: DIFFICULTY_COLOR[p.difficulty] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffText,
                          { color: DIFFICULTY_COLOR[p.difficulty] },
                        ]}
                      >
                        {p.difficulty}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Drag from 1 to extend the path. Pass over a finished segment to backtrack.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  brand: {
    color: palette.accent,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tagline: {
    color: palette.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dailyKicker: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dailyTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  dailySubtitle: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: palette.accentSoft,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.accentEdge,
    alignItems: 'center',
    minWidth: 64,
  },
  streakValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  doneDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  rowPressed: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  rowLeft: {
    flex: 1,
  },
  rowName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowSub: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bestTime: {
    color: palette.textMuted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    color: palette.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
