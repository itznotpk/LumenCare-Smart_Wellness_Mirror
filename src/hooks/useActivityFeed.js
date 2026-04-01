/**
 * useActivityFeed — Fetches and subscribes to the `activity_events` table.
 *
 * - DEMO MODE: no-op, store already has mock activities.
 * - LIVE MODE: fetches recent events on mount, then subscribes for INSERT.
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
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  // ─── Initial fetch: recent activity events ─────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE || !supabase) return;

    let cancelled = false;

    async function fetchActivities() {
      // Fetch last 7 days of activity (not just today)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .gte('occurred_at', sevenDaysAgo.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(50);

      if (!cancelled && !error && data) {
        const formatted = data.map(a => ({
          id: a.id,
          event_type: a.event_type,
          description: a.description,
          vitals_status: a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'stable',
          occurred_at: a.occurred_at,
          source_table: a.source_table,
        }));
        setActivities(formatted);
      }
    }

    fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  // ─── Realtime: activity_events INSERT ───────────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE || !supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('activity-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_events',
        },
        (payload) => {
          const a = payload.new;
          addActivity({
            id: a.id,
            event_type: a.event_type,
            description: a.description,
            vitals_status: a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'stable',
            occurred_at: a.occurred_at,
            source_table: a.source_table,
          });
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
