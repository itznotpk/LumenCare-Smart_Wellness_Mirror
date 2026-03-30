import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS } from '../theme';

/**
 * GlassCard — the foundation for all major UI panels.
 * Now features integrated "Hover & Touch Physics". Every card feels alive
 * when tapped, hovered, or swiped, shrinking/highlighting dynamically.
 */
export default function GlassCard({ children, style, intensity = 60, tint = 'light', onPress }) {
  const isActive = useSharedValue(false);
  const isHovered = useSharedValue(false);

  // Buttery-smooth physics for scale, shadow depth, and frosted highlight
  const animatedCardStyle = useAnimatedStyle(() => {
    // Mobile touch presses scale down (squish), Web hovers scale up (float).
    const scaleTo = isActive.value ? 0.96 : isHovered.value ? 1.02 : 1;
    
    return {
      transform: [
        {
          scale: withSpring(scaleTo, {
            damping: 15,
            stiffness: 250,
            mass: 0.6,
          }),
        },
      ],
      // Shadows become deeper globally if hovered, flatter if pressed
      shadowOpacity: withTiming(isActive.value ? 0.05 : isHovered.value ? 0.2 : 0.12, { duration: 150 }),
      shadowRadius: withTiming(isActive.value ? 10 : isHovered.value ? 40 : 30, { duration: 150 }),
      elevation: withTiming(isActive.value ? 2 : isHovered.value ? 12 : 6, { duration: 150 }),
    };
  });

  const animatedHighlightOverlay = useAnimatedStyle(() => {
    // Smoothly transition the "frost" intensity
    return {
      backgroundColor: withTiming(
        isActive.value ? 'rgba(255, 255, 255, 0.6)' : isHovered.value ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.45)', 
        { duration: 150 }
      ),
      borderColor: withTiming(
        isActive.value ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)', 
        { duration: 150 }
      )
    };
  });

  return (
    <Pressable
      onPress={onPress}
      // Touch interactions (Mobile + Web click)
      onPressIn={() => (isActive.value = true)}
      onPressOut={() => (isActive.value = false)}
      // Hover interactions (Web/Desktop specific)
      onHoverIn={() => (isHovered.value = true)}
      onHoverOut={() => (isHovered.value = false)}
      // Accessibility
      accessible={!!onPress}
      disabled={isActive.value} // prevent double taps
    >
      <Animated.View style={[styles.container, style, animatedCardStyle]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[StyleSheet.absoluteFill, styles.blurLayer]}
        />
        {/* Dynamic glossy reflection overly */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.glassOverlay, animatedHighlightOverlay]} />
        {/* Content payload */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.xl,
    overflow: 'hidden',
    ...SHADOWS.cardLarge, // default diffuse shadow
    position: 'relative',
    backgroundColor: 'transparent', 
  },
  blurLayer: {
    borderRadius: RADII.xl,
  },
  glassOverlay: {
    borderWidth: 1,
    borderRadius: RADII.xl,
  },
  content: {
    zIndex: 2,
  },
});
