import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, RefreshControl, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, runOnJS } from 'react-native-reanimated';
import StatusShield from '../components/StatusShield';
import VitalCard from '../components/VitalCard';
import WellnessScoreCard from '../components/WellnessScoreCard';
import GlassCard from '../components/GlassCard';
import AIHealthSummary, { LumenAskInput } from '../components/AIHealthSummary';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useVitalsStore } from '../store/useVitalsStore';
import { useProfileStore } from '../store/useProfileStore';
import { useToastStore } from '../store/useToastStore';
import { useAlertStore } from '../store/useAlertStore';
import { getVitalTranslation, getWellnessLabel } from '../utils/wellness';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';
import * as Haptics from 'expo-haptics';
import { useRealtimeVitals } from '../hooks/useRealtimeVitals';
import { supabase } from '../lib/supabase';

// Animated touchable for card press animation
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/** Returns a relative time string like "3 min ago" from an ISO timestamp */
function getRelativeTime(isoString) {
  if (!isoString) return null;
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Returns activity status based on time since last detection */
function getActivityStatus(isoString) {
  if (!isoString) return { color: '#AEAEB2', label: 'Offline', icon: 'wifi-off' };
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = diffMs / 60000;
  if (mins < 10) return { color: '#34C759', label: 'Active', icon: 'check-circle' };
  if (mins < 60) return { color: '#FF9500', label: 'Away', icon: 'clock' };
  return { color: '#AEAEB2', label: 'Offline', icon: 'wifi-off' };
}

/**
 * DashboardScreen — "Is Dad okay right now?" in under 3 seconds.
 * Shield dominates top third, vitals in a 2x2 grid below.
 */
export default function DashboardScreen() {
  // Activates Supabase Realtime subscription (no-op in demo mode)
  const { refetch } = useRealtimeVitals();
  const [refreshing, setRefreshing] = useState(false);
  const [previousWellness, setPreviousWellness] = useState(null);
  const lastKnownRecordedAt = useRef(null);

  // Scroll refs for section navigator
  const scrollRef = useRef(null);
  const shieldY = useRef(0);
  const vitalsY = useRef(0);
  const aiSummaryY = useRef(0);
  const [activeSection, setActiveSection] = useState(0);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    const prevRecordedAt = lastKnownRecordedAt.current;
    if (refetch) await refetch();
    setTimeout(() => {
      setRefreshing(false);
      // Only show toast if the recorded_at actually changed (new data)
      const currentRecordedAt = useVitalsStore.getState().latestVitals?.recorded_at;
      if (currentRecordedAt && currentRecordedAt !== prevRecordedAt) {
        lastKnownRecordedAt.current = currentRecordedAt;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        useToastStore.getState().showToast('Vitals Refreshed ✓', 'New scan data synced from mirror.', 'success');
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 500);
  };

  const latestVitals = useVitalsStore((s) => s.latestVitals);
  const wellnessScore = useVitalsStore((s) => s.wellnessScore);
  const overallStatus = useVitalsStore((s) => s.overallStatus);

  // "Last Seen" activity indicator
  const activityStatus = getActivityStatus(latestVitals?.recorded_at);
  const relativeTime = getRelativeTime(latestVitals?.recorded_at);

  const statusMessage = latestVitals?.recorded_at
    ? `Routine vitals captured successfully at ${new Date(latestVitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    : 'Waiting for first scan from mirror...';

  // Track recorded_at for smart refresh toasts
  useEffect(() => {
    if (latestVitals?.recorded_at) {
      lastKnownRecordedAt.current = latestVitals.recorded_at;
    }
  }, []);

  // Fetch previous wellness score for delta comparison
  useEffect(() => {
    const fetchPreviousWellness = async () => {
      const profileId = useProfileStore.getState().activeProfileId;
      if (!profileId || !supabase) return;
      try {
        const { data } = await supabase
          .from('vitals')
          .select('wellness_score, recorded_at')
          .eq('elderly_id', profileId)
          .order('recorded_at', { ascending: false })
          .range(1, 1) // Skip the latest, get the one before
          .maybeSingle();
        if (data?.wellness_score != null) {
          setPreviousWellness(Math.round(data.wellness_score));
        }
      } catch (e) {
        // Silently fail — delta is optional
      }
    };
    fetchPreviousWellness();
  }, [latestVitals?.recorded_at]);

  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const addElderly = useProfileStore((s) => s.addElderly);
  const showToast = useToastStore((s) => s.showToast);
  const activeAlert = useAlertStore((s) => s.activeAlert);
  const dismissAlert = useAlertStore((s) => s.dismissAlert);

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

  // Animated card press with scale spring (must be before early returns per Rules of Hooks)
  const PressableCard = useCallback(({ onPress, style, children }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View style={[style, animatedStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={() => {
            scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 200 });
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            scale.value = withSequence(
              withTiming(0.92, { duration: 80 }),
              withSpring(1, { damping: 10, stiffness: 250 })
            );
            setTimeout(() => onPress(), 120);
          }}
          style={{ flex: 1 }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }, []);

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

  // Compute wellness delta
  const currentWellness = wellnessScore != null ? Math.round(wellnessScore) : null;
  const wellnessDelta = (currentWellness != null && previousWellness != null) 
    ? currentWellness - previousWellness 
    : null;

  // ScrollView scroll handler for section navigator
  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < vitalsY.current - 50) setActiveSection(0);
    else if (y < aiSummaryY.current - 50) setActiveSection(1);
    else setActiveSection(2);
  };

  const scrollToSection = (sectionY) => {
    scrollRef.current?.scrollTo({ y: sectionY, animated: true });
  };

  return (
    <View
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
        }
      >
        {/* ── URGENT: Fall Detection Banner ── */}
        {activeAlert && activeAlert.alert_status === 'active' && (
          <View style={{ marginBottom: SPACING.md }}>
            <View style={styles.fallBanner}>
              <View style={styles.fallBannerHeader}>
                <Feather name="alert-triangle" size={22} color="#fff" />
                <Text style={styles.fallBannerTitle}>
                  {activeAlert.alert_type === 'Fall_Detected' ? '⚠️ FALL DETECTED' : '⚠️ SAFETY ALERT'}
                </Text>
              </View>
              <Text style={styles.fallBannerMessage}>
                {activeAlert.message || `${activeAlert.alert_type} — Severity: ${activeAlert.severity}`}
              </Text>
              {activeAlert.elderly_name && (
                <Text style={styles.fallBannerPatient}>Patient: {activeAlert.elderly_name}</Text>
              )}
              <Text style={styles.fallBannerTime}>
                {new Date(activeAlert.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
              <View style={styles.fallBannerActions}>
                <TouchableOpacity
                  style={styles.fallBannerCallBtn}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert('Call Emergency?', 'This will dial emergency services.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Call Now', style: 'destructive', onPress: () => {} },
                    ]);
                  }}
                >
                  <Feather name="phone-call" size={18} color={COLORS.red} />
                  <Text style={styles.fallBannerCallText}>Call Emergency</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fallBannerDismissBtn}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    dismissAlert();
                    showToast('Alert Resolved', 'The safety alert has been marked as resolved.', 'success');
                  }}
                >
                  <Text style={styles.fallBannerDismissText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Status Shield Profile Widget ── */}
        <View onLayout={(e) => { shieldY.current = e.nativeEvent.layout.y; }}>
          <StatusShield
            status={overallStatus}
            message={statusMessage}
            onNudge={handleNudge}
            profile={profile}
          />
        </View>

        {/* ── Last Seen Activity Indicator ── */}
        {latestVitals?.recorded_at && (
          <View style={styles.lastSeenRow}>
            <View style={[styles.lastSeenDot, { backgroundColor: activityStatus.color }]} />
            <Feather name={activityStatus.icon} size={12} color={activityStatus.color} style={{ marginRight: 4 }} />
            <Text style={[styles.lastSeenText, { color: activityStatus.color }]}>
              {activityStatus.label}
            </Text>
            <Text style={styles.lastSeenTime}>
              · Mirror detected face {relativeTime}
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View style={{ marginTop: SPACING.sm }} />

        {!latestVitals ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No vitals data available yet. Waiting for the mirror to sync.
            </Text>
          </View>
        ) : (
          <View 
            style={{ marginTop: SPACING.xs }}
            onLayout={(e) => { vitalsY.current = e.nativeEvent.layout.y; }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>

              {/* Heart Rate */}
              <PressableCard
                onPress={() => navigation.navigate('Trends', { metric: 'hr' })}
                style={[styles.reportCard, { width: '48%' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="heart" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.reportTitle}>HEART RATE</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={[styles.reportValue, { color: '#1E3A5F' }]}>{latestVitals.heart_rate != null ? Math.round(latestVitals.heart_rate) : '—'}</Text>
                  {latestVitals.heart_rate != null && <Text style={styles.reportUnit}>BPM</Text>}
                </View>
              </PressableCard>

              {/* Respiration */}
              <PressableCard
                onPress={() => navigation.navigate('Trends', { metric: 'rr' })}
                style={[styles.reportCard, { width: '48%' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="wind" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.reportTitle}>RESPIRATION</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={[styles.reportValue, { color: '#5AC8FA' }]}>{latestVitals.respiratory_rate != null ? Math.round(latestVitals.respiratory_rate) : '—'}</Text>
                  {latestVitals.respiratory_rate != null && <Text style={styles.reportUnit}>BR/MIN</Text>}
                </View>
              </PressableCard>

              {/* Stress Level — now tappable */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleAnimatedNavigation('hr')}
                style={[styles.reportCard, { width: '48%' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="activity" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.reportTitle}>STRESS LEVEL</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
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
              </TouchableOpacity>

              {/* Wellness Score — now tappable + delta comparison */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleAnimatedNavigation('hr')}
                style={[styles.reportCard, { width: '48%' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="target" size={12} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.reportTitle}>WELLNESS SCORE</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={[styles.reportValue, { color: '#5856D6' }]}>{currentWellness ?? '—'}</Text>
                  <Text style={styles.reportUnit}>/ 100</Text>
                </View>
                {/* Delta vs. previous scan */}
                {wellnessDelta != null && wellnessDelta !== 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Feather 
                      name={wellnessDelta > 0 ? 'trending-up' : 'trending-down'} 
                      size={12} 
                      color={wellnessDelta > 0 ? COLORS.green : COLORS.red} 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={{ 
                      fontSize: 11, 
                      fontWeight: '600', 
                      color: wellnessDelta > 0 ? COLORS.green : COLORS.red 
                    }}>
                      {wellnessDelta > 0 ? '+' : ''}{wellnessDelta} from last scan
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

            </View>

            {/* HRV Card — 2-column grid layout */}
            <View style={styles.reportHrvCard}>
              <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.5, color: COLORS.textSecondary, marginBottom: SPACING.sm }}>HRV</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAnimatedNavigation('sdnn')}
                  style={{ flex: 1, marginRight: SPACING.md, paddingVertical: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#5AC8FA', letterSpacing: -0.5 }}>{latestVitals.hrv_sdnn != null ? Math.round(latestVitals.hrv_sdnn) : '—'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginLeft: 4 }}>ms</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 }}>SDNN</Text>
                    <Feather name="chevron-right" size={12} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>

                <View style={{ width: 1, backgroundColor: COLORS.divider, marginVertical: 4 }} />

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAnimatedNavigation('rmssd')}
                  style={{ flex: 1, marginLeft: SPACING.md, paddingVertical: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#5AC8FA', letterSpacing: -0.5 }}>{latestVitals.hrv_rmssd != null ? Math.round(latestVitals.hrv_rmssd) : '—'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginLeft: 4 }}>ms</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 }}>RMSSD</Text>
                    <Feather name="chevron-right" size={12} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Lumen CareGuide — bottom of home tab */}
            <View onLayout={(e) => { aiSummaryY.current = e.nativeEvent.layout.y; }}>
              <AIHealthSummary />
            </View>

            {/* Ask Lumen IQ — separate typable input */}
            <LumenAskInput />
          </View>
        )}
      </ScrollView>

      {/* ── Floating Section Navigator ── */}
      {latestVitals && (
        <View style={styles.sectionNav}>
          {[
            { key: 'shield', y: shieldY },
            { key: 'vitals', y: vitalsY },
            { key: 'ai', y: aiSummaryY },
          ].map((sec, i) => (
            <Pressable
              key={sec.key}
              onPress={() => scrollToSection(sec.y.current)}
              hitSlop={12}
              style={styles.sectionNavDotWrap}
            >
              <View style={[
                styles.sectionNavDot,
                activeSection === i && styles.sectionNavDotActive,
              ]} />
            </Pressable>
          ))}
        </View>
      )}
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
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
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
  // Last Seen indicator
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  lastSeenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  lastSeenText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  lastSeenTime: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  // Section Navigator
  sectionNav: {
    position: 'absolute',
    right: 8,
    top: '45%',
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.md,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: RADII.full,
  },
  sectionNavDotWrap: {
    padding: 2,
  },
  sectionNavDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
    opacity: 0.4,
  },
  sectionNavDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary500,
    opacity: 1,
  },
  // ── Fall Detection Banner ──
  fallBanner: {
    backgroundColor: '#DC2626',
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fallBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  fallBannerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  fallBannerMessage: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  fallBannerPatient: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  fallBannerTime: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: SPACING.md,
  },
  fallBannerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  fallBannerCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#fff',
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
  },
  fallBannerCallText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: '#DC2626',
  },
  fallBannerDismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  fallBannerDismissText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
