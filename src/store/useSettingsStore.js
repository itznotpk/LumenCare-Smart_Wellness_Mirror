/**
 * Zustand Store — App Settings
 * Manages emergency contacts, escalation protocol, notification preferences,
 * device management, and export controls.
 */
import { create } from 'zustand';

const MOCK_EMERGENCY_CONTACTS = [
  { id: '1', name: 'You (Chin)', phone: '+60 12-345-6789', isPrimary: true },
  { id: '2', name: 'Brother (Wei)', phone: '+60 11-987-6543', isPrimary: false },
  { id: '3', name: 'Dr. Tan', phone: '+60 3-2222-1111', isPrimary: false },
];

const MOCK_ESCALATION = {
  enabled: true,
  primaryContactId: '1',
  escalateAfterMinutes: 5,
  fallbackContactId: '2',
  autoCallEmergency: true,
  autoCallAfterMinutes: 15,
};

export const useSettingsStore = create((set, get) => ({
  // ── Emergency & Alerts ──────────────────────────────────────────────────
  emergencyContacts: MOCK_EMERGENCY_CONTACTS,
  escalation: MOCK_ESCALATION,

  addEmergencyContact: (contact) =>
    set((state) => ({
      emergencyContacts: [
        ...state.emergencyContacts,
        { ...contact, id: Date.now().toString() },
      ],
    })),

  removeEmergencyContact: (id) =>
    set((state) => ({
      emergencyContacts: state.emergencyContacts.filter((c) => c.id !== id),
    })),

  updateEmergencyContact: (id, updates) =>
    set((state) => ({
      emergencyContacts: state.emergencyContacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  updateEscalation: (updates) =>
    set((state) => ({
      escalation: { ...state.escalation, ...updates },
    })),

  // ── Notification Preferences ────────────────────────────────────────────
  notifications: {
    greenAlerts: false,
    yellowAlerts: true,
    redAlerts: true,
    muteEnabled: false,
    muteStart: '22:00',
    muteEnd: '06:00',
    soundEnabled: true,
    vibrationEnabled: true,
  },

  updateNotifications: (updates) =>
    set((state) => ({
      notifications: { ...state.notifications, ...updates },
    })),

  // ── Device Management (Mirror Hub) ──────────────────────────────────────
  mirrorDevice: {
    name: 'Living Room Mirror',
    status: 'online',  // 'online' | 'offline'
    wifiStrength: 85, // percent
    firmwareVersion: '2.4.1',
    lastSeen: new Date().toISOString(),
    uptime: '3d 14h',
  },

  rebootMirror: () =>
    set((state) => ({
      mirrorDevice: {
        ...state.mirrorDevice,
        status: 'rebooting',
        lastSeen: new Date().toISOString(),
      },
    })),

  // ── Export ──────────────────────────────────────────────────────────────
  lastExportDate: null,
  setLastExportDate: (date) => set({ lastExportDate: date }),
}));
