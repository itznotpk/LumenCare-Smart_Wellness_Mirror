import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import TimelineItem from '../components/TimelineItem';
import RoutineConfig from '../components/RoutineConfig';
import GlassCard from '../components/GlassCard';
import GlassSkeleton from '../components/GlassSkeleton';
import EmptyState from '../components/EmptyState';
import { useToastStore } from '../store/useToastStore';
import { useAlertStore } from '../store/useAlertStore';
import { useProfileStore } from '../store/useProfileStore';
import PrivacyControls from '../components/PrivacyControls';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';
import * as Haptics from 'expo-haptics';
import { useActivityFeed } from '../hooks/useActivityFeed';

/**
 * SafetyScreen — Activity timeline and urgent safety overrides.
 */
export default function SafetyScreen() {
  // Activates Supabase Realtime subscription
  useActivityFeed();

  const activities = useAlertStore((s) => s.activities);
  const learnedRoutines = useAlertStore((s) => s.learnedRoutines);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const fetchActivityEvents = useAlertStore((s) => s.fetchActivityEvents);
  const fetchLearnedRoutines = useAlertStore((s) => s.fetchLearnedRoutines);
  const updateLearnedRoutine = useAlertStore((s) => s.updateLearnedRoutine);
  
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const profile = getActiveProfile();
  const navigation = useNavigation();

  // Modal State for Routine Editing
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editPeriod, setEditPeriod] = useState('AM');

  // Fetch activity events and learned routines on mount
  useEffect(() => {
    if (profile) {
      fetchActivityEvents();
      fetchLearnedRoutines();
    }
  }, [profile?.id]);

  const [refreshing, setRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const handleEditRoutine = (routine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingRoutine(routine);
    setEditStartTime(routine.start);
    setEditEndTime(routine.end);
    setEditPeriod(routine.period);
    setEditModalVisible(true);
  };

  const handleSaveRoutine = async () => {
    if (!editStartTime || !editEndTime) {
      showToast('Error', 'Please fill in both start and end times.', 'error');
      return;
    }

    setEditModalVisible(false);
    
    const success = await updateLearnedRoutine(
      editingRoutine.id,
      editStartTime,
      editEndTime,
      editPeriod
    );

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Success', 'Routine updated successfully.', 'success');
    } else {
      showToast('Error', 'Failed to update routine.', 'error');
    }
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([fetchAlerts(), fetchActivityEvents(), fetchLearnedRoutines()]);
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
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
        }
      >
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
                message="Events will appear here as they are detected."
              />
            )}
          </GlassCard>
        </View>

        {/* Daily Rhythms — AI-Learned Behavioral Routines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Rhythms</Text>
          {refreshing ? (
            <View>
              <GlassSkeleton height={130} />
              <View style={{ height: SPACING.md }} />
              <GlassSkeleton height={130} />
            </View>
          ) : learnedRoutines.length > 0 ? (
            learnedRoutines.map((routine, index) => (
              <View key={routine.id} style={index > 0 ? { marginTop: SPACING.md } : undefined}>
                <RoutineConfig
                  title={routine.title}
                  description={routine.description}
                  icon={routine.icon}
                  start={routine.start}
                  end={routine.end}
                  period={routine.period}
                  confidence={routine.confidence}
                  onEdit={() => handleEditRoutine(routine)}
                />
              </View>
            ))
          ) : (
            <EmptyState
              icon="cpu"
              title="Learning in Progress"
              message="Analyzing scan patterns. Check back soon."
            />
          )}
        </View>

        {/* Hardware Controls */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Hardware Controls</Text>
          <PrivacyControls />
        </View>
      </ScrollView>

      {/* Edit Routine Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} intensity={100}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Routine</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{editingRoutine?.title}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={editStartTime}
                onChangeText={setEditStartTime}
                placeholder="07:30"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={editEndTime}
                onChangeText={setEditEndTime}
                placeholder="08:30"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Period</Text>
              <View style={styles.periodRow}>
                {['AM', 'PM'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodButton, editPeriod === p && styles.periodButtonActive]}
                    onPress={() => setEditPeriod(p)}
                  >
                    <Text style={[styles.periodButtonText, editPeriod === p && styles.periodButtonTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveRoutine}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </View>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  timelineCard: {
    padding: SPACING.xl,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    padding: SPACING.xl,
    borderRadius: RADII.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: SPACING.md,
    borderRadius: RADII.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary900,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  periodRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  periodButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary500,
    borderColor: COLORS.primary500,
  },
  periodButtonText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  periodButtonTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.primary500,
    padding: SPACING.lg,
    borderRadius: RADII.full,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONT_SIZES.md,
  },
});
