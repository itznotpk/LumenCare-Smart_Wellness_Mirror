import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/useProfileStore';
import { useVitalsStore } from '../store/useVitalsStore';
import { useToastStore } from '../store/useToastStore';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';

const RISK_BADGE = {
  low: { bg: '#DCFCE7', text: '#15803D', label: 'Low Risk' },
  medium: { bg: '#FEF9C3', text: '#A16207', label: 'Medium Risk' },
  high: { bg: '#FEE2E2', text: '#B91C1C', label: 'High Risk' },
};

/**
 * SkeletonBlock – shimmering placeholder for loading state
 */
function SkeletonBlock({ width = '100%', height = 14, style }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 6,
          backgroundColor: '#E2E8F0',
        },
        style,
        animStyle,
      ]}
    />
  );
}

/**
 * AIHealthSummary — Lumen CareGuide insight card.
 * Title sits OUTSIDE the card container (like "Vital Metrics" in Trends).
 * Risk badge is next to the title.
 */
export default function AIHealthSummary() {
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const latestVitals = useVitalsStore((s) => s.latestVitals);
  const profile = getActiveProfile();

  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchInsight = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbErr } = await supabase
        .from('health_insights')
        .select('insights, suggestions, risk_level, created_at, vitals_id')
        .eq('elderly_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbErr) throw dbErr;
      setInsight(data);
    } catch (e) {
      console.warn('[AIHealthSummary] fetch error:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight, latestVitals?.recorded_at]);

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <View>
        <View style={styles.externalTitleRow}>
          <Text style={styles.externalTitle}>Lumen CareGuide</Text>
        </View>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(239,246,255,0.55)', 'rgba(255,255,255,0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={{ marginTop: SPACING.xs }}>
              <SkeletonBlock width={100} height={10} />
              <SkeletonBlock width="100%" height={12} style={{ marginTop: 8 }} />
              <SkeletonBlock width="85%" height={12} style={{ marginTop: 6 }} />
              <SkeletonBlock width="70%" height={12} style={{ marginTop: 6 }} />
            </View>
            <View style={styles.suggestionsBox}>
              <SkeletonBlock width={130} height={10} />
              <SkeletonBlock width="95%" height={12} style={{ marginTop: 8 }} />
              <SkeletonBlock width="80%" height={12} style={{ marginTop: 6 }} />
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  // ── Empty / Fallback State ──
  if (!insight) {
    return (
      <View>
        <View style={styles.externalTitleRow}>
          <Text style={styles.externalTitle}>Lumen CareGuide</Text>
        </View>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(239,246,255,0.55)', 'rgba(255,255,255,0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.emptyBody}>
              <Feather name="cpu" size={28} color={COLORS.primary500} style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.emptyText}>
                Analyzing today's vitals… AI summary will be available shortly.
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  // ── Rendered Insight ──
  const riskKey = (insight.risk_level || 'low').toLowerCase();
  const badge = RISK_BADGE[riskKey] || RISK_BADGE.low;

  const renderTextBlock = (text, maxLines = null) => {
    if (!text) return { elements: <Text style={styles.bodyText}>—</Text>, hasMore: false };

    const lines = text.split(/\n/).filter((l) => l.trim().length > 0);
    const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
    const hasMore = maxLines ? lines.length > maxLines : false;

    const elements = displayLines.map((line, i) => {
      const cleaned = line.replace(/^[\s•\-\*]+/, '').trim();
      const isBullet = /^[\s]*[•\-\*]/.test(line);
      const colonMatch = cleaned.match(/^(.+?:\s?)(.*)/s);

      return (
        <View key={i} style={{ flexDirection: 'row', marginTop: i === 0 ? 6 : 0, marginBottom: 10 }}>
          {isBullet && (
            <Text style={[styles.bodyText, { marginRight: 6, color: COLORS.primary500 }]}>•</Text>
          )}
          <Text style={[styles.bodyText, { flex: 1 }]}>
            {colonMatch ? (
              <>
                <Text style={{ fontWeight: '700', color: '#1E293B' }}>{colonMatch[1]}</Text>
                {colonMatch[2]}
              </>
            ) : (
              cleaned
            )}
          </Text>
        </View>
      );
    });

    return { elements, hasMore, totalCount: lines.length };
  };

  const maxBullets = expanded ? null : 2;
  const insightsResult = renderTextBlock(insight.insights, maxBullets);
  const suggestionsResult = renderTextBlock(insight.suggestions, maxBullets);
  const canExpand = insightsResult.hasMore || suggestionsResult.hasMore;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      {/* ── Title + Risk Badge — outside the card ── */}
      <View style={styles.externalTitleRow}>
        <Text style={styles.externalTitle}>Lumen CareGuide</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <View style={[styles.badgeDot, { backgroundColor: badge.text }]} />
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {/* ── Card Container ── */}
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(239,246,255,0.55)', 'rgba(255,255,255,0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Section: Clinical Insights (white zone) */}
          <View style={styles.sectionLabelRow}>
            <Feather name="activity" size={12} color="#64748B" style={{ marginRight: 5 }} />
            <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          </View>
          {insightsResult.elements}

          {/* Section: Actionable Steps (cyan tinted inner box) */}
          <View style={styles.suggestionsBox}>
            <View style={[styles.sectionLabelRow, { marginTop: 0 }]}>
              <Feather name="check-square" size={12} color="#0E7490" style={{ marginRight: 5 }} />
              <Text style={[styles.sectionLabel, { color: '#0E7490', marginTop: 0 }]}>RECOMMENDED ACTIONS</Text>
            </View>
            {insight.suggestions ? (
              suggestionsResult.elements
            ) : (
              <View style={{ marginTop: 6 }}>
                <SkeletonBlock width="95%" height={14} style={{ marginBottom: 10 }} />
                <SkeletonBlock width="80%" height={14} style={{ marginBottom: 10 }} />
              </View>
            )}
          </View>

          {/* Show More / Show Less */}
          {canExpand && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpanded(!expanded)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {expanded ? 'Show Less' : `Show More (${Math.max(
                  (insightsResult.totalCount || 0) - 2,
                  (suggestionsResult.totalCount || 0) - 2,
                  0
                )} more)`}
              </Text>
              <Feather
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={COLORS.primary500}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          )}

          {/* Timestamp */}
          {insight.created_at && (
            <Text style={styles.timestamp}>
              Generated {new Date(insight.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  externalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  externalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  container: {
    borderRadius: RADII.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.45)',
    ...SHADOWS.card,
  },
  gradient: {
    padding: SPACING.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
  },
  bodyText: {
    fontSize: FONT_SIZES.sm,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '400',
  },
  suggestionsBox: {
    backgroundColor: 'rgba(207,250,254,0.35)',
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(164,228,243,0.4)',
  },
  emptyBody: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    textAlign: 'right',
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: 2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary500,
  },
});
