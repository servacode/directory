export const palette = Object.freeze({
  teal700: '#0F766E', teal100: '#CCFBF1', teal800: '#115E59',
  blue600: '#2563EB', green600: '#16A34A', cyan600: '#0891B2',
  amber600: '#D97706', red600: '#DC2626', slate950: '#0F172A',
  slate600: '#475569', slate500: '#64748B', slate400: '#94A3B8',
  slate200: '#E2E8F0', slate100: '#F1F5F9', slate50: '#F8FAFC', white: '#FFFFFF'
});
export const semanticColors = Object.freeze({
  appBackground: palette.slate50, surface: palette.white, surfaceSecondary: palette.slate100,
  border: palette.slate200, textPrimary: palette.slate950, textSecondary: palette.slate600,
  textMuted: palette.slate500, textDisabled: palette.slate400,
  primary: palette.teal700, primarySoft: palette.teal100, primaryStrong: palette.teal800,
  secondary: palette.blue600, success: palette.green600, duty: palette.cyan600,
  warning: palette.amber600, danger: palette.red600, closed: palette.slate500
});
export const spacing = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });
export const radius = Object.freeze({ sm: 8, md: 12, lg: 16, pill: 999 });
export const typography = Object.freeze({ fontFamilyArabic: 'Tajawal', fontFamilyFallback: 'sans-serif' });
