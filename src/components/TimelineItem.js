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
/**
 * Event-specific icon mapping:
 *
 * 🚨 Emergency (Fall)     → alert-triangle,  Rose Red
 * 🌅 Morning  (6–10 AM)   → sunrise,         Organic Sage
 * ☀️ Mid-Day  (11 AM–4 PM) → sun,             Organic Sage
 * 🌇 Evening  (5–8 PM)    → sunset,          Organic Sage
 * 🌙 Nighttime (9 PM–1 AM) → moon,            Organic Sage
 * 📷 Media                → image,           Empathy Lavender
 * 🕐 Default              → clock,           Muted Slate
 */

/**
 * Detect if this event is a fall/emergency — checks both event_type AND description
 */
const isFallEvent = (item) => {
  if (item.event_type === 'fall') return true;
  const desc = (item.description || '').toLowerCase();
  if (desc.includes('fall')) return true;
  if (item.vitals_status === 'danger' || item.severity === 'critical') return true;
  return false;
};

const isExpressionAlert = (item) =>
  item.event_type === 'expression_alert';

const isExpression = (item) =>
  item.event_type === 'expression' || item.event_type === 'expression_alert';

const getEventIcon = (eventType, description = '') => {
  const descLower = description.toLowerCase();

  // 🚨 Emergency — overrides everything (check description too)
  if (eventType === 'fall' || descLower.includes('fall')) {
    return { name: 'alert-triangle', color: COLORS.red, bgColor: COLORS.redLight };
  }

  // 🌅 Morning vitals scan
  if (descLower.includes('morning')) {
    return { name: 'sunrise', color: COLORS.sage, bgColor: COLORS.sageMuted };
  }

  // ☀️ Mid-day check-in
  if (descLower.includes('mid-day')) {
    return { name: 'sun', color: COLORS.sage, bgColor: COLORS.sageMuted };
  }

  // 🌇 Evening vitals scan
  if (descLower.includes('evening')) {
    return { name: 'sunset', color: COLORS.sage, bgColor: COLORS.sageMuted };
  }

  // 🌙 Nighttime scan
  if (descLower.includes('night')) {
    return { name: 'moon', color: COLORS.sage, bgColor: COLORS.sageMuted };
  }

  // 📷 Media (daily drops)
  if (eventType === 'media') {
    return { name: 'image', color: COLORS.accent500, bgColor: COLORS.accent50 };
  }

  // 😢 Distressed expression (sad, fearful, angry, sos)
  if (eventType === 'expression_alert') {
    return { name: 'frown', color: '#DC2626', bgColor: '#FEE2E2' };
  }

  // 😊 Neutral / positive expression (smile, wave, happy)
  if (eventType === 'expression') {
    return { name: 'smile', color: '#D97706', bgColor: '#FEF3C7' };
  }

  // General scan fallback
  if (eventType === 'scan') {
    return { name: 'activity', color: COLORS.sage, bgColor: COLORS.sageMuted };
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
  if (isExpressionAlert(item)) return true;
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
  const exprAlert = isExpressionAlert(item);
  const expr = isExpression(item);

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
      anomaly && !isFall && !exprAlert && styles.anomalyContainer,
      isFall && styles.fallContainer,
      exprAlert && styles.expressionAlertContainer,
      expr && !exprAlert && styles.expressionContainer,
    ]}>
      {/* Timeline connector */}
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: iconConfig.bgColor }]}>
          <Feather name={iconConfig.name} size={14} color={iconConfig.color} />
        </View>
        {!isLast && (
          <View style={[
            styles.connector,
            anomaly && !isFall && !exprAlert && styles.anomalyConnector,
            isFall && styles.fallConnector,
            exprAlert && styles.expressionAlertConnector,
          ]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[
            styles.time,
            isFall && { color: '#DC2626' },
            exprAlert && { color: '#B45309' },
          ]}>{prefix}{timeStr}</Text>
          {isFall && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
          )}
          {exprAlert && (
            <View style={styles.distressedBadge}>
              <Text style={styles.distressedBadgeText}>DISTRESSED</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.description,
          anomaly && !isFall && !exprAlert && styles.anomalyDescription,
          isFall && styles.fallDescription,
          exprAlert && styles.expressionAlertDescription,
          expr && !exprAlert && styles.expressionDescription,
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
  // Expression — positive/neutral emotions (amber tint)
  expressionContainer: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  expressionDescription: {
    fontWeight: '600',
    color: '#92400E',
  },
  // Expression alert — distressed emotions (rose tint, like fall)
  expressionAlertContainer: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  expressionAlertConnector: {
    backgroundColor: '#EA580C',
  },
  expressionAlertDescription: {
    fontWeight: '700',
    color: '#9A3412',
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
  distressedBadge: {
    backgroundColor: '#EA580C',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
  },
  distressedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
