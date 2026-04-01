/**
 * Zustand Store — App Settings
 * Manages emergency contacts, escalation protocol, notification preferences,
 * device management, and export controls via Supabase.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useSettingsStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  emergencyContacts: [],
  isLoading: false,
  
  escalation: {
    enabled: true,
    primaryContactId: null,
    escalateAfterMinutes: 5,
    fallbackContactId: null,
    autoCallEmergency: true,
    autoCallAfterMinutes: 15,
  },

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

  mirrorDevice: {
    name: 'Living Room Mirror',
    status: 'online', 
    wifiStrength: 85,
    firmwareVersion: '2.4.1',
    lastSeen: new Date().toISOString(),
    uptime: '3d 14h',
  },

  lastExportDate: null,

  // ── SQL Actions: Emergency Contacts ──────────────────────────
  
  fetchEmergencyContacts: async (elderlyId) => {
    if (!elderlyId) return;
    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('elderly_id', elderlyId)
      .order('is_primary', { ascending: false });

    if (!error) {
      set({ emergencyContacts: data || [] });
      
      // Update escalation IDs to stay in sync with real labels
      const primary = data.find(c => c.is_primary);
      const fallback = data.find(c => !c.is_primary);
      
      set((state) => ({
        escalation: {
          ...state.escalation,
          primaryContactId: primary?.id || null,
          fallbackContactId: fallback?.id || null,
        }
      }));
    }
    set({ isLoading: false });
  },

  addEmergencyContact: async (elderlyId, name, phone, relationship, isPrimary = false) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !elderlyId) return { success: false };

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({
        elderly_id: elderlyId,
        caregiver_id: user.id,
        name,
        phone,
        relationship,
        is_primary: isPrimary
      })
      .select()
      .single();

    if (!error) {
      set((state) => ({
        emergencyContacts: [...state.emergencyContacts, data].sort((a,b) => b.is_primary - a.is_primary)
      }));
      return { success: true };
    }
    return { success: false, error: error.message };
  },

  removeEmergencyContact: async (id) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (!error) {
      set((state) => ({
        emergencyContacts: state.emergencyContacts.filter((c) => c.id !== id),
      }));
      return { success: true };
    }
    return { success: false };
  },

  updateEmergencyContact: async (id, updates, elderlyId) => {
    // If setting this one to primary, first mark all others as NOT primary for this patient
    if (updates.is_primary && elderlyId) {
       await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('elderly_id', elderlyId);
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      // Re-fetch or update local state manually to ensure hierarchy is correct
      if (updates.is_primary && elderlyId) {
        get().fetchEmergencyContacts(elderlyId);
      } else {
        set((state) => ({
          emergencyContacts: state.emergencyContacts
            .map((c) => (c.id === id ? data : c))
            .sort((a,b) => b.is_primary - a.is_primary)
        }));
      }
      return { success: true };
    }
    return { success: false, error: error.message };
  },

  updateNotifications: (updates) =>
    set((state) => ({
      notifications: { ...state.notifications, ...updates },
    })),

  rebootMirror: () =>
    set((state) => ({
      mirrorDevice: {
        ...state.mirrorDevice,
        status: 'rebooting',
        lastSeen: new Date().toISOString(),
      },
    })),

  setLastExportDate: (date) => set({ lastExportDate: date }),
}));
