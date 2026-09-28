/**
 * Modal shown when the player completes a puzzle. Reports time + moves and
 * offers buttons to play the next puzzle or return home.
 */

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/game/colors';

interface WinModalProps {
  readonly visible: boolean;
  readonly scoreLabel: string;
  readonly timeSec: number;
  readonly moves: number;
  readonly backtracks: number;
  readonly hasNext: boolean;
  readonly onNext: () => void;
  readonly onHome: () => void;
  readonly onReplay: () => void;
  readonly onShare: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WinModal({
  visible,
  scoreLabel,
  timeSec,
  moves,
  backtracks,
  hasNext,
  onNext,
  onHome,
  onReplay,
  onShare,
}: WinModalProps) {
  const flawless = backtracks === 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Puzzle complete</Text>
          <Text style={styles.title}>
            {flawless ? 'Flawless zip.' : 'Nicely zipped.'}
          </Text>
          <Text style={styles.subtitle}>
            {flawless ? 'No backtracks.' : `${backtracks} backtrack${backtracks === 1 ? '' : 's'}.`}
          </Text>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>{formatTime(timeSec)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Moves</Text>
              <Text style={styles.statValue}>{moves}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPrimaryPressed,
              ]}
            >
              <Text style={styles.btnPrimaryText}>Share score</Text>
            </Pressable>
            {hasNext && (
              <Pressable
                onPress={onNext}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  pressed && styles.btnSecondaryPressed,
                ]}
              >
                <Text style={styles.btnSecondaryText}>Next puzzle</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onReplay}
              style={({ pressed }) => [
                styles.btnSecondary,
                pressed && styles.btnSecondaryPressed,
              ]}
            >
              <Text style={styles.btnSecondaryText}>Play again</Text>
            </Pressable>
            <Pressable
              onPress={onHome}
              style={({ pressed }) => [
                styles.btnGhost,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.btnGhostText}>Back to home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  kicker: {
    color: palette.success,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  scoreLabel: {
    color: palette.textSubtle,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    backgroundColor: palette.border,
  },
  actions: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: palette.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnPrimaryPressed: {
    opacity: 0.85,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnSecondaryPressed: {
    backgroundColor: palette.accentSoft,
  },
  btnSecondaryText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  btnGhost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnGhostText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
