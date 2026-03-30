import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from './GlassCard';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

/**
 * VitalCard — Displays a single vital metric with plain-English translation.
 *
 * @param {string} label - e.g. "Heart Rate"
 * @param {string|number} value - e.g. 72
 * @param {string} unit - e.g. "bpm"
 * @param {string} translation - e.g. "Normal resting"
 * @param {string} icon - emoji or icon string
 * @param {string} status - 'green' | 'yellow' | 'red'
 */
export default function VitalCard({ label, value, unit, translation, icon, status = 'green' }) {
  const statusColor =
    status === 'red' ? COLORS.red : status === 'yellow' ? COLORS.yellow : COLORS.green;

  // Dark accessible text color for each status badge
  const statusTextColor =
    status === 'red' ? '#991B1B' : status === 'yellow' ? '#92400E' : '#065F46';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={[styles.translationBadge, { backgroundColor: statusColor + '18' }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.translationText, { color: statusTextColor }]}>{translation}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    flexBasis: '47%',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: FONT_SIZES.vital,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 54,
  },
  unit: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  translationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  translationText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
});
