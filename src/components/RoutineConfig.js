import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

/**
 * RoutineConfig — Shows an AI-learned routine window with confidence indicator.
 * Dynamically rendered from the learned_routines Supabase table.
 */
export default function RoutineConfig({ 
  title = 'Morning Wake Window',
  description = 'The mirror expects morning activity between:',
  icon = 'sun',
  start = '07:30',
  end = '08:30',
  period = 'AM',
  confidence,
  onEdit 
}) {
  // Confidence label and color
  const getConfidenceInfo = (c) => {
    if (c == null) return null;
    if (c >= 0.75) return { label: 'High Confidence', color: '#10B981', icon: 'check-circle' };
    if (c >= 0.4) return { label: 'Learning', color: '#F59E0B', icon: 'loader' };
    return { label: 'Gathering Data', color: '#94A3B8', icon: 'radio' };
  };

  const confidenceInfo = getConfidenceInfo(confidence);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: icon === 'moon' ? '#EEF2FF' : '#FEF3C7' }]}>
            <Feather name={icon} size={16} color={icon === 'moon' ? '#4338CA' : '#D97706'} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <AnimatedPressable onPress={onEdit} hitSlop={10} accessibilityRole="button">
          <Feather name="edit-2" size={16} color={COLORS.primary500} />
        </AnimatedPressable>
      </View>

      <Text style={styles.description}>
        {description}
      </Text>

      <View style={styles.timeRow}>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{start} {period}</Text>
        </View>
        <Feather name="arrow-right" size={16} color={COLORS.textMuted} />
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{end} {period}</Text>
        </View>
      </View>

      {/* Confidence Indicator */}
      {confidenceInfo && (
        <View style={styles.confidenceRow}>
          <View style={styles.confidenceBarBg}>
            <View style={[styles.confidenceBarFill, { width: `${Math.round(confidence * 100)}%`, backgroundColor: confidenceInfo.color }]} />
          </View>
          <Text style={[styles.confidenceLabel, { color: confidenceInfo.color }]}>{confidenceInfo.label}</Text>
        </View>
      )}
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
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Confidence indicator
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  confidenceBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: 4,
    borderRadius: 2,
  },
  confidenceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
