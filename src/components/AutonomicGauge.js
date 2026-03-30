import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import GlassCard from './GlassCard';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../theme';

/**
 * AutonomicGauge — Half-donut chart for LF/HF autonomic balance.
 */
export default function AutonomicGauge({ lfHfRatio = 1.0, profileName = 'Dad' }) {
  const SIZE = 200;
  const STROKE_WIDTH = 20;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;
  const CENTER = SIZE / 2;

  // Normalize: 0 = full parasympathetic, 1 = full sympathetic
  const normalized = Math.min(Math.max((lfHfRatio - 0.2) / 2.8, 0), 1);

  // Arc math
  const startAngle = Math.PI; // left
  const endAngle = 0; // right (top half)
  const sweepAngle = Math.PI;

  const parasAngle = startAngle + sweepAngle * normalized;

  const describeArc = (start, end) => {
    const x1 = CENTER + RADIUS * Math.cos(start);
    const y1 = CENTER + RADIUS * Math.sin(start);
    const x2 = CENTER + RADIUS * Math.cos(end);
    const y2 = CENTER + RADIUS * Math.sin(end);
    const largeArc = Math.abs(end - start) > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${RADIUS},${RADIUS} 0 ${largeArc} 1 ${x2},${y2}`;
  };

  const needleAngle = startAngle + sweepAngle * normalized;
  const needleX = CENTER + (RADIUS - STROKE_WIDTH) * Math.cos(needleAngle);
  const needleY = CENTER + (RADIUS - STROKE_WIDTH) * Math.sin(needleAngle);

  const getStatusLabel = () => {
    if (lfHfRatio < 0.7) return { text: 'Relaxed', color: COLORS.green };
    if (lfHfRatio <= 1.5) return { text: 'Balanced', color: COLORS.primary500 };
    if (lfHfRatio <= 2.2) return { text: 'Mildly Stressed', color: COLORS.yellow };
    return { text: 'Stressed', color: COLORS.red };
  };

  const getContextualSubtitle = () => {
    if (lfHfRatio < 0.7) return `${profileName}'s body is recovering well today`;
    if (lfHfRatio <= 1.5) return `${profileName}'s autonomic system looks balanced`;
    if (lfHfRatio <= 2.2) return `Mild physical stress detected — monitor ${profileName}`;
    return `High physical stress detected — check on ${profileName}`;
  };

  const status = getStatusLabel();

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Autonomic Balance</Text>
      <Text style={styles.subtitle}>Sympathetic vs. Parasympathetic</Text>

      <View style={styles.gaugeContainer}>
        <Svg width={SIZE} height={SIZE / 2 + 20} viewBox={`0 ${SIZE / 2 - RADIUS - STROKE_WIDTH} ${SIZE} ${SIZE / 2 + 20}`}>
          {/* Background arc */}
          <Path
            d={describeArc(startAngle, endAngle)}
            stroke={COLORS.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          {/* Sympathetic arc */}
          <Path
            d={describeArc(startAngle, Math.min(parasAngle, endAngle + 0.01))}
            stroke={COLORS.green}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          {normalized > 0.5 && (
            <Path
              d={describeArc(startAngle + sweepAngle * 0.5, Math.min(parasAngle, endAngle + 0.01))}
              stroke={COLORS.yellow}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
            />
          )}
          {/* Needle dot */}
          <SvgCircle cx={needleX} cy={needleY} r={6} fill={status.color} />
          <SvgCircle cx={needleX} cy={needleY} r={3} fill={COLORS.white} />
        </Svg>

        <View style={styles.centerValue}>
          <Text style={[styles.ratio, { color: status.color }]}>
            {lfHfRatio.toFixed(1)}
          </Text>
          <Text style={[styles.ratioLabel, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <View style={[styles.contextBanner, { backgroundColor: status.color + '12' }]}>
        <Text style={[styles.contextText, { color: status.color === COLORS.green ? '#19612A' : status.color === COLORS.primary500 ? COLORS.primary900 : status.color === COLORS.yellow ? '#7A4700' : '#7A130D' }]}>
          {getContextualSubtitle()}
        </Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Parasympathetic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.yellow }]} />
          <Text style={styles.legendText}>Sympathetic</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  gaugeContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  centerValue: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  ratio: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
  },
  ratioLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contextBanner: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
    alignItems: 'center',
  },
  contextText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
