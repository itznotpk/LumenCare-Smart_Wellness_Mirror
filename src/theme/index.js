/**
 * Centralized Theme — Smart Wellness Mirror Caregiver App
 * Use alongside NativeWind; these tokens are also available for StyleSheet fallback.
 */

export const COLORS = {
  // Backgrounds: Clean iOS style
  background: 'transparent', // Let's the root LinearGradient shine through
  card: '#FFFFFF',       // Pure white cards

  // Primary – Futuristic iOS Blues
  primary50: '#E5F0FF',
  primary100: '#CCE0FF',
  primary500: '#007AFF', // Classic iOS System Blue
  primary600: '#0056B3',
  primary900: '#002E66',

  // Status — Vibrant iOS Colors
  green: '#34C759',      // iOS Success Green
  greenLight: '#E8F8EE',
  yellow: '#FF9500',     // iOS Warning Orange
  yellowLight: '#FFF4E5',
  red: '#FF3B30',        // iOS Destructive Red
  redLight: '#FFEBEA',

  // Text
  textPrimary: '#1C1C1E', // standard iOS dark text
  textSecondary: '#8E8E93', // standard iOS gray
  textMuted: '#AEAEB2',
  white: '#FFFFFF',

  // Borders & Dividers
  border: '#E5E5EA',
  divider: '#F2F2F7',

  // Shadows
  shadow: '#8E8E93',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  vital: 48,   // 30% larger than old 36 — vital metric numbers
  hero: 52,
};

export const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardLarge: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
};

// Minimum 44x44 tap target per accessibility spec
export const MIN_TAP_TARGET = 44;
