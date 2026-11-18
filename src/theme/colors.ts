import { palette, status } from './palette';

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  tabIconActive: string;
  tabIconInactive: string;
};

export const lightColors: ColorTokens = {
  background: '#F6FAFF',
  surface: palette.white,
  surfaceAlt: palette.paleBlue,
  border: palette.softBlue,
  text: palette.deepBlue,
  textMuted: '#3E5674',
  primary: palette.darkBlue,
  onPrimary: palette.white,
  accent: palette.vibrantBlue,
  success: status.successLight,
  warning: status.warningLight,
  danger: status.dangerLight,
  tabBar: palette.white,
  tabIconActive: palette.darkBlue,
  tabIconInactive: '#7A8DA6',
};

export const darkColors: ColorTokens = {
  background: palette.deepBlue,
  surface: '#0A2242',
  surfaceAlt: '#0E2D57',
  border: '#1A3E6E',
  text: palette.paleBlue,
  textMuted: palette.softBlue,
  primary: palette.vibrantBlue,
  onPrimary: palette.deepBlue,
  accent: palette.softBlue,
  success: status.successDark,
  warning: status.warningDark,
  danger: status.dangerDark,
  tabBar: '#061A35',
  tabIconActive: palette.vibrantBlue,
  tabIconInactive: '#7F9BC0',
};
