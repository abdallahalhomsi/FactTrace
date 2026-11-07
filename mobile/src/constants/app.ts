export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  navy: string;
  navyCard: string;
  blue: string;
  blueLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  white: string;
  border: string;
  lightButton: string;
  red: string;
  redLight: string;
  green: string;
  orange: string;
  overlay: string;
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FBFCFE',

  navy: '#0D1F33',
  navyCard: '#122B43',

  blue: '#2F6BF2',
  blueLight: '#EAF1FF',

  textPrimary: '#102238',

  // Higher-contrast values from Mazen's accessibility review.
  textSecondary: '#475569',
  textMuted: '#64748B',

  white: '#FFFFFF',

  border: '#D7E0EA',
  lightButton: '#EDF3FA',

  red: '#C62828',
  redLight: '#FDECEC',

  green: '#168653',
  orange: '#C95F10',

  overlay: 'rgba(4, 15, 28, 0.62)',
};

export const DARK_COLORS: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',

  navy: '#0B1220',
  navyCard: '#1E293B',

  blue: '#38BDF8',
  blueLight: '#16334A',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

  white: '#FFFFFF',

  border: '#475569',
  lightButton: '#334155',

  red: '#FCA5A5',
  redLight: '#4C1D24',

  green: '#86EFAC',
  orange: '#FDE047',

  overlay: 'rgba(2, 6, 23, 0.74)',
};

// Kept for non-themed legacy helpers.
// UI screens use the theme context.
export const COLORS = LIGHT_COLORS;

export const SPACING = {
  screenHorizontal: 24,
  section: 28,
  small: 8,
  medium: 16,
  large: 24,
};

export const RADIUS = {
  small: 8,
  medium: 12,
  large: 18,
};