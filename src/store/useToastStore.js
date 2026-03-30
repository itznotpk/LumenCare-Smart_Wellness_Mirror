import { create } from 'zustand';

/**
 * useToastStore — Global state manager for dropping modern Toasts.
 * Simply call: useToastStore.getState().showToast('Saved!', 'Settings updated', 'success')
 */
export const useToastStore = create((set) => ({
  toast: null, // { title, message, type: 'success' | 'error' | 'info' }
  showToast: (title, message = '', type = 'info') => {
    set({ toast: { title, message, type } });
    
    // Auto clear toast state after roughly the animation duration (+3s visible)
    setTimeout(() => {
      set((state) => {
        // Only clear if another toast hasn't immediately replaced it
        if (state.toast && state.toast.title === title) {
          return { toast: null };
        }
        return state;
      });
    }, 4000); // Gives time to slide in, sit for 3.5s, slide out
  },
  hideToast: () => set({ toast: null }),
}));
