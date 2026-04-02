import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Video } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET, SHADOWS } from '../theme';
import { supabase } from '../lib/supabase';
import { ActivityIndicator } from 'react-native';

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

  const [processing, setProcessing] = useState(false);

  const handleMediaSelected = async (asset) => {
    // Validate video duration
    if (asset.type === 'video' && asset.duration) {
      const durationSec = asset.duration / 1000;
      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        Alert.alert(
          'Video Too Long',
          `Please select a video under ${MAX_VIDEO_DURATION_SEC} seconds. Your video is ${Math.round(durationSec)}s.`
        );
        return;
      }
    }

    let finalUri = asset.uri;
    let finalMime = asset.mimeType;

    // Convert HEIC to JPEG if needed
    if (asset.type === 'image') {
      try {
        setProcessing(true);
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [], // No transformations, just conversion
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
        finalMime = 'image/jpeg';
      } catch (e) {
        console.warn('Image manipulation error:', e);
      } finally {
        setProcessing(false);
      }
    }

    setSelectedMedia({
      uri: finalUri,
      type: asset.type || 'image',
      mimeType: finalMime || null,
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

        let binaryData;
        if (Platform.OS === 'web') {
          const response = await fetch(selectedMedia.uri);
          binaryData = await response.blob();
        } else {
          // Native iOS/Android - use hardcoded 'base64' to avoid TypeError
          const base64 = await readAsStringAsync(selectedMedia.uri, {
            encoding: 'base64',
          });
          binaryData = decode(base64);
        }

        const contentType = getContentType(selectedMedia);
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('daily_drops')
          .upload(fileName, binaryData, {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Drop</Text>
        <Text style={styles.subtitle}>Send a moment to the mirror</Text>
      </View>

      {/* Media Preview Area */}
      {selectedMedia && (
        <View style={styles.previewContainer}>
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: selectedMedia.uri }}
              style={styles.preview}
              resizeMode="cover"
              useNativeControls
            />
          ) : (
            <Image source={{ uri: selectedMedia.uri }} style={styles.preview} />
          )}
          <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
            <Feather name="x" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modern Floating Composer */}
      <View style={styles.composerWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={200}
          />
          
          <View style={styles.actionsRow}>
            <View style={styles.mediaIcons}>
              <TouchableOpacity onPress={() => pickMedia(true)} style={styles.iconButton}>
                <Feather name="camera" size={20} color={COLORS.primary500} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickMedia(false)} style={styles.iconButton}>
                <Feather name="image" size={20} color={COLORS.primary500} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sendCircle, (uploading || processing) && styles.sendDisabled]}
              onPress={handleSend}
              disabled={uploading || processing}
            >
              {uploading || processing ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Feather name="send" size={18} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: '#0F172A', // Slate 900
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  previewContainer: {
    marginBottom: SPACING.md,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    ...SHADOWS.card,
  },
  preview: {
    width: '100%',
    height: 200,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
  },
  composerWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9', // Slate 100
  },
  inputContainer: {
    padding: 6,
  },
  input: {
    fontSize: 15,
    color: '#1E293B',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  mediaIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  sendCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
