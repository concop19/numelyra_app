import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, spacing, typography } from '../styles/theme';
import { Difficulty } from '../utils/sudokuLogic';

interface HeaderProps {
  theme: Theme;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  seconds: number;
  errorsCount: number;
  isPaused: boolean;
  onTogglePause: () => void;
  currentDifficulty: Difficulty;
  onChangeDifficulty: (difficulty: Difficulty) => void;
  onNewGame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  isDarkMode,
  onToggleTheme,
  seconds,
  errorsCount,
  isPaused,
  onTogglePause,
  currentDifficulty,
  onChangeDifficulty,
  onNewGame,
}) => {
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const difficulties: { key: Difficulty; label: string }[] = [
    { key: 'easy', label: 'Easy' },
    { key: 'medium', label: 'Medium' },
    { key: 'hard', label: 'Hard' },
    { key: 'expert', label: 'Expert' },
  ];

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      {/* Top Section */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.title, typography.h1, { color: theme.colors.text }]}>
            SUDOKU
          </Text>
          <Text style={[styles.subtitle, typography.caption, { color: theme.colors.textSecondary }]}>
            Premium Edition
          </Text>
        </View>

        {/* Timer, Error Counter and Controls */}
        <View style={styles.rightControls}>
          {/* Always Visible Error Counter */}
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.cellBgError }]}>
            <Ionicons name="alert-circle" size={15} color={theme.colors.textError} style={{ marginRight: 4 }} />
            <Text style={[styles.errorText, typography.caption, { color: theme.colors.textError, fontWeight: '700' }]}>
              {errorsCount}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onTogglePause}
            style={[styles.timerContainer, { backgroundColor: theme.colors.buttonBg }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={16}
              color={theme.colors.accent}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.timerText, typography.bodySemibold, { color: theme.colors.text }]}>
              {formatTime(seconds)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggleTheme}
            style={[styles.iconButton, { backgroundColor: theme.colors.buttonBg }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Difficulty Selector Row */}
      <View style={styles.difficultyRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {difficulties.map((diff) => {
            const isActive = currentDifficulty === diff.key;
            return (
              <TouchableOpacity
                key={diff.key}
                onPress={() => onChangeDifficulty(diff.key)}
                style={[
                  styles.difficultyPill,
                  {
                    backgroundColor: isActive
                      ? theme.colors.accent
                      : theme.colors.buttonBg,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.difficultyLabel,
                    typography.caption,
                    {
                      color: isActive
                        ? '#FFFFFF'
                        : theme.colors.buttonText,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {diff.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={onNewGame}
          style={[styles.newGameButton, { backgroundColor: theme.colors.accent + '15' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={14} color={theme.colors.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.newGameText, typography.caption, { color: theme.colors.accent, fontWeight: '700' }]}>
            Restart
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: -2,
    letterSpacing: 1.5,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm - 2,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  errorText: {
    fontSize: 13,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  timerText: {
    fontFamily: 'Courier', // Monospace font for stable timer width
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrollContent: {
    paddingRight: spacing.md,
  },
  difficultyPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: 16,
    marginRight: spacing.xs,
  },
  difficultyLabel: {
    fontSize: 12,
  },
  newGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: 16,
  },
  newGameText: {
    fontSize: 12,
  },
});
