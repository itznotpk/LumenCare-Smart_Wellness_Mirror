import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADII, SHADOWS, ANIMATIONS } from '../theme';

/**
 * GlassCard — the foundation for all major UI panels.
 * Now features integrated "Lumen Serenity" physics. Every card feels alive
 * when tapped, hovered, or swiped, shrinking/highlighting dynamically.
 */
export default function GlassCard({ children, style, intensity = 80, tint = 'light', onPress }) {
  const isActive = useSharedValue(false);
  const isHovered = useSharedValue(false);

  const animatedCardStyle = useAnimatedStyle(() => {
    const scaleTo = isActive.value ? 0.96 : isHovered.value ? 1.02 : 1;
    
    return {
      transform: [
        {
          scale: withSpring(scaleTo, ANIMATIONS.spring),
        },
      ],
      shadowOpacity: withTiming(isActive.value ? 0.04 : isHovered.value ? 0.15 : 0.06, { duration: 200 }),
      shadowRadius: withTiming(isActive.value ? 8 : isHovered.value ? 30 : 20, { duration: 200 }),
    };
  });

  const animatedHighlightOverlay = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isActive.value ? 'rgba(255, 255, 255, 0.7)' : isHovered.value ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.5)', 
        { duration: 200 }
      ),
      borderColor: withTiming(
        isActive.value ? 'rgba(255, 255, 255, 1)' : COLORS.border, 
        { duration: 200 }
      )
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (isActive.value = true)}
      onPressOut={() => (isActive.value = false)}
      onHoverIn={() => (isHovered.value = true)}
      onHoverOut={() => (isHovered.value = false)}
      accessible={!!onPress}
      disabled={!onPress}
    >
      <Animated.View style={[styles.container, style, animatedCardStyle]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[StyleSheet.absoluteFill, styles.blurLayer]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, styles.glassOverlay, animatedHighlightOverlay]} />
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.xl,
    ...SHADOWS.cardLarge,
    position: 'relative',
    backgroundColor: 'transparent', 
  },
  blurLayer: {
    borderRadius: RADII.xl,
  },
  glassOverlay: {
    borderWidth: 1.5,
    borderRadius: RADII.xl,
  },
  content: {
    zIndex: 2,
  },
});
