/**
 * Zustand Store — Alerts & Safety
 * Dynamically connected to Supabase safety_alerts table.
 * Manages active alerts, activity timeline, and routine config.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAlertStore = create((set, get) => ({
  // Active unresolved alerts (array — multiple elderlies could have alerts)
  activeAlert: null,
  alerts: [],
  activities: [],
  learnedRoutines: [],
  isLoading: false,

  /**
   * Fetch all unresolved safety alerts for the active caregiver's elderlies.
   * Called on app boot and when navigating to Safety tab.
   */
  fetchAlerts: async () => {
    set({ isLoading: true });

    const { data, error } = await supabase
      .from('safety_alerts')
      .select('*, elderlies(first_name, last_name)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error.message);
      set({ isLoading: false });
      return;
    }

    // The most recent unresolved alert becomes the "active" banner alert
    const formattedAlerts = (data || []).map(a => ({
      id: a.id,
      elderly_id: a.elderly_id,
      alert_type: a.alert_type,
      severity: a.severity,
      message: a.message,
      is_resolved: a.is_resolved,
      created_at: a.created_at,
      alert_status: a.is_resolved ? 'resolved' : 'active',
      elderly_name: a.elderlies
        ? `${a.elderlies.first_name} ${a.elderlies.last_name || ''}`.trim()
        : 'Unknown',
    }));

    set({
      alerts: formattedAlerts,
      activeAlert: formattedAlerts.length > 0 ? formattedAlerts[0] : null,
      isLoading: false,
    });
  },

  /**
   * Fetch activity timeline events from the unified activity_events table.
   * This table is auto-populated by triggers on vitals, safety_alerts, and daily_drops.
   */
  fetchActivityEvents: async (profileId) => {
    if (!profileId) return;
    set({ activities: [] });
    
    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .eq('elderly_id', profileId)
      .order('occurred_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activity events:', error.message);
      return;
    }

    const activities = (data || []).map(a => ({
      id: a.id,
      event_type: a.event_type,
      description: a.description,
      vitals_status: a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'stable',
      occurred_at: a.occurred_at,
      source_table: a.source_table,
    }));

    set({ activities });
  },

  /**
   * Fetch AI-learned routines from the learned_routines table.
   * These are auto-seeded on elderly registration and refined by vitals analysis.
   */
  fetchLearnedRoutines: async (profileId) => {
    if (!profileId) return;
    set({ learnedRoutines: [] });

    const { data, error } = await supabase
      .from('learned_routines')
      .select('*')
      .eq('elderly_id', profileId)
      .eq('is_active', true)
      .order('expected_start', { ascending: true });

    if (error) {
      console.error('Error fetching learned routines:', error.message);
      return;
    }

    const routines = (data || []).map(r => {
      // Format 24h TIME string ("22:00:00") to 12h display ("10:00")
      const fmtTime = (t) => {
        if (!t) return '—';
        let [h, m] = t.split(':');
        let hours = parseInt(h);
        let standardHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${standardHours}:${m}`;
      };
      return {
        id: r.id,
        elderly_id: r.elderly_id,
        title: r.routine_name,
        description: r.description,
        icon: r.icon || 'clock',
        start: fmtTime(r.expected_start),
        end: fmtTime(r.expected_end),
        period: r.period || 'AM',
        confidence: r.confidence,
        lastComputedAt: r.last_computed_at,
      };
    });

    set({ learnedRoutines: routines });
  },

  /**
   * Update a learned routine's time window in Supabase.
   * @param {string} id - Routine UUID
   * @param {string} start - "HH:MM" (12h/24h handled)
   * @param {string} end - "HH:MM"
   * @param {string} period - "AM"/"PM"
   */
  updateLearnedRoutine: async (id, start, end, period) => {
    // Helper to convert 12h + period to 24h for DB
    const to24h = (time, p) => {
      let [h, m] = time.split(':');
      let hours = parseInt(h);
      if (p === 'PM' && hours < 12) hours += 12;
      if (p === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${m}:00`;
    };

    const startTime = to24h(start, period);
    const endTime = to24h(end, period);

    const { error } = await supabase
      .from('learned_routines')
      .update({ 
        expected_start: startTime, 
        expected_end: endTime,
        period: period,
        last_computed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating routine:', error.message);
      return false;
    }

    // Refresh local state
    await get().fetchLearnedRoutines();
    return true;
  },

  /**
   * Dismiss an alert visually (mark as resolved in Supabase).
   */
  dismissAlert: async () => {
    const alert = get().activeAlert;
    if (!alert) return;

    const { error } = await supabase
      .from('safety_alerts')
      .update({ is_resolved: true })
      .eq('id', alert.id);

    if (error) {
      console.error('Error dismissing alert:', error.message);
      return;
    }

    // Remove from local state
    const remaining = get().alerts.filter(a => a.id !== alert.id);
    set({
      activeAlert: remaining.length > 0 ? remaining[0] : null,
      alerts: remaining,
    });
  },

  /**
   * Subscribe to real-time safety_alerts inserts.
   * When a fall is detected by the mirror, the alert appears instantly.
   */
  subscribeToAlerts: () => {
    const channel = supabase
      .channel('safety-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'safety_alerts',
        },
        (payload) => {
          const newAlert = payload.new;
          const formatted = {
            id: newAlert.id,
            elderly_id: newAlert.elderly_id,
            alert_type: newAlert.alert_type,
            severity: newAlert.severity,
            message: newAlert.message,
            is_resolved: newAlert.is_resolved,
            created_at: newAlert.created_at,
            alert_status: 'active',
            elderly_name: 'Your Loved One', // Will be refreshed on next fetch
          };

          set((state) => ({
            alerts: [formatted, ...state.alerts],
            activeAlert: formatted, // New alert takes priority
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Legacy actions for local use
  setActiveAlert: (alert) => set({ activeAlert: alert }),
  addActivity: (activity) => set((state) => ({ activities: [activity, ...state.activities] })),
  setActivities: (activities) => set({ activities }),
  setLearnedRoutines: (learnedRoutines) => set({ learnedRoutines }),
}));
