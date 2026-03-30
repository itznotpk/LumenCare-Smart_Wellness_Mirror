import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS, MIN_TAP_TARGET } from '../theme';

/**
 * AlertBanner — Conditionally rendered red emergency card.
 *
 * @param {Object} alert - { alert_type, message }
 * @param {Function} onCall - "Call Emergency" handler
 * @param {Function} onDismiss - Dismiss handler
 */
export default function AlertBanner({ alert, onCall, onDismiss }) {
  if (!alert || alert.alert_status !== 'active') return null;

  const isfall = alert.alert_type === 'fall';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="alert-triangle" size={24} color={COLORS.white} />
        <Text style={styles.title}>
          {isfall ? '⚠️ Fall Detected' : '⚠️ Abnormal Vitals'}
        </Text>
      </View>
      <Text style={styles.message}>{alert.message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={onCall}
          accessibilityLabel="Call Emergency Services"
          accessibilityRole="button"
        >
          <Feather name="phone-call" size={20} color={COLORS.red} />
          <Text style={styles.callText}>Call Emergency</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel="Dismiss alert"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.red,
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.cardLarge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.white,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    minHeight: MIN_TAP_TARGET,
  },
  callText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.red,
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
  },
  dismissText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
  },
});
