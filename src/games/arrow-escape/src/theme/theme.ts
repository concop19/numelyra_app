import type { Difficulty } from '../game/types';

export const theme = {
  colors: {
    bgPrimary: '#F6F1E8',
    bgSecondary: '#EDE5D8',
    bgBubble: '#EADFCB',
    borderSoft: '#E3D7C3',
    arrowStroke: '#6A4428',
    textPrimary: '#A8642E',
    textMuted: '#806F5D',
    lifeRed: '#E53935',
    lifeMuted: '#D4C5B0',
    activePathRed: '#E53935',
    white: '#FFFFFF',
    black: '#1A1A1A',

    // Difficulty palette
    difficultyEasy: '#43A047',
    difficultyMedium: '#FB8C00',
    difficultyHard: '#E53935',
    difficultyExpert: '#8E24AA',


    // Level select
    levelLocked: '#C8BDAE',
    levelUnlocked: '#6A4428',
    levelCompleted: '#43A047',

    // Accents
    accentGold: '#FFD54F',
    accentGlow: 'rgba(255, 213, 79, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.45)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    sm: 8,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 50
  },
  typography: {
    title: 30,
    subtitle: 24,
    body: 18,
    small: 14,
    tiny: 11
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    },
    md: {
      shadowColor: '#6A4428',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4
    },
    lg: {
      shadowColor: '#6A4428',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8
    }
  }
} as const;

export const difficultyColor: Record<Difficulty, string> = {
  Easy: theme.colors.difficultyEasy,
  Medium: theme.colors.difficultyMedium,
  Hard: theme.colors.difficultyHard,
  Expert: theme.colors.difficultyExpert,
};
