import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useProfileStore } from '../store/useProfileStore';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET } from '../theme';

/**
 * PrivacyControls — Toggle switches for mirror brightness and privacy mode.
 */
export default function PrivacyControls() {
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const togglePrivacyMode = useProfileStore((s) => s.togglePrivacyMode);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  
  const profile = getActiveProfile();
  const [localPrivacy, setLocalPrivacy] = useState(profile.privacy_mode);

  const handleToggle = (val) => {
    setLocalPrivacy(val);
    togglePrivacyMode();
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="shield" size={20} color={COLORS.primary500} />
        <Text style={styles.title}>Mirror Configuration</Text>
      </View>

      {/* Privacy Mode Toggle */}
      <View style={styles.row}>
        <View style={styles.rowContent}>
          <Feather name={localPrivacy ? 'eye-off' : 'video'} size={18} color={localPrivacy ? COLORS.textMuted : COLORS.primary500} />
          <View>
            <Text style={styles.rowLabel}>Camera Privacy Mode</Text>
            <Text style={styles.rowSubtext}>{localPrivacy ? 'Camera Disabled' : 'Camera Active'}</Text>
          </View>
        </View>
        <Switch
          value={localPrivacy}
          onValueChange={handleToggle}
          trackColor={{ false: COLORS.border, true: COLORS.textMuted }}
          thumbColor={COLORS.white}
          ios_backgroundColor={COLORS.border}
          accessibilityLabel="Toggle Privacy Mode"
        />
      </View>

      <View style={styles.divider} />

      {/* Mirror Brightness */}
      <View style={styles.row}>
        <View style={styles.rowContent}>
          <Feather name="sun" size={18} color={COLORS.textSecondary} />
          <View>
            <Text style={styles.rowLabel}>Mirror Brightness</Text>
            <Text style={styles.rowSubtext}>{profile.mirror_brightness}%</Text>
          </View>
        </View>
        <View style={styles.brightnessControls}>
          <Text
            style={styles.brightButton}
            onPress={() =>
              updateProfile(profile.id, {
                mirror_brightness: Math.max(20, profile.mirror_brightness - 10),
              })
            }
            accessibilityLabel="Decrease brightness"
            accessibilityRole="button"
          >
            −
          </Text>
          <View style={styles.brightBar}>
            <View
              style={[styles.brightFill, { width: `${profile.mirror_brightness}%` }]}
            />
          </View>
          <Text
            style={styles.brightButton}
            onPress={() =>
              updateProfile(profile.id, {
                mirror_brightness: Math.min(100, profile.mirror_brightness + 10),
              })
            }
            accessibilityLabel="Increase brightness"
            accessibilityRole="button"
          >
            +
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TAP_TARGET,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  rowLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.lg,
  },
  brightnessControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  brightButton: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary500,
    width: 36,
    height: 36,
    textAlign: 'center',
    lineHeight: 36,
  },
  brightBar: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  brightFill: {
    height: '100%',
    backgroundColor: COLORS.primary500,
    borderRadius: 3,
  },
});
