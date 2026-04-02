import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Linking, Alert, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';

const STATUS_CONFIG = {
  green: {
    color: '#10B981', 
    bgColor: '#D1FAE5',
    ringColor: '#10B98140',
    icon: 'check-circle',
    textColor: '#064E3B',
    label: 'Healthy',
  },
  yellow: {
    color: '#F59E0B', 
    bgColor: 'rgba(251, 191, 36, 0.15)',
    ringColor: '#F59E0B40',
    icon: 'alert-circle',
    textColor: '#92400E',
    label: 'Caution',
  },
  red: {
    color: '#EF4444', 
    bgColor: 'rgba(239, 68, 68, 0.15)',
    ringColor: '#EF444440',
    icon: 'alert-triangle',
    textColor: '#991B1B',
    label: 'Critical',
  },
};

/**
 * StatusShield — The hero widget on the Dashboard.
 * Features a rotating 'alive' gradient and breathing animations.
 */
export default function StatusShield({
  status = 'green',
  lastUpdateTime,
  onNudge,
  profile,
  hideActions = false,
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.green;
  const breathe = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Breathing animation for the aura
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Constant slow rotation for the monitoring ring
    rotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [breathe, rotation]);

  const glowingRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value * 1.1 }],
    opacity: interpolate(breathe.value, [1, 1.08], [0.6, 0.2]),
  }));

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
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
    try {
      const diffMs = Date.now() - new Date(dob).getTime();
      const ageDt = new Date(diffMs);
      return Math.abs(ageDt.getUTCFullYear() - 1970);
    } catch (e) { return null; }
  };
  const calculatedAge = calculateAge(profile?.date_of_birth);

  const formatSyncTime = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/^0/, '');
    
    if (isToday) return time;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${time}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
  };

  return (
    <GlassCard style={styles.card} intensity={80}>
      <View style={styles.profileSection}>
        {/* Alive Avatar Container */}
        <View style={styles.avatarWrapper}>
          {/* Rotating "Alive" Gradient */}
          <Animated.View style={[styles.rotatingRingContainer, rotatingStyle]}>
            <LinearGradient
              colors={[config.color, 'transparent', config.color + '40', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <View style={styles.avatarContainer}>
            <Animated.View
              style={[
                styles.avatarGlowRing,
                { borderColor: config.color },
                glowingRingStyle,
              ]}
            />
            <View style={[styles.avatarBorderRing, { borderColor: config.color }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{getInitials(displayName)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Profile Details Stack */}
        <View style={styles.detailsContainer}>
          <View style={styles.nameRow}>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            </View>
            <View style={[styles.statusBadgePill, { backgroundColor: config.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: config.textColor }]}>{config.label}</Text>
            </View>
          </View>
          
          <Text style={styles.profileAge}>
            {calculatedAge ? `${calculatedAge} yrs · ` : ''}{profile?.gender || 'Unknown'}
          </Text>

          <View style={styles.monitoringInfo}>
            {lastUpdateTime ? (
              <View style={styles.infoRow}>
                <View style={[styles.liveDot, { backgroundColor: config.color }]} />
                <Text style={styles.infoText}>Last Sync · {formatSyncTime(lastUpdateTime)}</Text>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <Feather name="wifi-off" size={10} color={COLORS.textMuted} />
                <Text style={styles.infoText}>Mirror Offline</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Actions Layer ─────────────── */}
      {(status === 'yellow' || status === 'red') && !hideActions && (
        <View style={styles.actionButtons}>
          <AnimatedPressable
            style={[styles.actionButton, styles.callButton]}
            onPress={handleCall}
          >
            <Feather name="phone" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Call {profile?.first_name || ''}</Text>
          </AnimatedPressable>

          {onNudge && (
            <AnimatedPressable
              style={[styles.actionButton, styles.pingButton, { backgroundColor: config.color + '15' }]}
              onPress={onNudge}
            >
              <Feather name="bell" size={18} color={config.color} />
              <Text style={[styles.actionButtonText, { color: config.color }]}>Send Nudge</Text>
            </AnimatedPressable>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const AVATAR_SIZE = 76;

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  avatarWrapper: {
    width: AVATAR_SIZE + 20,
    height: AVATAR_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingRingContainer: {
    position: 'absolute',
    width: AVATAR_SIZE + 20,
    height: AVATAR_SIZE + 20,
    borderRadius: (AVATAR_SIZE + 20) / 2,
    overflow: 'hidden',
    opacity: 0.4,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  avatarGlowRing: {
    position: 'absolute',
    width: AVATAR_SIZE + 12,
    height: AVATAR_SIZE + 12,
    borderRadius: (AVATAR_SIZE + 12) / 2,
    borderWidth: 2,
  },
  avatarBorderRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
    ...SHADOWS.card,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary500,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  profileAge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  monitoringInfo: {
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADII.full,
  },
  callButton: {
    backgroundColor: COLORS.red,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
