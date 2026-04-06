/**
 * Centralized Theme — CardioMira Caregiver App (Serenity Edition)
 * Inspired by modern wellness and healthcare intelligence.
 */

import { Platform } from 'react-native';

export const COLORS = {
  // Backgrounds: Organic & Serene
  background: 'transparent', // Root LinearGradient shines through
  card: '#FFFFFF',           // Pure white cards for clarity
  surface: '#F8FAFC',        // Muted surfaces (Slate-50 style)
  tint: '#ECFEFF',           // Wellness tint (Cyan-50)

  // Primary — Calm Daylight Cyan
  primary50: '#ECFEFF',
  primary100: '#CFFAFE',
  primary500: '#0891B2',      // Daylight Cyan
  primary600: '#0E7490',
  primary900: '#164E63',

  // Accent — Empathy Lavender
  accent50: '#F5F3FF',
  accent500: '#8B5CF6',      // Empathy Lavender
  accent600: '#7C3AED',

  // Status — Organic Wellness Palette
  green: '#10B981',          // Emerald Green
  greenLight: '#ECFDF5',
  sage: '#88A096',           // Calming organic sage
  sageMuted: '#E9EFEC',
  yellow: '#F59E0B',         // Amber
  yellowLight: '#FFFBEB',
  red: '#EF4444',            // Rose Red
  redLight: '#FEF2F2',

  // Text: High legibility Slate palette
  textPrimary: '#0F172A',    // Slate-900
  textSecondary: '#475569',  // Slate-600
  textMuted: '#94A3B8',      // Slate-400
  white: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',         // Slate-200
  divider: '#F1F5F9',        // Slate-100

  // Shadows
  shadow: '#64748B',         // Slate-500 tint for shadows
};

export const FONTS = {
  // Use 'serif' system fallback or custom if loaded in App.js
  heading: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
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
  vital: 52,   // Slightly larger for emphasis
  hero: 56,
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
  lg: 20,      // More organic rounding
  xl: 28,      // Extra soft corners
  full: 9999,
};

export const SHADOWS = {
  // Classic Soft
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  // Soft UI / Neumorphic inspired
  soft: {
    shadowColor: COLORS.primary500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  // Deep/Large
  cardLarge: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
  },
};

export const ANIMATIONS = {
  spring: {
    damping: 15,
    stiffness: 150,
  },
  breathing: {
    duration: 3000,
    scaleMin: 0.98,
    scaleMax: 1.02,
  },
};

// Minimum 44x44 tap target per accessibility spec
export const MIN_TAP_TARGET = 44;
