import { useColorScheme } from 'react-native';

const aionBlue = '#3B82F6';
const aionBlueDark = '#2563EB';
const aionBlueLight = '#93C5FD';
const aionCyan = '#06B6D4';
const aionGreen = '#22C55E';
const aionRed = '#EF4444';
const aionYellow = '#EAB308';
const aionPurple = '#A855F7';

const lightColors = {
  primary: aionBlue,
  primaryDark: aionBlueDark,
  primaryLight: aionBlueLight,
  accent: aionCyan,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  success: aionGreen,
  warning: aionYellow,
  error: aionRed,
  info: aionBlue,
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: aionBlue,
  tabBarInactive: '#94A3B8',
  headerBg: '#FFFFFF',
  headerBorder: '#E2E8F0',
  shadow: 'rgba(59, 130, 246, 0.1)',
  overlay: 'rgba(15, 23, 42, 0.5)',
  skeleton: '#F1F5F9',
  icon: aionBlue,
  iconSecondary: '#475569',
};

const darkColors = {
  primary: aionBlue,
  primaryDark: aionBlueDark,
  primaryLight: '#1E3A5F',
  accent: aionCyan,
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273548',
  card: '#1E293B',
  cardBorder: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  inputBg: '#1E293B',
  inputBorder: '#334155',
  success: aionGreen,
  warning: aionYellow,
  error: aionRed,
  info: aionBlue,
  tabBar: '#1E293B',
  tabBarBorder: '#334155',
  tabBarActive: aionBlue,
  tabBarInactive: '#64748B',
  headerBg: '#1E293B',
  headerBorder: '#334155',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#273548',
  icon: aionBlue,
  iconSecondary: '#94A3B8',
};

export const lightTheme = {
  colors: lightColors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 34,
  },
};

export const darkTheme = {
  colors: darkColors,
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  fontSize: lightTheme.fontSize,
};

export type Theme = typeof lightTheme;
export type ThemeColors = typeof lightColors;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
