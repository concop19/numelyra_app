/**
 * HUD — top status bar above the grid: progress, timer, next checkpoint,
 * and a row of action buttons (undo / hint / reset).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../../game/colors';
import type { GameStats } from '../../game/types';

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
        <Stat label="Mục tiêu" value={stats.nextCheckpoint?.toString() ?? 'Hoàn thành'} highlight />
        <Stat label="Số ô" value={`${stats.visited}/${stats.total}`} />
        <Stat label="Thời gian" value={formatTime(stats.elapsedSec)} />
        <Stat label="Lùi bước" value={stats.backtracks.toString()} />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${progressPct}%` }]}
        />
      </View>

      <View style={styles.actionRow}>
        <ActionButton label="↶ Đi lại" onPress={onUndo} disabled={disabled} />
        <ActionButton label="💡 Gợi ý" onPress={onHint} disabled={disabled} />
        <ActionButton
          label="↻ Làm mới"
          onPress={onReset}
          disabled={disabled}
          tone="danger"
        />
      </View>
    </View>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statHighlight]}>{value}</Text>
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
    gap: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statHighlight: {
    color: '#FFB800',
    fontWeight: '900',
  },
  progressTrack: {
    height: 5,
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
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  actionBtnPressed: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
