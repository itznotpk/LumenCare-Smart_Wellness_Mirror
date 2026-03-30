import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../store/useToastStore';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

const MOCK_REACTIONS = [
  {
    id: '1',
    media_type: 'photo',
    reaction: 'smiled',
    viewed_at: new Date().toISOString().replace(/T.*/, 'T08:16:00'),
    content_hint: 'your photo of Petaling Jaya',
  },
  {
    id: '2',
    media_type: 'video',
    reaction: 'laughed',
    viewed_at: new Date(Date.now() - 3600000).toISOString().replace(/T.*/, 'T07:30:00'),
    content_hint: 'your video message',
  },
  {
    id: '3',
    media_type: 'text',
    reaction: 'smiled',
    viewed_at: new Date(Date.now() - 86400000).toISOString().replace(/T.*/, 'T08:10:00'),
    content_hint: 'your morning note',
  },
  {
    id: '4',
    media_type: 'photo',
    reaction: 'cried',
    viewed_at: new Date(Date.now() - 172800000).toISOString().replace(/T.*/, 'T09:05:00'),
    content_hint: 'the family reunion photo',
  },
];

const REACTION_CONFIG = {
  smiled: { emoji: '😊', verb: 'smiled', pastAction: 'viewed' },
  laughed: { emoji: '😂', verb: 'laughed', pastAction: 'watched' },
  cried: { emoji: '🥲', verb: 'was moved', pastAction: 'viewed' },
  default: { emoji: '❤️', verb: 'loved', pastAction: 'viewed' },
};

/**
 * EmotionalFeedback — Notification-style feed of reactions from the mirror.
 */
export default function EmotionalFeedback() {
  const showToast = useToastStore((s) => s.showToast);

  const handleLongPress = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Mirror Reaction',
      `Manage this notification from the mirror.`,
      [
        { text: 'Reply to Mirror', onPress: () => showToast('Reply Sent', 'Your message is on the way.', 'success') },
        { text: 'Pin to Top', onPress: () => showToast('Pinned', 'Reaction pinned to top.', 'success') },
        { text: 'Delete', style: 'destructive', onPress: () => showToast('Deleted', 'Reaction removed from feed.', 'info') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  };

  const buildNotificationMessage = (item) => {
    const config = REACTION_CONFIG[item.reaction] || REACTION_CONFIG.default;
    return `Dad ${config.pastAction} ${item.content_hint} and ${config.verb}!`;
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>

        <View>
          <Text style={styles.title}>Mirror Reactions</Text>
          <Text style={styles.subtitle}>Notifications from the mirror</Text>
        </View>
      </View>

      <FlatList
        data={MOCK_REACTIONS}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const config = REACTION_CONFIG[item.reaction] || REACTION_CONFIG.default;
          return (
            <TouchableOpacity 
              style={styles.notificationRow}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
              activeOpacity={0.7}
            >
              {/* Emoji avatar */}
              <View style={styles.emojiAvatar}>
                <Text style={styles.reactionEmoji}>{config.emoji}</Text>
              </View>

              {/* Notification content */}
              <View style={styles.notificationContent}>
                <Text style={styles.notificationMessage}>
                  {buildNotificationMessage(item)}
                </Text>
                <Text style={styles.notificationTime}>{formatTime(item.viewed_at)}</Text>
              </View>

              {/* Unread indicator for today's items */}
              {new Date(item.viewed_at).toDateString() === new Date().toDateString() && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },

  // Notification rows
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  emojiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary500,
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});
