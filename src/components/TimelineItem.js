import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

/**
 * Event-specific icon mapping:
 *
 * 🚨 Emergency (Fall)     → alert-triangle,  Bold Red
 * 🌅 Morning  (6–10 AM)   → sunrise,         Soft Emerald
 * ☀️ Mid-Day  (11 AM–4 PM) → sun,             Soft Emerald
 * 🌇 Evening  (5–8 PM)    → sunset,          Soft Emerald
 * 🌙 Nighttime (9 PM–1 AM) → moon,            Soft Emerald
 * 📷 Media                → image,           Purple
 * 🕐 Default              → clock,           Muted
 */
const EMERALD = '#10B981';
const EMERALD_BG = '#ECFDF5';

/**
 * Detect if this event is a fall/emergency — checks both event_type AND description
 * to handle legacy data that might not have event_type='fall'.
 */
const isFallEvent = (item) => {
  if (item.event_type === 'fall') return true;
  const desc = (item.description || '').toLowerCase();
  if (desc.includes('fall')) return true;

  if (item.vitals_status === 'danger' || item.severity === 'critical') return true;
  return false;
};

const getEventIcon = (eventType, description = '') => {
  const descLower = description.toLowerCase();

  // 🚨 Emergency — overrides everything (check description too)
  if (eventType === 'fall' || descLower.includes('fall')) {
    return { name: 'alert-triangle', color: '#DC2626', bgColor: '#FEF2F2' };
  }


  // 🌅 Morning vitals scan
  if (descLower.includes('morning')) {
    return { name: 'sunrise', color: EMERALD, bgColor: EMERALD_BG };
  }

  // ☀️ Mid-day check-in
  if (descLower.includes('mid-day')) {
    return { name: 'sun', color: EMERALD, bgColor: EMERALD_BG };
  }

  // 🌇 Evening vitals scan
  if (descLower.includes('evening')) {
    return { name: 'sunset', color: EMERALD, bgColor: EMERALD_BG };
  }

  // 🌙 Nighttime scan
  if (descLower.includes('night')) {
    return { name: 'moon', color: EMERALD, bgColor: EMERALD_BG };
  }

  // 📷 Media (daily drops)
  if (eventType === 'media') {
    return { name: 'image', color: '#9333EA', bgColor: '#F5F3FF' };
  }

  // General scan fallback
  if (eventType === 'scan') {
    return { name: 'activity', color: EMERALD, bgColor: EMERALD_BG };
  }

  // General motion fallback
  if (eventType === 'motion') {
    return { name: 'activity', color: COLORS.primary500, bgColor: COLORS.primary50 };
  }

  // Default
  return { name: 'clock', color: COLORS.textMuted, bgColor: COLORS.divider };
};

/**
 * Detect if this event represents an anomaly (missed routine, fall, etc.)
 */
const isAnomaly = (item) => {
  const descLower = (item.description || '').toLowerCase();
  if (isFallEvent(item)) return true;
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
  const isFall = isFallEvent(item);

  const time = new Date(item.occurred_at);
  const now = new Date();
  const isToday = time.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = time.toDateString() === yesterday.toDateString();

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const prefix = isToday ? '' : isYesterday ? 'Yesterday ' : time.toLocaleDateString() + ' ';

  return (
    <View style={[
      styles.container, 
      anomaly && !isFall && styles.anomalyContainer,
      isFall && styles.fallContainer
    ]}>
      {/* Timeline connector */}
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: iconConfig.bgColor }]}>
          <Feather name={iconConfig.name} size={14} color={iconConfig.color} />
        </View>
        {!isLast && <View style={[styles.connector, anomaly && styles.anomalyConnector, isFall && styles.fallConnector]} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.time, isFall && { color: '#DC2626' }]}>{prefix}{timeStr}</Text>
          {isFall && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.description, 
          anomaly && !isFall && styles.anomalyDescription,
          isFall && styles.fallDescription
        ]}>
          {item.description}
        </Text>
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
  fallContainer: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
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
  fallDescription: {
    fontWeight: '800',
    color: '#B91C1C',
  },
  urgentBadge: {
    backgroundColor: COLORS.red,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
