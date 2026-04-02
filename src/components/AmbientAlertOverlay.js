import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../theme';
import { useAlertStore } from '../store/useAlertStore';

/**
 * AmbientAlertOverlay — Global pulsing glow for critical safety alerts.
 * Catches the eye instantly but elegantly at screen edges.
 */
export default function AmbientAlertOverlay() {
  const activeAlert = useAlertStore((s) => s.activeAlert);
  const isActive = !!activeAlert && activeAlert.alert_status === 'active';
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.18, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.04, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(0, { duration: 500 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!isActive && opacity.value === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderColor: COLORS.red,
          borderWidth: 8,
          backgroundColor: COLORS.red,
          zIndex: 9999,
        },
        animatedStyle,
      ]}
    />
  );
}
