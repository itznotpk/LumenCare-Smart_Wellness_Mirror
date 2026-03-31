import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, FlatList, Linking, Alert, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AlertBanner from '../components/AlertBanner';
import TimelineItem from '../components/TimelineItem';
import RoutineConfig from '../components/RoutineConfig';
import GlassCard from '../components/GlassCard';
import GlassSkeleton from '../components/GlassSkeleton';
import EmptyState from '../components/EmptyState';
import { useToastStore } from '../store/useToastStore';
import { useAlertStore } from '../store/useAlertStore';
import { useProfileStore } from '../store/useProfileStore';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';
import * as Haptics from 'expo-haptics';
import { useActivityFeed } from '../hooks/useActivityFeed';

/**
 * SafetyScreen — Activity timeline and urgent safety overrides.
 */
export default function SafetyScreen() {
  // Activates Supabase Realtime subscription (no-op in demo mode)
  useActivityFeed();

  const activeAlert = useAlertStore((s) => s.activeAlert);
  const activities = useAlertStore((s) => s.activities);
  const routineWindow = useAlertStore((s) => s.routineWindow);
  const dismissAlert = useAlertStore((s) => s.dismissAlert);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const fetchAlertHistory = useAlertStore((s) => s.fetchAlertHistory);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const profile = getActiveProfile();
  const navigation = useNavigation();

  // Fetch alert history on mount
  useEffect(() => {
    if (profile) {
      fetchAlertHistory();
    }
  }, [profile?.id]);

  const handleCallEmergency = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      'Call Emergency?',
      'This will dial emergency services.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:911'),
        },
      ]
    );
  };

  const handleDismiss = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    dismissAlert();
  };

  const [refreshing, setRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const handleEditRoutine = () => {
    showToast('Coming Soon', 'Routine editing available in next update.', 'info');
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([fetchAlerts(), fetchAlertHistory()]);
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary500} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: SPACING.lg }]}>
        <GlassCard intensity={80} style={{ padding: SPACING.xl, alignItems: 'center' }}>
          <Feather name="shield-off" size={48} color={COLORS.primary500} style={{ marginBottom: SPACING.md }} />
          <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm }}>Security Offline</Text>
          <Text style={{ fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg }}>
            Register your first patient to activate safety monitoring and SOS alerts.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.primary500, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADII.full }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Family');
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZES.md }}>Add Patient</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  // Sort activities by time (most recent first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
      }
    >


      {/* Priority Alert (conditional) */}
      <AlertBanner
        alert={activeAlert}
        onCall={handleCallEmergency}
        onDismiss={handleDismiss}
      />

      {/* Activity Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Timeline</Text>
        <GlassCard style={styles.timelineCard}>
          {refreshing ? (
            <View>
              <GlassSkeleton height={70} />
              <GlassSkeleton height={70} />
              <GlassSkeleton height={70} />
            </View>
          ) : sortedActivities.length > 0 ? (
            sortedActivities.map((item, index) => (
              <TimelineItem
                key={item.id}
                item={item}
                isLast={index === sortedActivities.length - 1}
              />
            ))
          ) : (
            <EmptyState
              icon="clock"
              title="No Activity Yet"
              message="When movement is detected by the mirror, timeline events will appear here."
            />
          )}
        </GlassCard>
      </View>

      {/* AI-Learned Routine Config */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI-Learned Routine</Text>
        <RoutineConfig routine={routineWindow} onEdit={handleEditRoutine} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: 110,
    paddingBottom: 100,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  timelineCard: {
    padding: SPACING.xl,
  },
  emptyTimeline: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
