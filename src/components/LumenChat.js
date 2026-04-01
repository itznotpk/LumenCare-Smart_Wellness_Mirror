import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/useProfileStore';
import { useVitalsStore } from '../store/useVitalsStore';
import { useToastStore } from '../store/useToastStore';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS } from '../theme';
import * as Haptics from 'expo-haptics';

/**
 * LumenChat — Session-based real-time conversation segment.
 * Supports "Clear History" (soft-delete via is_cleared) and 
 * conversation grouping via conversation_id.
 */
export default function LumenChat() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  const scrollViewRef = useRef(null);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const latestVitals = useVitalsStore((s) => s.latestVitals);
  const showToast = useToastStore((s) => s.showToast);
  const profile = getActiveProfile();

  // ── Fetch active conversation ──
  const fetchMessages = async () => {
    if (!profile?.id) return;
    
    // Fetch only messages that are NOT cleared for this patient
    const { data, error } = await supabase
      .from('care_chat')
      .select('*')
      .eq('elderly_id', profile.id)
      .eq('is_cleared', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[LumenChat] Fetch error:', error.message);
    } else {
      setMessages(data || []);
      // If we have messages, use the conversation_id from the latest one
      if (data && data.length > 0) {
        setActiveConversationId(data[data.length - 1].conversation_id);
      } else {
        // No active conversation, prompt for a new one on next message
        setActiveConversationId(null);
      }
    }
    setLoading(false);
  };

  // ── Subscribe to Real-time Changes ──
  useEffect(() => {
    if (!profile?.id) return;
    fetchMessages();

    const channel = supabase
      .channel(`lumen_chat_${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'care_chat',
        filter: `elderly_id=eq.${profile.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Only add if it's not cleared
          if (!payload.new.is_cleared) {
            setMessages(prev => [...prev, payload.new]);
            setActiveConversationId(payload.new.conversation_id);
          }
        } else if (payload.eventType === 'UPDATE') {
          // If it was cleared, remove from local state
          if (payload.new.is_cleared) {
            setMessages(prev => prev.filter(m => m.id !== payload.new.id));
          } else {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // ── Auto-scroll to bottom when messages update ──
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages]);

  const handleAsk = async () => {
    if (!query.trim() || isAsking || !profile) return;
    
    setIsAsking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If no active conversation, it will use the default gen_random_uuid() from DB
    // or we can generate one here to keep things grouped in memory.
    const conversationId = activeConversationId || undefined;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { data, error: insertError } = await supabase
        .from('care_chat')
        .insert({
          elderly_id: profile.id,
          caregiver_id: user.id,
          query: query.trim(),
          context_vitals_id: latestVitals?.id,
          conversation_id: conversationId, // Group with existing or start new
          is_cleared: false
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      setQuery('');
      if (!activeConversationId) setActiveConversationId(data.conversation_id);

      // Simulate AI response
      setTimeout(async () => {
        const mockResponse = `I've analyzed ${profile.first_name}'s recent history. The patterns suggest normal resting behavior. I'll continue to monitor.`;
        
        await supabase
          .from('care_chat')
          .update({ response: mockResponse })
          .eq('id', data.id);
          
        setIsAsking(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2500);

    } catch (e) {
      console.error('[LumenChat] error:', e.message);
      showToast('Error', 'Failed to send message.', 'error');
      setIsAsking(false);
    }
  };

  const handleClearHistory = async () => {
    if (!profile?.id || messages.length === 0) return;
    
    // Grab IDs of messages currently in view
    const activeIds = messages.map(m => m.id);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      'Reset Conversation?',
      'This will archive your current chat and start a fresh session.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            console.log('[LumenChat] Archiving specific IDs:', activeIds);

            // Targeted update by ID list
            const { error, count } = await supabase
              .from('care_chat')
              .update({ is_cleared: true })
              .in('id', activeIds);
            
            if (error) {
              console.error('[LumenChat] Reset error:', error.message, error.details);
              showToast('Error', 'Failed to archive chat. Check connection.', 'error');
            } else {
              console.log('[LumenChat] Successfully archived. Count:', count);
              // Optimistic UI update
              setMessages([]);
              setActiveConversationId(null);
              showToast('Chat Reset', 'Starting a new session.', 'success');
            }
          }
        }
      ]
    );
  };

  const deleteMessage = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Hard delete for individual message
    const { error } = await supabase
      .from('care_chat')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Error', 'Failed to delete message.', 'error');
    }
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={COLORS.primary500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.chatTitle}>Ask Lumen IQ</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn}>
            <Feather name="refresh-cw" size={14} color={COLORS.primary500} />
            <Text style={styles.clearText}>New Session</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.chatBox}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={32} color={COLORS.divider} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>Start a new session by asking a question about {profile?.first_name}.</Text>
            </View>
          ) : (
            messages.map((m, i) => (
              <TouchableOpacity 
                key={m.id || i}
                onLongPress={() => {
                  Alert.alert('Delete message?', 'Remove from history?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(m.id) }
                  ]);
                }}
              >
                {/* User Message */}
                <View style={styles.userMessageWrap}>
                  <View style={styles.userMessageBubble}>
                    <Text style={styles.userMessageText}>{m.query}</Text>
                  </View>
                </View>

                {/* AI Response */}
                {m.response ? (
                  <View style={styles.aiMessageWrap}>
                    <View style={styles.aiAvatar}>
                      <Feather name="cpu" size={14} color={COLORS.white} />
                    </View>
                    <View style={styles.aiMessageBubble}>
                      <Text style={styles.aiMessageText}>{m.response}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.aiMessageWrap}>
                    <View style={styles.aiAvatar}>
                      <Feather name="cpu" size={14} color={COLORS.white} />
                    </View>
                    <View style={[styles.aiMessageBubble, { opacity: 0.6 }]}>
                      <ActivityIndicator size="small" color={COLORS.textSecondary} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask a question..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            editable={!isAsking}
            onSubmitEditing={handleAsk}
          />
          <TouchableOpacity
            onPress={handleAsk}
            disabled={!query.trim() || isAsking}
            style={[styles.sendBtn, (!query.trim() || isAsking) && { opacity: 0.5 }]}
          >
            {isAsking ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Feather name="arrow-up" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary50,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADII.full,
  },
  clearText: {
    fontSize: 11,
    color: COLORS.primary600,
    fontWeight: '700',
  },
  chatTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chatBox: {
    height: 350,
    backgroundColor: COLORS.card,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.4)',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: SPACING.md,
  },
  loadingBox: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  userMessageWrap: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  userMessageBubble: {
    backgroundColor: COLORS.primary500,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  userMessageText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  aiMessageWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    gap: 8,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMessageBubble: {
    backgroundColor: 'rgba(239,246,255,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.5)',
  },
  aiMessageText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: RADII.full,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
