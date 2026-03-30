import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET } from '../theme';

/**
 * MetricToggle — Segmented control to switch between HR | HRV | RR
 *
 * @param {string} selected - 'hr' | 'hrv' | 'rr'
 * @param {Function} onSelect - callback with selected key
 */
const SEGMENTS = [
  { key: 'hr', label: 'HR' },
  { key: 'sdnn', label: 'SDNN' },
  { key: 'rmssd', label: 'RMSSD' },
  { key: 'rr', label: 'RR' },
];

export default function MetricToggle({ selected, onSelect }) {
  return (
    <GlassCard style={styles.container} intensity={40}>
      <View style={styles.row}>
        {SEGMENTS.map((seg) => {
          const isActive = selected === seg.key;
          return (
            <AnimatedPressable
              key={seg.key}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => onSelect(seg.key)}
              accessibilityLabel={`Show ${seg.label} data`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {seg.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.full,
    padding: 3,
  },
  row: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADII.full,
    minHeight: MIN_TAP_TARGET,
  },
  segmentActive: {
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: COLORS.primary500,
    fontWeight: '700',
  },
});
