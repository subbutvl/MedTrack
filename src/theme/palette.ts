/**
 * "Soft Medical Professional Blue" palette, the brand source of truth.
 * Do not use these directly in components. Use the semantic tokens in `colors.ts`.
 */
export const palette = {
  deepBlue: '#021229',
  darkBlue: '#05477F',
  vibrantBlue: '#4196F7',
  softBlue: '#BAD8FC',
  paleBlue: '#DFEDFE',
  white: '#FFFFFF',
} as const;

/** Semantic status hues (not part of the brand palette), tuned for both themes. */
export const status = {
  successLight: '#1B7F57',
  successDark: '#5FD3A2',
  warningLight: '#9A5B00',
  warningDark: '#F5B85C',
  dangerLight: '#B3261E',
  dangerDark: '#F2827B',
} as const;
