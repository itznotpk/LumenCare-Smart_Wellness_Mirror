import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator, TouchableOpacity, Platform, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';
import GlassCard from './GlassCard';
import { Video, Audio, ResizeMode } from 'expo-av';

export default function MirrorInteractionLoop({ profileId, refreshKey }) {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('Audio setup error:', e);
      }
    };
    setupAudio();
  }, []);

  const fetchInteractions = async (currentProfileId) => {
    if (!currentProfileId) return;
    setInteractions([]);
    setLoading(true);

    // 1. Fetch Drops
    const { data: drops } = await supabase
      .from('daily_drops')
      .select('*, mirror_reactions(*)')
      .eq('elderly_id', currentProfileId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 2. Fetch Standalone Reactions (those with NO related_drop_id)
    const { data: standaloneReactions } = await supabase
      .from('mirror_reactions')
      .select('*')
      .eq('elderly_id', currentProfileId)
      .is('related_drop_id', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // If profileId changed while fetching, ignore this result to prevent race conditions
    if (currentProfileId !== profileId) return;

    // 3. Merge and Sort chronologically
    let combined = [...(drops || []), ...(standaloneReactions || [])];
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setInteractions(combined.slice(0, 15));
    setLoading(false);
  };

  useEffect(() => {
    if (!profileId) return;
    
    fetchInteractions(profileId);

    const channelName = `mirror_realtime_${profileId}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_drops', filter: `elderly_id=eq.${profileId}` }, () => {
        if (profileId) fetchInteractions(profileId);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mirror_reactions', filter: `elderly_id=eq.${profileId}` }, () => {
        if (profileId) fetchInteractions(profileId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, refreshKey]);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
  };

  if (loading && interactions.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={COLORS.primary500} />
      </View>
    );
  }

  const renderItem = ({ item, index }) => {
    const isReaction = !item.media_type && item.reaction_type;
    const reaction = isReaction ? item : (item.mirror_reactions && item.mirror_reactions[0]);

    // Grouping by date logic
    const showDateHeader = index === 0 || 
      new Date(interactions[index - 1].created_at).toDateString() !== new Date(item.created_at).toDateString();

    const dateLabel = (dateStr) => {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return 'TODAY';
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
    };

    if (isReaction) {
      return (
        <View style={{ width: '100%' }}>
          {showDateHeader && (
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{dateLabel(item.created_at)}</Text>
            </View>
          )}
          <View style={styles.aiEventContainer}>
            <View style={styles.aiEventPill}>
              <Text style={styles.aiEventEmoji}>
                {item.reaction_type === 'smiled' || item.reaction_type === 'smile' ? '😊' : '👋'}
              </Text>
              <Text style={styles.aiEventText}>{item.message}</Text>
              <Text style={styles.aiEventTime}>{formatTime(item.created_at)}</Text>
            </View>
          </View>
        </View>
      );
    }

    const isVideo = item.media_type === 'video';
    const mediaUrl = item.image_url; // Supabase uses image_url for both in DB if not renamed

    return (
      <View style={{ width: '100%' }}>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{dateLabel(item.created_at)}</Text>
          </View>
        )}
        
        <View style={styles.interactionContainer}>
          {/* Caregiver Drop - Card (Image/Video) or Bubble (Text Only) */}
          <View style={[styles.sentWrap, (!mediaUrl) && styles.sentWrapNoImage]}>
            <View style={[styles.dropCard, (!mediaUrl) && styles.textOnlyBubble]}>
              {mediaUrl ? (
                <View>
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => isVideo ? setFullscreenVideo(mediaUrl) : setFullscreenImage(mediaUrl)}
                  >
                    {isVideo ? (
                      <View style={styles.videoPreviewContainer}>
                        <Video
                          source={{ uri: mediaUrl }}
                          style={styles.cardImage}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isMuted={true}
                          pointerEvents="none"
                          usePoster={true}
                          posterSource={{ uri: mediaUrl }}
                          posterStyle={{ resizeMode: 'cover' }}
                          onError={(e) => console.log('Video Preview Error:', e)}
                        />
                        <View style={styles.playIconOverlay}>
                          <Feather name="play" size={32} color={COLORS.white} />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: mediaUrl }} style={styles.cardImage} resizeMode="cover" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.cardContent}>
                    {item.message_text && <Text style={styles.cardText}>{item.message_text}</Text>}
                    <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.bubbleText}>
                    {item.message_text || "Sent a drop"}
                  </Text>
                  <Text style={styles.bubbleTime}>{formatTime(item.created_at)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Linked Reply */}
          {reaction && (
            <View style={styles.replyWrap}>
              <View style={styles.replyAvatar}>
                <Text style={{ fontSize: 10 }}>👴</Text>
              </View>
              <View style={styles.replyBubble}>
                <View style={styles.replyHeader}>
                  <Feather name={reaction.reaction_type === 'speech' ? 'mic' : 'smile'} size={12} color={COLORS.primary600} />
                  <Text style={styles.replyLabel}>{reaction.reaction_type === 'speech' ? 'VOICE REPLY' : 'REACTION'}</Text>
                </View>
                <Text style={styles.replyText}>{reaction.message}</Text>
                <Text style={styles.replyTime}>{formatTime(reaction.created_at)}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mirror Conversation</Text>
      </View>

      {interactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Start the loop by sending a daily drop!</Text>
        </View>
      ) : (
        <FlatList
          data={interactions}
          keyExtractor={(item, index) => `${item.id || index}-${profileId}`}
          renderItem={renderItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Image Full-Screen Modal */}
      <Modal visible={!!fullscreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFullscreenImage(null)}>
            <Feather name="x" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Image source={{ uri: fullscreenImage }} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>

      {/* Video Full-Screen Modal */}
      <Modal visible={!!fullscreenVideo} transparent={true} animationType="slide" onRequestClose={() => setFullscreenVideo(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFullscreenVideo(null)}>
            <Feather name="x" size={24} color={COLORS.white} />
          </TouchableOpacity>
          {videoLoading && (
            <ActivityIndicator color={COLORS.white} size="large" style={{ position: 'absolute' }} />
          )}
          <Video
            source={{ uri: fullscreenVideo }}
            style={styles.modalImage}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            usePoster={true}
            posterSource={{ uri: fullscreenVideo }}
            posterStyle={{ resizeMode: 'contain' }}
            onLoadStart={() => setVideoLoading(true)}
            onLoad={() => setVideoLoading(false)}
            onError={(e) => {
              setVideoLoading(false);
              console.log('Video Modal Error:', e);
            }}
          />
        </View>
      </Modal>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 1,
  },
  interactionContainer: {
    marginBottom: SPACING.md,
    gap: 12,
  },
  videoPreviewContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  // AI Event (Amber style)
  aiEventContainer: {
    alignItems: 'center',
    marginVertical: 6,
  },
  aiEventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB', // Amber 50
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7', // Amber 200
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#D97706', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  aiEventEmoji: {
    fontSize: 14,
  },
  aiEventText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E', // Amber 800
  },
  aiEventTime: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
    opacity: 0.6,
  },
  // Caregiver Card
  sentWrap: {
    width: '100%',
  },
  sentWrapNoImage: {
    alignItems: 'flex-end',
  },
  dropCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  cardContent: {
    padding: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#334155', // Slate 700
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
  },
  // Text Only Bubble
  textOnlyBubble: {
    backgroundColor: '#EFF6FF', // Blue 50
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0,
    maxWidth: '85%',
  },
  bubbleText: {
    fontSize: 15,
    color: COLORS.primary600,
    fontWeight: '600',
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 9,
    color: COLORS.primary400,
    textAlign: 'right',
    marginTop: 2,
  },
  // Reply Bubble
  replyWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginRight: '15%',
    marginTop: -4,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  replyBubble: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  replyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  replyText: {
    fontSize: 14,
    color: '#0F172A',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  replyTime: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
