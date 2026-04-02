import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useProfileStore = create((set, get) => ({
  profiles: [],
  activeProfileId: null,
  caregiverProfile: null,
  isLoading: true, // Start loading as soon as app boots

  // The primary network orchestrator
  fetchElderlies: async () => {
    set({ isLoading: true });

    // Thanks to RLS, this automatically grabs ONLY the elderlies 
    // owned by the currently authenticated caregiver token.
    const { data, error } = await supabase
      .from('elderlies')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching elderlies:', error.message);
      set({ profiles: [], activeProfileId: null, isLoading: false });
      return { success: false, error: error.message };
    }

    set({
      profiles: data || [],
      // Auto-focus the first loved one if they exist
      activeProfileId: (data && data.length > 0) ? data[0].id : null,
      isLoading: false,
    });

    return { success: true, count: data?.length || 0 };
  },

  // Elegant Safety Getter
  getActiveProfile: () => {
    const state = get();
    if (!state.activeProfileId) return null;
    return state.profiles.find((p) => p.id === state.activeProfileId) || null;
  },

  // Explicit Switcher
  setActiveProfile: (id) => set({ activeProfileId: id }),

  // Supabase dynamic registration
  addElderly: async (firstName, lastName, gender, dateOfBirth, medicalNotes) => {
    set({ isLoading: true });

    // Grab Caregiver Auth Token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      set({ isLoading: false });
      return { success: false, error: authError?.message || 'Authentication error' };
    }

    // Insert payload
    const { data, error } = await supabase.from('elderlies').insert({
      caregiver_id: user.id,
      first_name: firstName,
      last_name: lastName,
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
      medical_notes: medicalNotes || null,
    }).select();

    if (error) {
      console.error('Insert error:', error.message);
      set({ isLoading: false });
      return { success: false, error: error.message };
    }

    // Force network refresh to instantly sync global state and unfreeze App
    await get().fetchElderlies();
    
    return { success: true, newProfile: data?.[0] };
  },

  // Fetch caregiver profile
  fetchCaregiverProfile: async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error && data) {
      set({ caregiverProfile: data });
    }
  },

  // Update existing elderly profile
  updateProfile: async (id, updates) => {
    set({ isLoading: true });
    const { error } = await supabase
      .from('elderlies')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Update profile error:', error.message);
      set({ isLoading: false });
      return { success: false, error: error.message };
    }

    // Refresh cleanly from server
    await get().fetchElderlies();
    return { success: true };
  },

  // Update caregiver profile
  updateCaregiverProfile: async (updates) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Update caregiver profile error:', error.message);
      return { success: false, error: error.message };
    }

    // Refresh store state
    await get().fetchCaregiverProfile();
    return { success: true };
  },
}));

