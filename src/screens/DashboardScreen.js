import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, RefreshControl } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import StatusShield from '../components/StatusShield';
import VitalCard from '../components/VitalCard';
import WellnessScoreCard from '../components/WellnessScoreCard';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useVitalsStore } from '../store/useVitalsStore';
import { useProfileStore } from '../store/useProfileStore';
import { useToastStore } from '../store/useToastStore';
import { getVitalTranslation, getWellnessLabel } from '../utils/wellness';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';
import * as Haptics from 'expo-haptics';
import { useRealtimeVitals } from '../hooks/useRealtimeVitals';

/**
 * DashboardScreen — "Is Dad okay right now?" in under 3 seconds.
 * Shield dominates top third, vitals in a 2x2 grid below.
 */
export default function DashboardScreen() {
  // Activates Supabase Realtime subscription (no-op in demo mode)
  const { refetch } = useRealtimeVitals();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (refetch) await refetch();
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 500); // simulated short delay for UX polish
  };

  const latestVitals = useVitalsStore((s) => s.latestVitals);
  const wellnessScore = useVitalsStore((s) => s.wellnessScore);
  const overallStatus = useVitalsStore((s) => s.overallStatus);
  const statusMessage = latestVitals?.recorded_at 
    ? `All clear. Routine vitals captured successfully at ${new Date(latestVitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    : 'Waiting for first scan from mirror...';

  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const addElderly = useProfileStore((s) => s.addElderly);
  const showToast = useToastStore((s) => s.showToast);

  const profile = getActiveProfile();
  const navigation = useNavigation();
  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile?.name || 'Unknown');

  // Onboarding local state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterPatient = async () => {
    if (!firstName || !lastName || !gender || !dateOfBirth) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Missing Info', 'First name, last name, gender, and date of birth are required.', 'error');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Invalid Date', 'Date of Birth must be in YYYY-MM-DD format.', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);

    const result = await addElderly(firstName, lastName, gender, dateOfBirth, medicalNotes);
    setIsSubmitting(false);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Registration Error', result.error, 'error');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Patient Connected', 'They are now synced to your app.', 'success');
      setFirstName('');
      setLastName('');
      setGender('');
      setDateOfBirth('');
      setMedicalNotes('');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary500} />
      </View>
    );
  }

  if (!profile && !isLoading) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ paddingTop: 80, paddingBottom: 100, paddingHorizontal: SPACING.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard intensity={80} style={{ padding: SPACING.xl }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs }}>Welcome to LumenCare!</Text>
          <Text style={{ fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginBottom: SPACING.xl }}>
            Please register your loved one & activate mirror connections.
          </Text>

          <View style={{ width: '100%', marginBottom: SPACING.lg }}>
            <TextInput
              style={styles.onboardInput}
              placeholder="First Name"
              placeholderTextColor={COLORS.textMuted}
              value={firstName}
              onChangeText={setFirstName}
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.onboardInput}
              placeholder="Last Name"
              placeholderTextColor={COLORS.textMuted}
              value={lastName}
              onChangeText={setLastName}
              editable={!isSubmitting}
            />
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
              <TouchableOpacity 
                style={[styles.onboardInput, { flex: 1, marginBottom: 0, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: gender === 'Male' ? COLORS.primary50 : 'rgba(255,255,255,0.7)', borderColor: gender === 'Male' ? COLORS.primary500 : '#e2e8f0' }]}
                onPress={() => setGender('Male')}
                disabled={isSubmitting}
              >
                <Text style={{ color: gender === 'Male' ? COLORS.primary700 : COLORS.textMuted, fontWeight: gender === 'Male' ? '700' : '500' }}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.onboardInput, { flex: 1, marginBottom: 0, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: gender === 'Female' ? COLORS.primary50 : 'rgba(255,255,255,0.7)', borderColor: gender === 'Female' ? COLORS.primary500 : '#e2e8f0' }]}
                onPress={() => setGender('Female')}
                disabled={isSubmitting}
              >
                <Text style={{ color: gender === 'Female' ? COLORS.primary700 : COLORS.textMuted, fontWeight: gender === 'Female' ? '700' : '500' }}>Female</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'web' ? (
              <TextInput
                style={[styles.onboardInput, { marginBottom: SPACING.md }]}
                placeholder="DOB (YYYY-MM-DD)"
                placeholderTextColor={COLORS.textMuted}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                editable={!isSubmitting}
              />
            ) : (
              <TouchableOpacity 
                style={[styles.onboardInput, { justifyContent: 'center' }]} 
                onPress={() => setShowDatePicker(true)}
                disabled={isSubmitting}
              >
                <Text style={{ color: dateOfBirth ? COLORS.textPrimary : COLORS.textMuted }}>
                  {dateOfBirth ? dateOfBirth : "Date of Birth (Select)"}
                </Text>
              </TouchableOpacity>
            )}

            {showDatePicker && Platform.OS !== 'web' && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showDatePicker}>
                  <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <View style={{ backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 20 : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: SPACING.md, borderBottomWidth: 1, borderColor: '#eee' }}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={{ color: COLORS.primary500, fontSize: FONT_SIZES.md, fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={dateOfBirth ? new Date(dateOfBirth) : new Date(1950, 0, 1)}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) setDateOfBirth(selectedDate.toISOString().split('T')[0]);
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={dateOfBirth ? new Date(dateOfBirth) : new Date(1950, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setDateOfBirth(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )
            )}

            <TextInput
              style={[styles.onboardInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Medical Notes (Optional) - Allergies, conditions, etc."
              placeholderTextColor={COLORS.textMuted}
              value={medicalNotes}
              onChangeText={setMedicalNotes}
              multiline
              editable={!isSubmitting}
            />
          </View>

          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary500, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: RADII.full, flexDirection: 'row', alignItems: 'center' }}
            onPress={handleRegisterPatient}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} style={{ marginRight: SPACING.sm }} />
            ) : (
              <Feather name="plus-circle" size={20} color={COLORS.white} style={{ marginRight: SPACING.sm }} />
            )}
            <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZES.md }}>
              {isSubmitting ? 'Connecting...' : 'Activate Mirror'}
            </Text>
          </TouchableOpacity>
        </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const wellnessLabel = getWellnessLabel(wellnessScore);

  const handleNudge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Nudge Sent! 🔔',
      `A gentle ping has been sent to ${displayName}'s mirror.`,
      [{ text: 'OK' }]
    );
  };

  const getHRStatus = (hr) => {
    if (hr < 50 || hr > 120) return 'red';
    if (hr < 55 || hr > 100) return 'yellow';
    return 'green';
  };

  const getHRVStatus = (hrv) => {
    if (hrv < 15) return 'red';
    if (hrv < 25) return 'yellow';
    return 'green';
  };

  const getRRStatus = (rr) => {
    if (rr < 8 || rr > 25) return 'red';
    if (rr < 10 || rr > 22) return 'yellow';
    return 'green';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
      }
    >
      {/* ── Status Shield Profile Widget ── */}
      <StatusShield
        status={overallStatus}
        message={statusMessage}
        onNudge={handleNudge}
        profile={profile}
      />

      {/* ── HEALTH REPORT ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, marginTop: SPACING.xxl }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.5, color: COLORS.textPrimary }}>HEALTH REPORT</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' }}>
            Scanned at {latestVitals?.recorded_at ? new Date(latestVitals.recorded_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Never'}
          </Text>
        </View>
      </View>

      {!latestVitals ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            No vitals data available yet. Waiting for the mirror to sync.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: SPACING.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            
            {/* Heart Rate */}
            <View style={[styles.reportCard, { width: '48%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                <Feather name="heart" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.reportTitle}>HEART RATE</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING.sm }}>
                <Text style={[styles.reportValue, { color: COLORS.red }]}>{latestVitals.heart_rate ?? '—'}</Text>
                {latestVitals.heart_rate && <Text style={styles.reportUnit}>BPM</Text>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto' }}>
                <View style={styles.reportProgressBar}>
                  <View style={[styles.reportProgressFill, { width: latestVitals.heart_rate ? `${Math.min(100, (latestVitals.heart_rate / 120) * 100)}%` : '0%', backgroundColor: COLORS.red }]} />
                </View>
                <Text style={styles.reportSecondaryText}>{latestVitals.heart_rate ? `${Math.round((latestVitals.heart_rate / 120) * 100)}%` : ''}</Text>
              </View>
            </View>

            {/* Respiration */}
            <View style={[styles.reportCard, { width: '48%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                <Feather name="wind" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.reportTitle}>RESPIRATION</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING.sm }}>
                <Text style={[styles.reportValue, { color: '#5AC8FA' }]}>{latestVitals.respiratory_rate ?? '—'}</Text>
                {latestVitals.respiratory_rate && <Text style={styles.reportUnit}>br/min</Text>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto' }}>
                <View style={styles.reportProgressBar}>
                  <View style={[styles.reportProgressFill, { width: latestVitals.respiratory_rate ? `${Math.min(100, (latestVitals.respiratory_rate / 35) * 100)}%` : '0%', backgroundColor: '#5AC8FA' }]} />
                </View>
                <Text style={styles.reportSecondaryText}>{latestVitals.respiratory_rate ? `${Math.round((latestVitals.respiratory_rate / 35) * 100)}%` : ''}</Text>
              </View>
            </View>

            {/* Stress Level */}
            <View style={[styles.reportCard, { width: '48%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                <Feather name="activity" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.reportTitle}>STRESS LEVEL</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.reportValue, { 
                    color: !latestVitals.stress_level ? COLORS.textSecondary : 
                     latestVitals.stress_level.toLowerCase() === 'low' ? COLORS.green : 
                     latestVitals.stress_level.toLowerCase() === 'medium' ? COLORS.yellow : COLORS.red 
                  }]}>
                  {latestVitals.stress_level ?? '—'}
                </Text>
              </View>
            </View>

            {/* Wellness Score */}
            <View style={[styles.reportCard, { width: '48%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                <Feather name="target" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.reportTitle}>WELLNESS SCORE</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.reportValue, { color: '#5856D6' }]}>{wellnessScore ?? '—'}</Text>
                <Text style={styles.reportUnit}>/ 100</Text>
              </View>
            </View>

          </View>

          {/* HRV Wide Bottom Card */}
          <View style={[styles.reportHrvCard, { marginTop: SPACING.xs }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.5, color: COLORS.textSecondary, marginRight: SPACING.lg }}>HRV</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginRight: SPACING.xl }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#5AC8FA', letterSpacing: -0.5 }}>{latestVitals.hrv_sdnn ?? '—'}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginLeft: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>SDNN ms</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#5AC8FA', letterSpacing: -0.5 }}>{latestVitals.hrv_rmssd ?? '—'}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginLeft: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>RMSSD ms</Text>
            </View>
          </View>
        </View>
      )}
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
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  lastScan: {
    textAlign: 'center',
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  reportCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: SPACING.md,
    minHeight: 115,
  },
  reportTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  reportValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  reportUnit: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  reportProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    marginRight: 8,
  },
  reportProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  reportSecondaryText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  reportHrvCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.divider,
    flexDirection: 'row',
    alignItems: 'baseline',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: SPACING.xl,
  },
  emptyStateContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  onboardInput: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
});
