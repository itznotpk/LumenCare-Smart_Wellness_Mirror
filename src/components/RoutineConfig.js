import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET } from '../theme';

/**
 * RoutineConfig — Shows AI-learned routine window.
 */
export default function RoutineConfig({ routine = { start: '07:30', end: '08:30' }, onEdit }) {
  if (!routine) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="moon" size={18} color={COLORS.primary500} />
          <Text style={styles.title}>Morning Wake Window</Text>
        </View>
        <AnimatedPressable onPress={onEdit} hitSlop={10} accessibilityRole="button">
          <Feather name="edit-2" size={16} color={COLORS.primary500} />
        </AnimatedPressable>
      </View>

      <Text style={styles.description}>
        The mirror expects morning activity between:
      </Text>

      <View style={styles.timeRow}>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{routine.start} AM</Text>
        </View>
        <Feather name="arrow-right" size={16} color={COLORS.textMuted} />
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{routine.end} AM</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  timeBadge: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.md,
  },
  timeText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primary900,
  },
});
