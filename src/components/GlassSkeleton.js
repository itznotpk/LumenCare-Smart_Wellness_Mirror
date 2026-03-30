import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { RADII, SHADOWS } from '../theme';

export default function GlassSkeleton({ style, width = '100%', height = 100, borderRadius = RADII.lg }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, { width, height, borderRadius }, style, animatedStyle]}>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill}>
        <View style={styles.frost} />
      </BlurView>
      {/* Glossy Overlay */}
      <View style={[StyleSheet.absoluteFill, styles.glassOverlay, { borderRadius }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 6,
    ...SHADOWS.card,
  },
  frost: {
    flex: 1,
    backgroundColor: 'rgba(200, 215, 240, 0.2)',
  },
  glassOverlay: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
});
