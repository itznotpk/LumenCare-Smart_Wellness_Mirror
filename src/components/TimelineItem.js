import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

/**
 * Event-specific icon mapping with distinct icons for quick scanning:
 * - scan / grooming → coffee cup
 * - motion (night) → moon
 * - motion (day) → walking figure
 * - fall → red siren / alert
 * - media → image
 * - default → clock
 */
const getEventIcon = (eventType, description = '') => {
  const descLower = description.toLowerCase();

  // Fall detection — highest priority
  if (eventType === 'fall') {
    return { name: 'alert-octagon', library: 'feather', color: COLORS.red, bgColor: COLORS.redLight };
  }

  // Morning grooming / scan
  if (eventType === 'scan' || descLower.includes('grooming') || descLower.includes('morning')) {
    return { name: 'coffee', library: 'feather', color: '#065F46', bgColor: COLORS.greenLight };
  }

  // Night-time motion
  if (descLower.includes('night') || descLower.includes('midnight') || descLower.includes('sleep')) {
    return { name: 'moon', library: 'feather', color: '#4338CA', bgColor: '#EEF2FF' };
  }

  // Daytime motion
  if (eventType === 'motion') {
    return { name: 'activity', library: 'feather', color: COLORS.primary500, bgColor: COLORS.primary50 };
  }

  // Media
  if (eventType === 'media') {
    return { name: 'image', library: 'feather', color: '#9333EA', bgColor: '#F5F3FF' };
  }

  // Default
  return { name: 'clock', library: 'feather', color: COLORS.textMuted, bgColor: COLORS.divider };
};

/**
 * Detect if this event represents an anomaly (missed routine, fall, etc.)
 */
const isAnomaly = (item) => {
  const descLower = (item.description || '').toLowerCase();
  if (item.event_type === 'fall') return true;
  if (item.vitals_status === 'critical' || item.vitals_status === 'warning') return true;
  if (descLower.includes('missed') || descLower.includes('no routine') || descLower.includes('overdue')) return true;
  return false;
};

/**
 * TimelineItem — A single row in the activity feed.
 * Uses distinct icons per event type and highlights anomalies with a yellow background.
 *
 * @param {Object} item - { event_type, description, vitals_status, occurred_at }
 * @param {boolean} isLast - No connector line for last item
 */
export default function TimelineItem({ item, isLast }) {
  const iconConfig = getEventIcon(item.event_type, item.description);
  const anomaly = isAnomaly(item);

  const time = new Date(item.occurred_at);
  const now = new Date();
  const isToday = time.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = time.toDateString() === yesterday.toDateString();

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const prefix = isToday ? '' : isYesterday ? 'Yesterday ' : time.toLocaleDateString() + ' ';

  return (
    <View style={[styles.container, anomaly && styles.anomalyContainer]}>
      {/* Timeline connector */}
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: iconConfig.bgColor }]}>
          <Feather name={iconConfig.name} size={14} color={iconConfig.color} />
        </View>
        {!isLast && <View style={[styles.connector, anomaly && styles.anomalyConnector]} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.time}>{prefix}{timeStr}</Text>
        <Text style={[styles.description, anomaly && styles.anomalyDescription]}>
          {item.description}
        </Text>
        {item.event_type === 'fall' && (
          <View style={styles.urgentBadge}>
            <Feather name="alert-triangle" size={11} color={COLORS.white} />
            <Text style={styles.urgentBadgeText}>URGENT</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 60,
    borderRadius: RADII.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    marginHorizontal: -SPACING.xs,
  },
  anomalyContainer: {
    backgroundColor: COLORS.yellowLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.yellow,
  },
  timeline: {
    width: 40,
    alignItems: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  anomalyConnector: {
    backgroundColor: COLORS.yellow,
  },
  content: {
    flex: 1,
    paddingLeft: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  anomalyDescription: {
    fontWeight: '700',
    color: '#92400E',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.red,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
