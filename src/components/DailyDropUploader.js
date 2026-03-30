import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET } from '../theme';
import { supabase } from '../lib/supabase';

/**
 * DailyDropUploader — Modern social-media style media composer.
 */
export default function DailyDropUploader({ profileId, onUpload }) {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (useCamera = false) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your camera.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    }
  };

  const removeImage = () => setSelectedImage(null);

  const handleSend = async () => {
    if (!selectedImage && !message.trim()) {
      Alert.alert('Nothing to send', 'Please select a photo or type a message.');
      return;
    }
    setUploading(true);

    try {
      let mediaUrl = null;

      if (supabase && selectedImage) {
        const ext = selectedImage.uri.split('.').pop() || 'jpg';
        const fileName = `${profileId}/${Date.now()}.${ext}`;

        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() { resolve(xhr.response); };
          xhr.onerror = function() { reject(new Error('Failed to convert image to blob')); };
          xhr.responseType = 'blob';
          xhr.open('GET', selectedImage.uri, true);
          xhr.send(null);
        });

        const { data: storageData, error: storageErr } = await supabase.storage
          .from('daily_drops')
          .upload(fileName, blob, {
            contentType: selectedImage.mimeType || `image/${ext}`,
            upsert: false,
          });

        if (storageErr) throw storageErr;

        const { data: urlData } = supabase.storage
          .from('daily_drops')
          .getPublicUrl(storageData.path);
        mediaUrl = urlData?.publicUrl || null;
      }

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error: dbErr } = await supabase.from('daily_drops').insert({
          caregiver_id: user?.id,
          elderly_id: profileId,
          image_url: mediaUrl,
          message_text: message.trim() || null,
        });
        if (dbErr) throw dbErr;
      }

      onUpload?.({
        uri: selectedImage?.uri,
        message: message.trim(),
        type: selectedImage?.type || 'text',
      });

      setSelectedImage(null);
      setMessage('');
      Alert.alert('Sent! 🎉', 'Your message will appear on the mirror.');
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Upload Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>

        <View>
          <Text style={styles.title}>Daily Drop</Text>
          <Text style={styles.subtitle}>Send something special to the mirror</Text>
        </View>
      </View>

      {/* Image Preview */}
      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.preview} />
          <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
            <Feather name="x" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modern Composer */}
      <View style={styles.composerContainer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Type a message for Dad..."
          placeholderTextColor={COLORS.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={200}
        />
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.mediaButtons}>
          <AnimatedPressable style={styles.mediaButton} onPress={() => pickImage(true)}>
            <Feather name="camera" size={20} color={COLORS.primary500} />
            <Text style={styles.mediaButtonLabel}>Camera</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.mediaButton} onPress={() => pickImage(false)}>
            <Feather name="image" size={20} color={COLORS.primary500} />
            <Text style={styles.mediaButtonLabel}>Gallery</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          style={[styles.sendButton, uploading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={uploading}
        >
          <Feather name="send" size={18} color={COLORS.white} />
          <Text style={styles.sendText}>{uploading ? 'Sending...' : 'Send'}</Text>
        </AnimatedPressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },

  // Preview
  previewContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: RADII.md,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Composer
  composerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  composerInput: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    minHeight: 56,
    textAlignVertical: 'top',
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary50,
    minHeight: MIN_TAP_TARGET,
  },
  mediaButtonLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary500,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary500,
    borderRadius: RADII.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    minHeight: MIN_TAP_TARGET,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
