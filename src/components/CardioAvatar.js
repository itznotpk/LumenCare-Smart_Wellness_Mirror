import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

/**
 * CardioAvatar — A DaisyUI-inspired avatar component for Expo.
 * Supports status indicator (online/offline) and custom sizing.
 * 
 * @param {string} src - The image URL
 * @param {number} size - Diameter of the avatar
 * @param {boolean} online - Whether to show the green online indicator
 */
export default function CardioAvatar({ src, size = 96, online = true }) {
  const statusSize = Math.max(size * 0.2, 12);
  const statusPosition = size * 0.05;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.avatarWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image 
          source={{ uri: src }} 
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
      <View 
        style={[
          styles.statusIndicator, 
          { 
            width: statusSize, 
            height: statusSize, 
            borderRadius: statusSize / 2,
            backgroundColor: online ? '#22C55E' : '#94A3B8',
            bottom: statusPosition,
            right: statusPosition,
            borderWidth: Math.max(size * 0.03, 2),
            borderColor: COLORS.card || '#FFFFFF',
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrapper: {
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
});

