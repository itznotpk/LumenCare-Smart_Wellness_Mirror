import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import DailyDropUploader from '../components/DailyDropUploader';
import EmotionalFeedback from '../components/EmotionalFeedback';
import PrivacyControls from '../components/PrivacyControls';
import GlassCard from '../components/GlassCard';
import { useProfileStore } from '../store/useProfileStore';
import { useToastStore } from '../store/useToastStore';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

/**
 * FamilyScreen — The "Emotional Bridge" for media & mirror controls.
 */
export default function FamilyScreen() {
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const profile = getActiveProfile();
  const showToast = useToastStore((s) => s.showToast);

  const [refreshing, setRefreshing] = useState(false);

  const handleUpload = ({ uri, message, type }) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Daily Drop Sent', 'Your media was delivered to the mirror!', 'success');
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
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
          <Feather name="heart" size={48} color={COLORS.primary500} style={{ marginBottom: SPACING.md }} />
          <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm }}>Family Bridge Offline</Text>
          <Text style={{ fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center' }}>
            Register a patient from the Home tab to start sending Daily Drops to the mirror.
          </Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
      }
    >

      {/* Daily Drop Uploader */}
      <View style={styles.section}>
        <DailyDropUploader profileId={profile?.id} onUpload={handleUpload} />
      </View>

      {/* Emotional Feedback Loop */}
      <View style={styles.section}>
        <EmotionalFeedback profileId={profile?.id} />
      </View>

      {/* Privacy Controls */}
      <View style={styles.section}>
        <PrivacyControls />
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
});
