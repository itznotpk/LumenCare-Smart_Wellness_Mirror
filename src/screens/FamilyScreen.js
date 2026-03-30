import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import DailyDropUploader from '../components/DailyDropUploader';
import EmotionalFeedback from '../components/EmotionalFeedback';
import PrivacyControls from '../components/PrivacyControls';
import { useProfileStore } from '../store/useProfileStore';
import { useToastStore } from '../store/useToastStore';
import { COLORS, SPACING, FONT_SIZES } from '../theme';

/**
 * FamilyScreen — The "Emotional Bridge" for media & mirror controls.
 */
export default function FamilyScreen() {
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
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
        <DailyDropUploader profileId={profile.id} onUpload={handleUpload} />
      </View>

      {/* Emotional Feedback Loop */}
      <View style={styles.section}>
        <EmotionalFeedback />
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
