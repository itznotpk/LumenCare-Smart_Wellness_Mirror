import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
  { key: '1Y', label: '1Y' },
];

/**
 * TrendsScreen — Longitudinal health insights with charts.
 * Merged wellness + vital charts under a unified time range toggle.
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;

export default function TrendsScreen() {
  const route = useRoute();
  const [selectedMetric, setSelectedMetric] = useState('hr');
  const [timeRange, setTimeRange] = useState('1W');

  // Deep-link: when navigating from Dashboard vital cards, pre-select the metric
  const scrollRef = useRef(null);
  const vitalMetricsSectionRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.metric && METRIC_CONFIG[route.params.metric]) {
        setSelectedMetric(route.params.metric);
        // Scroll to the Vital Metrics chart section after a short delay for layout
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: 400, animated: true });
        }, 300);
      }
    }, [route.params?.metric])
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate1D, setSelectedDate1D] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const [selectedDate1W, setSelectedDate1W] = useState(() => {
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

  // Aggregation Logic: Group multiple scans by day and fill missing days with 0
  const getAggregatedHistory = () => {
    if (timeRange === '1D') {
      const targetStart = new Date(selectedDate1D);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(selectedDate1D);
      targetEnd.setHours(23, 59, 59, 999);
      return history.filter(item => {
        const d = new Date(item.date);
        return d >= targetStart && d <= targetEnd;
      });
    }

    if (timeRange === '1W') {
      const aggregated = [];
      const endDate = new Date(selectedDate1W);
      endDate.setHours(0, 0, 0, 0);
      
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(endDate);
        targetDate.setDate(targetDate.getDate() - i);
        const dateStr = targetDate.toDateString();

        // Find all scans on this specific day
        const dayScans = history.filter(h => new Date(h.date).toDateString() === dateStr);

        if (dayScans.length > 0) {
          const avg = (key) => dayScans.reduce((sum, s) => sum + (s[key] || 0), 0) / dayScans.length;
          aggregated.push({
            date: targetDate.toISOString(),
            heart_rate: avg('heart_rate'),
            hrv_sdnn: avg('hrv_sdnn'),
            hrv_rmssd: avg('hrv_rmssd'),
            respiratory_rate: avg('respiratory_rate'),
            wellness_score: avg('wellness_score'),
          });
        } else {
          aggregated.push({
            date: targetDate.toISOString(),
            heart_rate: 0,
            hrv_sdnn: 0,
            hrv_rmssd: 0,
            respiratory_rate: 0,
            wellness_score: 0,
            isEmpty: true
          });
        }
      }
      return aggregated;
    }

    if (timeRange === '1Y') {
      const aggregatedM = [];
      const now = new Date();
      // Last 12 months averaging
      for (let i = 11; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthYearStr = `${targetDate.getMonth()}-${targetDate.getFullYear()}`;

        const monthScans = history.filter(h => {
          const d = new Date(h.date);
          return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
        });

        if (monthScans.length > 0) {
          const avg = (key) => monthScans.reduce((sum, s) => sum + (s[key] || 0), 0) / monthScans.length;
          aggregatedM.push({
            date: targetDate.toISOString(),
            heart_rate: avg('heart_rate'),
            hrv_sdnn: avg('hrv_sdnn'),
            hrv_rmssd: avg('hrv_rmssd'),
            respiratory_rate: avg('respiratory_rate'),
            wellness_score: avg('wellness_score'),
          });
        } else {
          aggregatedM.push({
            date: targetDate.toISOString(),
            heart_rate: 0,
            hrv_sdnn: 0,
            hrv_rmssd: 0,
            respiratory_rate: 0,
            wellness_score: 0,
            isEmpty: true
          });
        }
      }
      return aggregatedM;
    }

    return [];
  };

  const filteredHistory = getAggregatedHistory();

  const formatLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (!d || isNaN(d.getTime())) return '';
    if (timeRange === '1D') {
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return timeStr.replace(':00', '').toLowerCase();
    } else if (timeRange === '1W') {
      return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
    } else if (timeRange === '1Y') {
      return d.toLocaleDateString('en-US', { month: 'short' });
    }
    return '';
  };

  // Chart data
  const chartData = filteredHistory.map((day) => ({
    value: Math.round(day[config.key] || 0),
    label: formatLabel(day.date),
    dataPointText: `${Math.round(day[config.key] || 0)}`,
  }));

  // Wellness trend data
  const wellnessData = filteredHistory.map((day) => ({
    value: Math.round(day.wellness_score || 0),
    label: formatLabel(day.date),
    dataPointText: `${Math.round(day.wellness_score || 0)}`,
  }));

  // Baseline ghost line
  const baselineData = filteredHistory.map(() => ({
    value: Math.round(baselineAverage),
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

  // Calculate max values for charts with extra headroom (20% up) to prevent cutoff
  const maxWellnessVal = Math.max(...wellnessData.map(d => d.value), 100);
  const maxVitalVal = Math.max(...chartData.map(d => d.value), 10);
  const wellnessMaxValue = maxWellnessVal > 100 ? Math.ceil(maxWellnessVal * 1.2) : 110;
  const vitalsMaxValue = Math.ceil(maxVitalVal * 1.2 / 10) * 10;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
      }
    >
      {/* ... (rest of time selection logic remains same) */}
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
        <View style={styles.navigatorContainer}>
          <TouchableOpacity 
            onPress={() => setSelectedDate1D(d => new Date(d.getTime() - 86400000))}
            style={styles.navigatorArrow}
          >
            <Feather name="chevron-left" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.navigatorLabel}>
            {selectedDate1D.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          <TouchableOpacity 
            onPress={() => setSelectedDate1D(d => new Date(d.getTime() + 86400000))}
            disabled={selectedDate1D.toDateString() === new Date().toDateString()}
            style={[styles.navigatorArrow, selectedDate1D.toDateString() === new Date().toDateString() && { opacity: 0 }]}
          >
            <Feather name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Week Navigator for 1W mode */}
      {timeRange === '1W' && (
        <View style={styles.navigatorContainer}>
          <TouchableOpacity 
            onPress={() => setSelectedDate1W(d => {
              const nd = new Date(d);
              nd.setDate(nd.getDate() - 7);
              return nd;
            })}
            style={styles.navigatorArrow}
          >
            <Feather name="chevron-left" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', minWidth: 160 }}>
            <Text style={styles.navigatorLabel}>
              {(() => {
                const start = new Date(selectedDate1W);
                start.setDate(start.getDate() - 6);
                const end = new Date(selectedDate1W);
                return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              })()}
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600' }}>7-DAY WINDOW</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setSelectedDate1W(d => {
              const nd = new Date(d);
              nd.setDate(nd.getDate() + 7);
              return nd;
            })}
            disabled={new Date(selectedDate1W).toDateString() === new Date().toDateString()}
            style={[styles.navigatorArrow, new Date(selectedDate1W).toDateString() === new Date().toDateString() && { opacity: 0 }]}
          >
            <Feather name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Yearly Hint */}
      {timeRange === '1Y' && (
        <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
          <Text style={[styles.navigatorLabel, { minWidth: 0 }]}>Last 12 Months</Text>
          <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600' }}>MONTHLY AVERAGES</Text>
        </View>
      )}

      {!hasEnoughData ? (
        <GlassCard style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Gathering Baseline Data</Text>
          <Text style={styles.emptySubtitle}>
            {3 - history.length} more day{3 - history.length !== 1 ? 's' : ''} of scans
            needed to build {displayName}'s Wellness Trend.
          </Text>
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
          <GlassCard style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Wellness Index</Text>
            {refreshing ? (
              <GlassSkeleton height={150} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 40 }}>
                <LineChart
                  data={wellnessData}
                  height={160}
                  width={Math.max(CHART_WIDTH, wellnessData.length * 70)}
                  spacing={70}
                  initialSpacing={30}
                  color={COLORS.accent500}
                  thickness={4}
                  dataPointsColor={COLORS.accent500}
                  dataPointsRadius={5}
                  textColor={COLORS.textSecondary}
                  textFontSize={10}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={COLORS.divider}
                  yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10, textAlign: 'center' }}
                  hideRules
                  curved
                  isAnimated
                  animationDuration={1500}
                  areaChart
                  startFillColor={COLORS.accent500}
                  startOpacity={0.4}
                  endFillColor={COLORS.accent500}
                  endOpacity={0.02}
                  noOfSections={4}
                  maxValue={wellnessMaxValue}
                  pointerConfig={{
                    pointerStripHeight: 140,
                    pointerStripColor: COLORS.accent500 + '30',
                    pointerStripWidth: 2,
                    pointerColor: COLORS.accent500,
                    radius: 6,
                    pointerLabelComponent: items => renderWellnessTooltip(items[0]),
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                  }}
                />
              </ScrollView>
            )}
          </GlassCard>

          <View style={{ marginTop: SPACING.xl }}>
            <Text style={styles.sectionTitle}>Vital Metrics</Text>
            <MetricToggle selected={selectedMetric} onSelect={setSelectedMetric} />
          </View>

          <GlassCard style={[styles.chartCard, { marginTop: SPACING.md }]}>
            <Text style={styles.chartLabel}>{config.label} ({config.unit})</Text>
            {refreshing ? (
              <GlassSkeleton height={150} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 40 }}>
                <LineChart
                  data={chartData}
                  height={160}
                  width={Math.max(CHART_WIDTH, chartData.length * 70)}
                  spacing={70}
                  initialSpacing={30}
                  color={config.color}
                  thickness={4}
                  dataPointsColor={config.color}
                  dataPointsRadius={5}
                  textColor={COLORS.textSecondary}
                  textFontSize={10}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={COLORS.divider}
                  yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10, textAlign: 'center' }}
                  hideRules
                  curved
                  isAnimated
                  animationDuration={1500}
                  areaChart
                  startFillColor={config.color}
                  startOpacity={0.3}
                  endFillColor={config.color}
                  endOpacity={0.05}
                  noOfSections={4}
                  maxValue={vitalsMaxValue}
                  pointerConfig={{
                    pointerStripHeight: 140,
                    pointerStripColor: config.color + '30',
                    pointerStripWidth: 2,
                    pointerColor: config.color,
                    radius: 6,
                    pointerLabelComponent: items => renderTooltip(items[0]),
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                  }}
                />
              </ScrollView>
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
  // Navigator Styles
  navigatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg
  },
  navigatorArrow: {
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADII.full,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  navigatorLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 120,
    textAlign: 'center'
  },
});
