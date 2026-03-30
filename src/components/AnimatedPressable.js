import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * AnimatedPressable — An iOS-style, physics-based tactile button wrapper.
 * Instead of instantly flashing opacity on press, it smoothly shrinks down
 * and springs back up to create a buttery, weighty tactile feel.
 */
const AnimatedPress = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressable({
  children,
  onPress,
  style,
  disabled = false,
  scaleDownTo = 0.94,
  ...props
}) {
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isPressed.value ? scaleDownTo : 1, {
            damping: 15,
            stiffness: 300,
            mass: 0.5,
          }),
        },
      ],
      opacity: withTiming(isPressed.value ? 0.75 : 1, { duration: 100 }),
    };
  });

  return (
    <AnimatedPress
      {...props}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) isPressed.value = true;
      }}
      onPressOut={() => {
        if (!disabled) isPressed.value = false;
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPress>
  );
}
