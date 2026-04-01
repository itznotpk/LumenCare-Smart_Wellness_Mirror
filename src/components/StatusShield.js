import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Linking, Alert, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';

const STATUS_CONFIG = {
  green: {
    color: '#10B981', // iOS Success Green
    bgColor: '#D1FAE5',
    ringColor: '#10B98140',
    icon: 'check-circle',
    textColor: '#064E3B', // Darker green for contrast
  },
  yellow: {
    color: '#FF9500', // iOS Warning Orange
    bgColor: 'rgba(255, 244, 229, 0.6)',
    ringColor: '#FF950040',
    icon: 'alert-circle',
    textColor: '#7A4700', // Darker orange for contrast
  },
  red: {
    color: '#FF3B30', // iOS Destructive Red
    bgColor: 'rgba(255, 235, 234, 0.6)',
    ringColor: '#FF3B3040',
    icon: 'alert-triangle',
    textColor: '#7A130D', // Darker red for contrast
  },
};

/**
 * StatusShield — The hero widget on the Dashboard (iOS-oriented design).
 */
export default function StatusShield({
  status = 'green',
  message,
  onNudge,
  profile,
  hideActions = false,
}) {
  const config = STATUS_CONFIG[status];
  const breathe = useSharedValue(1);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowingRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value * 1.08 }],
    opacity: 1.5 - breathe.value,
  }));

  const handleCall = () => {
    Alert.alert(
      `Call ${displayName}?`,
      `This will open your phone dialer to call ${displayName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', style: 'destructive', onPress: () => Linking.openURL('tel:') },
      ]
    );
  };

  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
    : (profile?.name || 'Unknown');

  const getInitials = (name) => name?.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2) || '?';

  const calculateAge = (dob) => {
    if (!dob) return profile?.age || null;
    const diffMs = Date.now() - new Date(dob).getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };
  const calculatedAge = calculateAge(profile?.date_of_birth);

  const medicalInfo = profile?.medical_notes 
    ? profile.medical_notes 
    : (profile?.conditions?.length ? profile.conditions.join(', ') : 'No medical notes provided');

  return (
    <GlassCard style={styles.card} intensity={70}>
      {/* ── Top Section: Profile + Details ─────────────── */}
      <View style={styles.profileSection}>
        {/* Avatar with Animated Ring */}
        <View style={styles.avatarContainer}>
          <Animated.View
            style={[
              styles.avatarGlowRing,
              { borderColor: config.ringColor },
              glowingRingStyle,
            ]}
          />
          <View style={[styles.avatarBorderRing, { borderColor: config.color }]}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{getInitials(displayName)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Details Stack */}
        <View style={styles.detailsContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{displayName}</Text>
            {calculatedAge && <Text style={styles.profileAge}>{calculatedAge} yrs</Text>}
          </View>
          
          <Text style={styles.sectionHeader}>BASELINE</Text>
          <Text style={styles.conditionsText} numberOfLines={2}>
            {medicalInfo}
          </Text>
        </View>
      </View>

      {/* ── Middle Section: Status Message ─────────────── */}
      {message ? (
        <View style={[styles.messageBox, { backgroundColor: config.bgColor }]}>
          <Feather name={config.icon} size={20} color={config.color} style={{ marginTop: 2 }} />
          <Text style={[styles.messageText, { color: config.textColor }]} accessibilityRole="text">
            {message}
          </Text>
        </View>
      ) : null}

      {/* ── Bottom Section: Action Buttons ─────────────── */}
      {(status === 'yellow' || status === 'red') && !hideActions && (
        <View style={styles.actionButtons}>
          <AnimatedPressable
            style={[styles.actionButton, styles.callButton]}
            onPress={handleCall}
            accessibilityLabel={`Call ${displayName}`}
          >
            <Feather name="phone" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Call</Text>
          </AnimatedPressable>

          {onNudge && (
            <AnimatedPressable
              style={[styles.actionButton, styles.pingButton, { backgroundColor: config.color + '20' }]}
              onPress={onNudge}
              accessibilityLabel={`Ping ${displayName}'s Mirror`}
            >
              <Feather name="bell" size={18} color={config.color} />
              <Text style={[styles.actionButtonText, { color: config.color }]}>Ping</Text>
            </AnimatedPressable>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const AVATAR_SIZE = 96;

const styles = StyleSheet.create({
  card: {
    padding: SPACING.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  
  // Profile area
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  
  // Avatar & Rings
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarGlowRing: {
    position: 'absolute',
    width: AVATAR_SIZE + 24,
    height: AVATAR_SIZE + 24,
    borderRadius: (AVATAR_SIZE + 24) / 2,
    borderWidth: 3,
  },
  avatarBorderRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary500,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },

  // Details
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000', // stark dark text for iOS feel
    letterSpacing: -0.5,
  },
  profileAge: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  conditionsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Message Box
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: RADII.md,
  },
  messageText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    lineHeight: 22,
  },

  // Actions
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADII.full, // iOS pill-shape buttons
  },
  callButton: {
    backgroundColor: COLORS.red,
  },
  pingButton: {
    // Background set dynamically
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
