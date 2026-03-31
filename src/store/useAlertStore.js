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
  isLoading: false,

  // Routine configuration (local for now)
  routineWindow: {
    start: '07:30',
    end: '08:30',
    isLearning: false,
  },

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
   * Fetch resolved alerts as activity timeline for the Safety tab.
   */
  fetchAlertHistory: async () => {
    const { data, error } = await supabase
      .from('safety_alerts')
      .select('*, elderlies(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching alert history:', error.message);
      return;
    }

    const activities = (data || []).map(a => ({
      id: a.id,
      event_type: a.alert_type === 'Fall_Detected' ? 'fall' : 'alert',
      description: a.message || `${a.alert_type} — ${a.severity}`,
      vitals_status: a.severity === 'High' ? 'danger' : a.severity === 'Medium' ? 'warning' : 'stable',
      occurred_at: a.created_at,
      is_resolved: a.is_resolved,
      elderly_name: a.elderlies
        ? `${a.elderlies.first_name} ${a.elderlies.last_name || ''}`.trim()
        : 'Unknown',
    }));

    set({ activities });
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
  updateRoutineWindow: (start, end) => set((state) => ({
    routineWindow: { ...state.routineWindow, start, end },
  })),
}));
