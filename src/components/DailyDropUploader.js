import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET } from '../theme';
import { supabase } from '../lib/supabase';

const MAX_VIDEO_DURATION_SEC = 60; // hard cap at 60s for storage/bandwidth

/**
 * DailyDropUploader — Modern social-media style media composer.
 * Supports both images AND short videos (20-50s) for the Smart Wellness Mirror.
 */
export default function DailyDropUploader({ profileId, onUpload }) {
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null); // { uri, type: 'image'|'video', mimeType, duration }
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef(null);

  const isVideo = selectedMedia?.type === 'video';

  const pickMedia = async (useCamera = false) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your camera.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      });
      if (!result.canceled && result.assets[0]) {
        handleMediaSelected(result.assets[0]);
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
        videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      });
      if (!result.canceled && result.assets[0]) {
        handleMediaSelected(result.assets[0]);
      }
    }
  };

  const handleMediaSelected = (asset) => {
    // Validate video duration
    if (asset.type === 'video' && asset.duration) {
      const durationSec = asset.duration / 1000; // expo returns ms
      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        Alert.alert(
          'Video Too Long',
          `Please select a video under ${MAX_VIDEO_DURATION_SEC} seconds. Your video is ${Math.round(durationSec)}s.`
        );
        return;
      }
    }
    setSelectedMedia({
      uri: asset.uri,
      type: asset.type || 'image',
      mimeType: asset.mimeType || null,
      duration: asset.duration || null,
    });
  };

  const removeMedia = () => setSelectedMedia(null);

  /**
   * Determine the correct MIME content-type for Supabase storage upload.
   */
  const getContentType = (media) => {
    if (media.mimeType) return media.mimeType;
    const ext = (media.uri.split('.').pop() || '').toLowerCase();
    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
      mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
      mkv: 'video/x-matroska', webm: 'video/webm',
    };
    return mimeMap[ext] || (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
  };

  const handleSend = async () => {
    if (!selectedMedia && !message.trim()) {
      Alert.alert('Nothing to send', 'Please select a photo/video or type a message.');
      return;
    }
    setUploading(true);

    try {
      let mediaUrl = null;
      let mediaType = 'text'; // default if no media attached

      if (supabase && selectedMedia) {
        const ext = selectedMedia.uri.split('.').pop() || (selectedMedia.type === 'video' ? 'mp4' : 'jpg');
        const fileName = `${profileId}/${Date.now()}.${ext}`;

        // Convert local file URI to a blob for Supabase storage
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () { resolve(xhr.response); };
          xhr.onerror = function () { reject(new Error('Failed to convert media to blob')); };
          xhr.responseType = 'blob';
          xhr.open('GET', selectedMedia.uri, true);
          xhr.send(null);
        });

        const contentType = getContentType(selectedMedia);

        const { data: storageData, error: storageErr } = await supabase.storage
          .from('daily_drops')
          .upload(fileName, blob, {
            contentType,
            upsert: false,
          });

        if (storageErr) throw storageErr;

        const { data: urlData } = supabase.storage
          .from('daily_drops')
          .getPublicUrl(storageData.path);
        mediaUrl = urlData?.publicUrl || null;
        mediaType = selectedMedia.type || 'image';
      }

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        const { error: dbErr } = await supabase.from('daily_drops').insert({
          caregiver_id: user?.id,
          elderly_id: profileId,
          image_url: mediaUrl,
          message_text: message.trim() || null,
          media_type: mediaType, // 'image', 'video', or 'text'
        });
        if (dbErr) throw dbErr;
      }

      onUpload?.({
        uri: selectedMedia?.uri,
        message: message.trim(),
        type: selectedMedia?.type || 'text',
      });

      setSelectedMedia(null);
      setMessage('');
      Alert.alert(
        'Sent! 🎉',
        selectedMedia?.type === 'video'
          ? 'Your video will play on the mirror to greet your loved one!'
          : 'Your message will appear on the mirror.'
      );
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
          <Text style={styles.subtitle}>Send a photo, video, or message to the mirror</Text>
        </View>
      </View>

      {/* Media Preview — Image or Video */}
      {selectedMedia && (
        <View style={styles.previewContainer}>
          {isVideo ? (
            <View>
              <Video
                ref={videoRef}
                source={{ uri: selectedMedia.uri }}
                style={styles.preview}
                resizeMode="cover"
                shouldPlay={false}
                isLooping={false}
                useNativeControls
              />
              {/* Video badge */}
              <View style={styles.videoBadge}>
                <Feather name="film" size={12} color={COLORS.white} />
                <Text style={styles.videoBadgeText}>
                  {selectedMedia.duration
                    ? `${Math.round(selectedMedia.duration / 1000)}s`
                    : 'Video'}
                </Text>
              </View>
            </View>
          ) : (
            <Image source={{ uri: selectedMedia.uri }} style={styles.preview} />
          )}
          <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
            <Feather name="x" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modern Composer */}
      <View style={styles.composerContainer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Type a message for your loved one..."
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
          <AnimatedPressable style={styles.mediaButton} onPress={() => pickMedia(true)}>
            <Feather name="camera" size={20} color={COLORS.primary500} />
            <Text style={styles.mediaButtonLabel}>Camera</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.mediaButton} onPress={() => pickMedia(false)}>
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

      {/* Hint */}
      <Text style={styles.hint}>
        💡 Short videos (20-50s) work best — they attract your loved one to the mirror for a daily vitals scan!
      </Text>
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
    height: 180,
    borderRadius: RADII.md,
    backgroundColor: '#000',
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
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.sm,
  },
  videoBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
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
  hint: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
