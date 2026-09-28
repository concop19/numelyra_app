/**
 * HUD — top status bar above the grid: progress, timer, next checkpoint,
 * and a row of action buttons (undo / hint / reset).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/game/colors';
import type { GameStats } from '@/game/types';

interface HUDProps {
  readonly stats: GameStats;
  readonly disabled?: boolean;
  readonly onUndo: () => void;
  readonly onReset: () => void;
  readonly onHint: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function HUD({ stats, disabled, onUndo, onReset, onHint }: HUDProps) {
  const progressPct = Math.round((stats.visited / stats.total) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Stat label="Next" value={stats.nextCheckpoint?.toString() ?? '—'} />
        <Stat label="Cells" value={`${stats.visited}/${stats.total}`} />
        <Stat label="Time" value={formatTime(stats.elapsedSec)} />
        <Stat label="Backtracks" value={stats.backtracks.toString()} />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${progressPct}%` }]}
        />
      </View>

      <View style={styles.actionRow}>
        <ActionButton label="Undo" onPress={onUndo} disabled={disabled} />
        <ActionButton label="Hint" onPress={onHint} disabled={disabled} />
        <ActionButton
          label="Reset"
          onPress={onReset}
          disabled={disabled}
          tone="danger"
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        pressed && !disabled && styles.actionBtnPressed,
        disabled && styles.actionBtnDisabled,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          tone === 'danger' && { color: palette.danger },
          disabled && { color: palette.textSubtle },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 4,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accent,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  actionBtnPressed: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
