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
  /** Pale fills behind success, warning, danger and accent text (pills, chips). */
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  accentSoft: string;
  tabBar: string;
  tabIconActive: string;
  tabIconInactive: string;
};

export const lightColors: ColorTokens = {
  background: '#F5F7FE',
  surface: palette.white,
  surfaceAlt: '#EEF1FD',
  border: '#DFE4F3',
  text: palette.neutral,
  textMuted: '#64748B',
  primary: palette.primary,
  onPrimary: palette.white,
  accent: palette.tertiary,
  success: status.successLight,
  warning: status.warningLight,
  danger: status.dangerLight,
  successSoft: '#E6F6EF',
  warningSoft: '#FEF3E2',
  dangerSoft: '#FDECEC',
  accentSoft: '#E5EDFE',
  tabBar: palette.white,
  tabIconActive: palette.tertiary,
  tabIconInactive: '#94A3B8',
};

export const darkColors: ColorTokens = {
  background: '#0B1220',
  surface: '#121B2E',
  surfaceAlt: '#1A2540',
  border: '#26324D',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  primary: '#9DBBFF',
  onPrimary: palette.primary,
  accent: '#60A5FA',
  success: status.successDark,
  warning: status.warningDark,
  danger: status.dangerDark,
  successSoft: '#0E2E24',
  warningSoft: '#33260F',
  dangerSoft: '#3A1618',
  accentSoft: '#172A4F',
  tabBar: '#0E1729',
  tabIconActive: '#60A5FA',
  tabIconInactive: '#64748B',
};
