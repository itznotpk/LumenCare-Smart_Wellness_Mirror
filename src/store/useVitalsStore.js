/**
 * Zustand Store — Vitals & Wellness
 * Manages current vitals, historical data, and wellness scores.
 */
import { create } from 'zustand';
import { calculateWellnessIndex } from '../utils/wellness';

// Generate mock 7-day history
function generateMockHistory() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split('T')[0],
      heart_rate: 65 + Math.floor(Math.random() * 15),
      hrv: 35 + Math.floor(Math.random() * 25),
      respiratory_rate: 13 + Math.floor(Math.random() * 5),
      wellness_score: 60 + Math.floor(Math.random() * 30),
    });
  }
  return days;
}

// 30-day baseline average (mock)
const MOCK_BASELINE = 72;

const EMPTY_LATEST = {
  heart_rate: null,
  hrv: null,
  respiratory_rate: null,
  recorded_at: null,
};

export const useVitalsStore = create((set, get) => ({
  // Latest vitals reading
  latestVitals: EMPTY_LATEST,
  wellnessScore: calculateWellnessIndex(EMPTY_LATEST),

  // Historical data
  history: generateMockHistory(),
  baselineAverage: MOCK_BASELINE,

  // Status: 'green' | 'yellow' | 'red'
  overallStatus: 'green',
  statusMessage: 'All Clear. Morning routine completed at 8:15 AM.',

  // Loading state
  isLoading: false,

  // Actions
  setLatestVitals: (vitals) =>
    set({
      latestVitals: vitals,
      wellnessScore: vitals?.wellness_score != null ? vitals.wellness_score : calculateWellnessIndex(vitals),
    }),

  setOverallStatus: (status, message) =>
    set({ overallStatus: status, statusMessage: message }),

  setHistory: (historyOrUpdater) =>
    set((state) => ({
      history:
        typeof historyOrUpdater === 'function'
          ? historyOrUpdater(state.history)
          : historyOrUpdater,
    })),
  setLoading: (loading) => set({ isLoading: loading }),

  simulateNewScan: () => {
    const newVitals = {
      heart_rate: 60 + Math.floor(Math.random() * 30),
      hrv: 30 + Math.floor(Math.random() * 40),
      respiratory_rate: 12 + Math.floor(Math.random() * 8),
      recorded_at: new Date().toISOString(),
    };
    set({
      latestVitals: newVitals,
      wellnessScore: calculateWellnessIndex(newVitals),
    });
  },
}));
