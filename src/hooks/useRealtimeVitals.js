/**
 * useRealtimeVitals — Supabase Realtime subscription for the `vitals` table.
 *
 * - In DEMO MODE (no Supabase credentials): no-op, stores already have mock data.
 * - In LIVE MODE: subscribes to INSERT events on the `vitals` table filtered by
 *   the active profile_id and pushes updates into Zustand.
 *
 * Usage: Call once at the app root or inside DashboardScreen.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useVitalsStore } from '../store/useVitalsStore';
import { useProfileStore } from '../store/useProfileStore';

export function useRealtimeVitals() {
  const channelRef = useRef(null);

  const setLatestVitals = useVitalsStore((s) => s.setLatestVitals);
  const setHistory = useVitalsStore((s) => s.setHistory);
  const setLoading = useVitalsStore((s) => s.setLoading);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  // ─── Data fetcher function ───
  const fetchVitalsData = async (showLoading = true) => {
    if (!supabase || !activeProfileId) return;
    if (showLoading) setLoading(true);
    try {
        // Latest single row
        const { data: latest, error: latestErr } = await supabase
          .from('vitals')
          .select('*')
          .eq('elderly_id', activeProfileId)
          .order('recorded_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .single();

      if (!latestErr && latest) {
        setLatestVitals(latest);
      } else {
        setLatestVitals({ heart_rate: null, hrv: null, respiratory_rate: null, recorded_at: null });
      }

      // 90-day history (raw scans)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: history, error: histErr } = await supabase
        .from('vitals')
        .select('heart_rate, hrv_sdnn, hrv_rmssd, respiratory_rate, wellness_score, stress_level, recorded_at')
        .eq('elderly_id', activeProfileId)
        .gte('recorded_at', ninetyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (!histErr && history) {
        // Feed raw history to Zustand state with an injected `date` property for compatibility
        const enrichedHistory = history.map(row => ({
          ...row,
          date: row.recorded_at, // Preserve raw ISO string explicitly for charting logic
        }));
        setHistory(enrichedHistory);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // ─── Initial fetch wrapper ───
  useEffect(() => {
    fetchVitalsData(true);
  }, [activeProfileId]);

  // ─── Realtime subscription: push new INSERT rows into the store ───────────
  useEffect(() => {
    if (!supabase || !activeProfileId) return;

    // Clean up any previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`vitals:elderly_id=eq.${activeProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vitals',
          filter: `elderly_id=eq.${activeProfileId}`,
        },
        (payload) => {
          const newVitals = payload.new;
          setLatestVitals(newVitals);

          // Append raw new row to our internal history log without wiping the day
          setHistory((prev) => {
            if (!newVitals.recorded_at) return prev;
            const newRow = { ...newVitals, date: newVitals.recorded_at };
            return [...(prev || []), newRow].slice(-1000); // cap memory at 1000 arrays max
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

  return { refetch: () => fetchVitalsData(false) };
}
