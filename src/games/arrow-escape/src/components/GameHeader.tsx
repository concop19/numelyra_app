import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '../game/types';
import { theme } from '../theme/theme';
import { DifficultyBadge } from './DifficultyBadge';

type Props = {
  title: string;
  difficulty?: Difficulty;
  arrowsLeft?: number;
  totalArrows?: number;
  showBack?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
};

export function GameHeader({ title, difficulty, arrowsLeft, totalArrows, showBack = true, onBack, onSettings }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
            <Text style={styles.icon}>‹</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {arrowsLeft !== undefined && totalArrows !== undefined && (
          <Text style={styles.arrowCount}>{arrowsLeft} / {totalArrows} arrows left</Text>
        )}
        {difficulty ? (
          <View style={{ marginTop: 6 }}>
            <DifficultyBadge difficulty={difficulty} />
          </View>
        ) : null}
      </View>

      <View style={[styles.side, styles.actions]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings} style={styles.iconButton}>
          <Text style={styles.smallIcon}>⬡</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomColor: theme.colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 110,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 16
  },
  side: {
    alignItems: 'flex-start',
    flex: 1
  },
  center: {
    alignItems: 'center',
    flex: 1.5
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end'
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center'
  },
  arrowCount: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  icon: {
    color: theme.colors.textMuted,
    fontSize: 50,
    fontWeight: '300',
    lineHeight: 50
  },
  smallIcon: {
    color: theme.colors.textMuted,
    fontSize: 36,
    lineHeight: 40
  }
});
