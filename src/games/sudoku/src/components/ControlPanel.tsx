import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, spacing, typography } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_PANEL_WIDTH = Math.min(SCREEN_WIDTH - spacing.md * 2, 420);
// 5 buttons per row with spacing
const BUTTON_WIDTH = Math.floor((MAX_PANEL_WIDTH - spacing.sm * 4) / 5);
const BUTTON_HEIGHT = Math.floor(BUTTON_WIDTH * 0.95);

interface ControlPanelProps {
  theme: Theme;
  onNumberPress: (num: number) => void;
  onUndo: () => void;
  onErase: () => void;
  notesMode: boolean;
  onToggleNotesMode: () => void;
  canUndo: boolean;
  numberCounts: Record<number, number>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  theme,
  onNumberPress,
  onUndo,
  onErase,
  notesMode,
  onToggleNotesMode,
  canUndo,
  numberCounts,
}) => {
  const row1 = [1, 2, 3, 4, 5];
  const row2 = [6, 7, 8, 9];

  const actionButtons = [
    {
      id: 'undo',
      label: 'Undo',
      icon: 'arrow-undo-outline' as const,
      onPress: onUndo,
      disabled: !canUndo,
    },
    {
      id: 'erase',
      label: 'Erase',
      icon: 'trash-outline' as const,
      onPress: onErase,
      disabled: false,
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: notesMode ? ('pencil' as const) : ('pencil-outline' as const),
      onPress: onToggleNotesMode,
      disabled: false,
      badge: notesMode ? 'ON' : 'OFF',
    },
  ];

  const renderNumberButton = (num: number) => {
    const isCompleted = numberCounts[num] >= 9;

    return (
      <TouchableOpacity
        key={num}
        onPress={() => onNumberPress(num)}
        style={[
          styles.numberButton,
          {
            width: BUTTON_WIDTH,
            height: BUTTON_HEIGHT,
            backgroundColor: theme.colors.buttonBg,
            borderColor: theme.colors.border,
            opacity: isCompleted ? 0.45 : 1,
          },
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.numberText,
            {
              color: theme.colors.accent,
              fontWeight: '700',
            },
          ]}
        >
          {num}
        </Text>
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={theme.colors.accentSecondary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 2-Row Number Pad placed higher up directly below board */}
      <View style={[styles.numberPadContainer, { width: MAX_PANEL_WIDTH }]}>
        <View style={styles.numberRow}>
          {row1.map(renderNumberButton)}
        </View>
        <View style={styles.numberRow}>
          {row2.map(renderNumberButton)}
          <TouchableOpacity
            onPress={onErase}
            style={[
              styles.numberButton,
              styles.eraseShortcutButton,
              {
                width: BUTTON_WIDTH,
                height: BUTTON_HEIGHT,
                backgroundColor: theme.colors.buttonBg,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="backspace-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.eraseShortcutText, { color: theme.colors.textSecondary }]}>Del</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={[styles.actionsRow, { width: MAX_PANEL_WIDTH }]}>
        {actionButtons.map((btn) => {
          const isDisabled = btn.disabled;
          const isActive = btn.id === 'notes' && notesMode;

          return (
            <TouchableOpacity
              key={btn.id}
              onPress={btn.onPress}
              disabled={isDisabled}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isActive
                    ? theme.colors.accent
                    : theme.colors.buttonBg,
                  opacity: isDisabled ? 0.4 : 1,
                },
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={btn.icon}
                  size={18}
                  color={isActive ? '#FFFFFF' : theme.colors.text}
                />
                {btn.badge && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isActive
                          ? theme.colors.accentSecondary
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    <Text style={styles.badgeText}>{btn.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  typography.caption,
                  {
                    color: isActive ? '#FFFFFF' : theme.colors.textSecondary,
                    marginTop: spacing.xs - 2,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  numberPadContainer: {
    marginBottom: spacing.md,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  numberButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  numberText: {
    fontSize: 24,
  },
  completedBadge: {
    position: 'absolute',
    top: 3,
    right: 4,
  },
  eraseShortcutButton: {
    flexDirection: 'column',
    gap: 1,
  },
  eraseShortcutText: {
    fontSize: 9,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 11,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -22,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },
});
