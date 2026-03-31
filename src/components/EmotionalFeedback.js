import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../store/useToastStore';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';
import { supabase } from '../lib/supabase';

const getReactionEmoji = (type) => {
  const formatted = type?.toLowerCase() || '';
  if (formatted === 'smile' || formatted === 'smiled') return '😊';
  if (formatted === 'laugh' || formatted === 'laughed') return '😂';
  if (formatted === 'cry' || formatted === 'cried') return '🥲';
  if (formatted === 'wave' || formatted === 'waved') return '👋';
  if (formatted === 'read' || formatted === 'viewed') return '👀';
  if (formatted === 'sos' || formatted === 'help') return '🚨';
  return '❤️';
};


/**
 * EmotionalFeedback — Notification-style feed of reactions from the mirror.
 */
export default function EmotionalFeedback({ profileId }) {
  const showToast = useToastStore((s) => s.showToast);
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!profileId) return;

    // Fetch initial history
    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from('mirror_reactions')
        .select('*')
        .eq('elderly_id', profileId)
        .eq('is_read_by_caregiver', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setReactions(data);
      }
    };

    fetchReactions();

    // Subscribe to new real-time reactions arriving from the mirror natively
    const channel = supabase.channel('mirror_reactions_changes')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'mirror_reactions', filter: `elderly_id=eq.${profileId}` }, 
        (payload) => {
          setReactions(prev => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const handleDismiss = async (id) => {
    // 1. Optimistically hide it from the UI instantly
    setReactions((prev) => prev.filter(r => r.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 2. Mark as read precisely in the database payload!
    await supabase
      .from('mirror_reactions')
      .update({ is_read_by_caregiver: true })
      .eq('id', id);
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



  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>

        <View>
          <Text style={styles.title}>Mirror Reactions</Text>
          <Text style={styles.subtitle}>Notifications from the mirror</Text>
        </View>
      </View>

      {reactions.length === 0 ? (
        <View style={{ padding: SPACING.md, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, fontSize: FONT_SIZES.sm }}>No recent reactions stored from the mirror.</Text>
        </View>
      ) : (
        <FlatList
          data={reactions}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            return (
              <View style={[styles.notificationRow, { alignItems: 'center' }]}>
                {/* Emoji avatar */}
                <View style={styles.emojiAvatar}>
                  <Text style={styles.reactionEmoji}>{getReactionEmoji(item.reaction_type)}</Text>
                </View>

                {/* Notification content */}
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationMessage}>
                    {item.message || `Interacted with the mirror (${item.reaction_type})`}
                  </Text>
                  <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
                </View>

                {/* Explicit Dismiss Button (Web Compatible!) */}
                <TouchableOpacity 
                  onPress={() => handleDismiss(item.id)}
                  style={{ padding: SPACING.md, paddingRight: 0 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
