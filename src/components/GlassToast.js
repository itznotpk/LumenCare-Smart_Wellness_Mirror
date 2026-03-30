import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../store/useToastStore';
import { COLORS, RADII, SHADOWS, FONT_SIZES, SPACING } from '../theme';

const { width } = Dimensions.get('window');

/**
 * GlassToast — A truly modern global notification replacement for Alert.alert.
 * iOS slides from Top. Android/Web slides from Bottom.
 */
export default function GlassToast() {
  const toast = useToastStore((s) => s.toast);
  const hideToast = useToastStore((s) => s.hideToast);

  const translateY = useSharedValue(Platform.OS === 'ios' ? -150 : 150);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      // Trigger native physical feedback based on OS and type
      if (Platform.OS !== 'web') {
        if (toast.type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (toast.type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }

      // Slide In
      opacity.value = withTiming(1, { duration: 150 });
      translateY.value = withSpring(Platform.OS === 'ios' ? 55 : -40, {
        damping: 15,
        stiffness: 120,
      });

      // Auto Dismiss after 3 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      // Slide Out (if called manually)
      dismiss();
    }
  }, [toast]);

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(Platform.OS === 'ios' ? -150 : 150, {
      damping: 15,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    // Stick to top for iOS, bottom for Android/Web depending on architecture
    ...(Platform.OS === 'ios' ? { top: 0 } : { bottom: 0 }),
  }));

  if (!toast && opacity.value === 0) return null; // Unmount if dead

  const getIcon = () => {
    switch (toast?.type) {
      case 'success':
        return <Feather name="check-circle" size={20} color={COLORS.green} />;
      case 'error':
        return <Feather name="alert-triangle" size={20} color={COLORS.red} />;
      default:
        return <Feather name="info" size={20} color={COLORS.primary500} />;
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={styles.glassContainer}>
        <BlurView intensity={70} style={StyleSheet.absoluteFillContainer} />
        <View style={[StyleSheet.absoluteFill, styles.glassRelief]} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>{getIcon()}</View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{toast?.title}</Text>
            {!!toast?.message && <Text style={styles.message}>{toast.message}</Text>}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999, // Guarantee it sits over absolutely everything
    paddingHorizontal: SPACING.lg,
  },
  glassContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...SHADOWS.cardLarge,
    elevation: 15, // Higher elevation for Android overlap
  },
  glassRelief: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: RADII.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    zIndex: 2,
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  message: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
