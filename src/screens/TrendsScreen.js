import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../components/GlassCard';
import AnimatedPressable from '../components/AnimatedPressable';
import MetricToggle from '../components/MetricToggle';
import AutonomicGauge from '../components/AutonomicGauge';
import * as Haptics from 'expo-haptics';
import GlassSkeleton from '../components/GlassSkeleton';
import { useToastStore } from '../store/useToastStore';
import { useVitalsStore } from '../store/useVitalsStore';
import { useProfileStore } from '../store/useProfileStore';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS, MIN_TAP_TARGET } from '../theme';

const METRIC_CONFIG = {
  hr: { label: 'Heart Rate', unit: 'bpm', color: COLORS.red, key: 'heart_rate' },
  sdnn: { label: 'HRV (SDNN)', unit: 'ms', color: '#5AC8FA', key: 'hrv_sdnn' },
  rmssd: { label: 'HRV (RMSSD)', unit: 'ms', color: COLORS.primary500, key: 'hrv_rmssd' },
  rr: { label: 'Respiratory Rate', unit: 'bpm', color: COLORS.green, key: 'respiratory_rate' },
};

const TIME_RANGES = [
  { key: '1D', label: '1D' },
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
];

/**
 * TrendsScreen — Longitudinal health insights with charts.
 * Merged wellness + vital charts under a unified time range toggle.
 */
export default function TrendsScreen() {
  const [selectedMetric, setSelectedMetric] = useState('hr');
  const [timeRange, setTimeRange] = useState('1W');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate1D, setSelectedDate1D] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const showToast = useToastStore((s) => s.showToast);
  const history = useVitalsStore((s) => s.history);
  const baselineAverage = useVitalsStore((s) => s.baselineAverage);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const profile = getActiveProfile();
  const navigation = useNavigation();
  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile?.name || 'Unknown');

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
          <Feather name="bar-chart-2" size={48} color={COLORS.primary500} style={{ marginBottom: SPACING.md }} />
          <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm }}>No Data to Chart</Text>
          <Text style={{ fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg }}>
            Register a patient first to start tracking their longitudinal health trends.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.primary500, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADII.full }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Family');
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZES.md }}>Add Patient</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  const config = METRIC_CONFIG[selectedMetric];

  // Check if we have enough data
  const hasEnoughData = history.length >= 3;

  // Filter history based on time range
  const getFilteredHistory = () => {
    if (timeRange === '1D') {
      const targetStart = new Date(selectedDate1D);
      targetStart.setHours(0,0,0,0);
      const targetEnd = new Date(selectedDate1D);
      targetEnd.setHours(23,59,59,999);
      return history.filter(day => {
        const d = new Date(day.date);
        return d >= targetStart && d <= targetEnd;
      });
    }

    const now = new Date();
    const daysMap = { '1W': 7, '1M': 30, '3M': 90 };
    const days = daysMap[timeRange] || 7;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return history.filter((day) => new Date(day.date) >= cutoff).slice(-150); // Chart engine bound
  };

  const filteredHistory = getFilteredHistory();

  const formatLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (!d || isNaN(d.getTime())) return '';
    if (timeRange === '1D') {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
    } else if (timeRange === '1W') {
      return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
    } else {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  };

  // Chart data
  const chartData = filteredHistory.map((day) => ({
    value: day[config.key] || 0,
    label: formatLabel(day.date),
    dataPointText: `${day[config.key] || 0}`,
  }));

  // Wellness trend data
  const wellnessData = filteredHistory.map((day) => ({
    value: day.wellness_score || 0,
    label: formatLabel(day.date),
  }));

  // Baseline ghost line
  const baselineData = filteredHistory.map(() => ({
    value: baselineAverage,
  }));

  const latestLfHf = history.length > 0 ? history[history.length - 1].lf_hf_ratio : 1.0;

  const handleExport = () => {
    showToast('Report Generated', 'Saved to your device.', 'success');
  };

  const renderTooltip = (item) => (
    <View style={styles.tooltip}>
      <Text style={styles.tooltipValue}>{item.value}</Text>
      <Text style={styles.tooltipUnit}>{config.unit}</Text>
    </View>
  );

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const renderWellnessTooltip = (item) => (
    <View style={styles.tooltip}>
      <Text style={styles.tooltipValue}>{item.value}</Text>
      <Text style={styles.tooltipUnit}>score</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
      }
    >


      {/* Time Range Toggle — unified for all charts */}
      <View style={styles.timeRangeContainer}>
        {TIME_RANGES.map((range) => {
          const isActive = timeRange === range.key;
          return (
            <AnimatedPressable
              key={range.key}
              style={[styles.timeRangeButton, isActive && styles.timeRangeButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(range.key);
              }}
              accessibilityLabel={`Show ${range.label} data`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.timeRangeText, isActive && styles.timeRangeTextActive]}>
                {range.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Date Navigator for 1D mode */}
      {timeRange === '1D' && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg }}>
          <TouchableOpacity 
            onPress={() => setSelectedDate1D(d => new Date(d.getTime() - 86400000))}
            style={{ padding: SPACING.sm, backgroundColor: COLORS.card, borderRadius: RADII.full, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}
          >
            <Feather name="chevron-left" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, minWidth: 120, textAlign: 'center' }}>
            {selectedDate1D.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          <TouchableOpacity 
            onPress={() => setSelectedDate1D(d => new Date(d.getTime() + 86400000))}
            disabled={selectedDate1D.toDateString() === new Date().toDateString()}
            style={{ padding: SPACING.sm, backgroundColor: selectedDate1D.toDateString() === new Date().toDateString() ? 'transparent' : COLORS.card, borderRadius: RADII.full, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: selectedDate1D.toDateString() === new Date().toDateString() ? 0 : 2 }}
          >
            <Feather name="chevron-right" size={24} color={selectedDate1D.toDateString() === new Date().toDateString() ? COLORS.border : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {!hasEnoughData ? (
        /* Smart Empty State */
        <GlassCard style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Gathering Baseline Data</Text>
          <Text style={styles.emptySubtitle}>
            {3 - history.length} more day{3 - history.length !== 1 ? 's' : ''} of scans
            needed to build {displayName}'s Wellness Trend.
          </Text>

          {/* Gamified progress */}
          <View style={styles.progressDots}>
            {[1, 2, 3].map((day) => (
              <View
                key={day}
                style={[
                  styles.progressDot,
                  day <= history.length && styles.progressDotFilled,
                ]}
              >
                {day <= history.length && (
                  <Feather name="check" size={14} color={COLORS.white} />
                )}
              </View>
            ))}
          </View>
          <Text style={styles.progressLabel}>
            {history.length}/3 scans completed
          </Text>
        </GlassCard>
      ) : (
        <>
          {/* 7-Day Wellness Graph */}
          <GlassCard style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Wellness Index</Text>
            {refreshing ? (
              <GlassSkeleton height={150} />
            ) : (
              <LineChart
                data={wellnessData}
                data2={baselineData}
                height={150}
                width={280}
                spacing={42}
                initialSpacing={10}
                color={COLORS.primary500}
                color2={COLORS.textMuted}
                thickness={3}
                thickness2={1}
                dataPointsColor={COLORS.primary500}
                dataPointsRadius={5}
                dashWidth={4}
                dashGap={4}
                strokeDashArray2={[6, 4]}
                textColor={COLORS.textSecondary}
                textFontSize={10}
                yAxisColor={COLORS.border}
                xAxisColor={COLORS.border}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                hideRules
                curved
                areaChart
                startFillColor={COLORS.primary500 + '20'}
                endFillColor={COLORS.primary500 + '05'}
                noOfSections={4}
                maxValue={100}
                focusEnabled
                showStripOnFocus
                showTextOnFocus
                stripColor={COLORS.primary500 + '15'}
                stripWidth={2}
                unFocusOnPressOut
                focusedDataPointColor={COLORS.primary500}
                focusedDataPointRadius={7}
              />
            )}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: COLORS.primary500 }]} />
                <Text style={styles.legendText}>Daily Score</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: COLORS.textMuted, borderStyle: 'dashed' }]} />
                <Text style={styles.legendText}>30-Day Baseline</Text>
              </View>
            </View>
          </GlassCard>

          {/* Metric Toggle + Chart */}
          <View style={{ marginTop: SPACING.xl }}>
            <Text style={styles.sectionTitle}>Vital Metrics</Text>
            <MetricToggle selected={selectedMetric} onSelect={setSelectedMetric} />
          </View>

          <GlassCard style={[styles.chartCard, { marginTop: SPACING.md }]}>
            <Text style={styles.chartLabel}>{config.label} ({config.unit})</Text>
            <Text style={styles.chartHint}>Tap any point to inspect</Text>
            {refreshing ? (
              <GlassSkeleton height={150} />
            ) : (
              <LineChart
                data={chartData}
                height={150}
                width={280}
                spacing={42}
                initialSpacing={10}
                color={config.color}
                thickness={3}
                dataPointsColor={config.color}
                dataPointsRadius={5}
                textColor={COLORS.textSecondary}
                textFontSize={10}
                yAxisColor={COLORS.border}
                xAxisColor={COLORS.border}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                hideRules
                curved
                areaChart
                startFillColor={config.color + '20'}
                endFillColor={config.color + '05'}
                noOfSections={4}
                focusEnabled
                showStripOnFocus
                showTextOnFocus
                stripColor={config.color + '15'}
                stripWidth={2}
                unFocusOnPressOut
                focusedDataPointColor={config.color}
                focusedDataPointRadius={7}
              />
            )}
          </GlassCard>

          {/* Autonomic Gauge */}
          <View style={{ marginTop: SPACING.xl }}>
            <AutonomicGauge lfHfRatio={latestLfHf} profileName={displayName} />
          </View>
        </>
      )}

      {/* Export Button */}
      <AnimatedPressable
        style={styles.exportButton}
        onPress={handleExport}
        accessibilityLabel="Generate Doctor's Report"
      >
        <Feather name="file-text" size={18} color={COLORS.white} />
        <Text style={styles.exportText}>Generate Doctor's Report</Text>
      </AnimatedPressable>
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
    marginBottom: SPACING.lg,
  },
  // Time range toggle
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.divider,
    borderRadius: RADII.md,
    padding: 3,
    marginBottom: SPACING.xl,
  },
  timeRangeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADII.sm,
    minHeight: MIN_TAP_TARGET,
  },
  timeRangeButtonActive: {
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  timeRangeTextActive: {
    color: COLORS.primary500,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chartCard: {
    padding: SPACING.xl,
  },
  chartLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  chartHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  // Tooltip
  tooltip: {
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    alignItems: 'center',
  },
  tooltipValue: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  tooltipUnit: {
    color: COLORS.white + 'AA',
    fontSize: 10,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginTop: SPACING.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary900,
    borderRadius: RADII.md,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.xxl,
    minHeight: MIN_TAP_TARGET,
  },
  exportText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  progressDots: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  progressDotFilled: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
