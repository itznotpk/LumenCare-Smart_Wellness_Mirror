/**
 * Zustand Store — Alerts & Safety
 * Manages active alerts, activity timeline, and routine config.
 */
import { create } from 'zustand';

const now = new Date();
const today = now.toISOString().split('T')[0];

const MOCK_ACTIVITIES = [
  {
    id: '1',
    event_type: 'scan',
    description: 'Morning Grooming (Vitals: Stable)',
    vitals_status: 'stable',
    occurred_at: `${today}T08:15:00`,
  },
  {
    id: '2',
    event_type: 'motion',
    description: 'Kitchen activity detected',
    vitals_status: 'stable',
    occurred_at: `${today}T08:45:00`,
  },
  {
    id: '3',
    event_type: 'scan',
    description: 'Mid-morning check (Vitals: Stable)',
    vitals_status: 'stable',
    occurred_at: `${today}T10:30:00`,
  },
  {
    id: '5',
    event_type: 'scan',
    description: 'Missed morning routine — no scan detected',
    vitals_status: 'warning',
    occurred_at: new Date(now.getTime() - 86400000 * 2).toISOString().replace(/T.*/, 'T09:00:00'),
  },
  {
    id: '4',
    event_type: 'motion',
    description: 'Night-time motion detected',
    vitals_status: 'stable',
    occurred_at: new Date(now.getTime() - 86400000).toISOString().replace(/T.*/, 'T23:00:00'),
  },
];

const MOCK_ALERT = null; // Set to object below to test red state:
// const MOCK_ALERT = {
//   id: 'alert-1',
//   alert_type: 'fall',
//   alert_status: 'active',
//   message: 'Fall detected in the bathroom at 8:42 AM',
//   created_at: new Date().toISOString(),
// };

export const useAlertStore = create((set) => ({
  // Active alert (only one at a time for simplicity)
  activeAlert: MOCK_ALERT,

  // Activity timeline
  activities: MOCK_ACTIVITIES,

  // Routine configuration
  routineWindow: {
    start: '07:30',
    end: '08:30',
    isLearning: false, // true for new users
  },

  // Actions
  setActiveAlert: (alert) => set({ activeAlert: alert }),

  dismissAlert: () =>
    set((state) => ({
      activeAlert: state.activeAlert
        ? { ...state.activeAlert, alert_status: 'dismissed' }
        : null,
    })),

  resolveAlert: () =>
    set((state) => ({
      activeAlert: state.activeAlert
        ? { ...state.activeAlert, alert_status: 'resolved', resolved_at: new Date().toISOString() }
        : null,
    })),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),

  setActivities: (activities) => set({ activities }),

  updateRoutineWindow: (start, end) =>
    set((state) => ({
      routineWindow: { ...state.routineWindow, start, end },
    })),
}));
