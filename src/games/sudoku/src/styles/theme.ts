export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    textClue: string;
    textUser: string;
    border: string;
    gridMajorBorder: string;
    borderActive: string;
    cellBg: string;
    cellBgSelected: string;
    cellBgHighlight: string;
    cellBgMatch: string;
    cellBgError: string;
    textError: string;
    accent: string;
    accentSecondary: string;
    buttonBg: string;
    buttonText: string;
    buttonActiveBg: string;
    shadow: string;
  };
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F8FAFC', // slate-50
    card: '#FFFFFF',
    text: '#0F172A', // slate-900
    textSecondary: '#64748B', // slate-500
    textClue: '#1E293B', // slate-800
    textUser: '#3B82F6', // blue-500
    border: '#E2E8F0', // slate-200
    gridMajorBorder: '#475569', // slate-600
    borderActive: '#6366F1', // indigo-500
    cellBg: '#FFFFFF',
    cellBgSelected: '#C7D2FE', // indigo-200 (intense selected cell)
    cellBgHighlight: '#EEF2FF', // indigo-50 (subtle row/col/box highlight)
    cellBgMatch: '#E0E7FF', // indigo-100 (matching numbers highlight)
    cellBgError: '#FEE2E2', // red-100
    textError: '#EF4444', // red-500
    accent: '#6366F1', // indigo-500
    accentSecondary: '#818CF8', // indigo-400
    buttonBg: '#F1F5F9', // slate-100
    buttonText: '#475569', // slate-600
    buttonActiveBg: '#E2E8F0', // slate-200
    shadow: 'rgba(15, 23, 42, 0.08)',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#0F172A', // slate-900
    card: '#1E293B', // slate-800
    text: '#F8FAFC', // slate-50
    textSecondary: '#94A3B8', // slate-400
    textClue: '#FFFFFF',
    textUser: '#60A5FA', // blue-400
    border: '#334155', // slate-700
    gridMajorBorder: '#94A3B8', // slate-400
    borderActive: '#818CF8', // indigo-400
    cellBg: '#1E293B',
    cellBgSelected: '#312E81', // indigo-900 (deep selected background)
    cellBgHighlight: '#1E2544', // slate/indigo mixture (subtle row/col/box highlight)
    cellBgMatch: '#3730A3', // indigo-800 (matching numbers highlight)
    cellBgError: '#7F1D1D', // red-950
    textError: '#F87171', // red-400
    accent: '#818CF8', // indigo-400
    accentSecondary: '#6366F1', // indigo-500
    buttonBg: '#334155', // slate-700
    buttonText: '#E2E8F0', // slate-200
    buttonActiveBg: '#475569', // slate-600
    shadow: 'rgba(0, 0, 0, 0.25)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  boardClue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  boardUser: {
    fontSize: 22,
    fontWeight: '400' as const,
  },
  boardNote: {
    fontSize: 9,
    fontWeight: '400' as const,
  },
};
