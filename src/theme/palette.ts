/**
 * The MedTrack design system palette, the brand source of truth.
 * Do not use these directly in components. Use the semantic tokens in `colors.ts`.
 */
export const palette = {
  /** Primary: deep navy for headings, filled buttons and the active state. */
  primary: '#0A2540',
  /** Secondary: green for taken, completed and success. */
  secondary: '#059669',
  /** Tertiary: bright blue for highlights, chips and progress. */
  tertiary: '#2563EB',
  /** Neutral: near-black slate for body text. */
  neutral: '#0F172A',
  white: '#FFFFFF',
} as const;

/** Semantic status hues, tuned for both themes. */
export const status = {
  successLight: '#059669',
  successDark: '#34D399',
  warningLight: '#D97706',
  warningDark: '#FBBF24',
  dangerLight: '#DC2626',
  dangerDark: '#F87171',
} as const;
