/**
 * useActivityFeed — Fetches and subscribes to the `activity_log` table.
 *
 * - DEMO MODE: no-op, store already has mock activities.
 * - LIVE MODE: fetches today's events on mount, then subscribes for INSERT.
 *
 * Usage: Call inside SafetyScreen (or once at a higher level).
 */
import { useEffect, useRef } from 'react';
import { supabase, IS_DEMO_MODE } from '../config/supabase';
import { useAlertStore } from '../store/useAlertStore';
import { useProfileStore } from '../store/useProfileStore';

export function useActivityFeed() {
  const channelRef = useRef(null);

  const setActivities = useAlertStore((s) => s.setActivities);
  const addActivity = useAlertStore((s) => s.addActivity);
  const setActiveAlert = useAlertStore((s) => s.setActiveAlert);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  // ─── Initial fetch: today's activity log ─────────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE || !supabase) return;

    let cancelled = false;

    async function fetchActivities() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('profile_id', activeProfileId)
        .gte('occurred_at', startOfDay.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(50);

      if (!cancelled && !error && data) {
        setActivities(data);
      }
    }

    // Also fetch latest active alert
    async function fetchActiveAlert() {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('profile_id', activeProfileId)
        .eq('alert_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error) {
        setActiveAlert(data || null);
      }
    }

    fetchActivities();
    fetchActiveAlert();

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  // ─── Realtime: activity_log INSERT ───────────────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE || !supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`activity:profile_id=eq.${activeProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `profile_id=eq.${activeProfileId}`,
        },
        (payload) => {
          addActivity(payload.new);
        }
      )
      // Also listen for new alerts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `profile_id=eq.${activeProfileId}`,
        },
        (payload) => {
          const alert = payload.new;
          if (alert.alert_status === 'active') {
            setActiveAlert(alert);
          }
        }
      )
      // Listen for alert status updates (resolved/dismissed by mirror)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `profile_id=eq.${activeProfileId}`,
        },
        (payload) => {
          const alert = payload.new;
          if (alert.alert_status !== 'active') {
            // Clear the banner if the alert was resolved externally
            setActiveAlert((prev) =>
              prev?.id === alert.id ? null : prev
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeProfileId]);
}
