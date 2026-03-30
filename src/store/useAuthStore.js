import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  isInitialized: false,

  // Called once inside App.js when the app boots up
  initializeAuth: () => {
    // 1. Recover existing token
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ 
        isAuthenticated: !!session, 
        user: session?.user ?? null,
        isInitialized: true
      });
    });

    // 2. Setup live database trigger listener
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        isAuthenticated: !!session,
        user: session?.user ?? null,
      });
    });
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  register: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          terms_accepted: true,
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
}));
