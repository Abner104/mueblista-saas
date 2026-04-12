import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  setAuth: ({ user, session }) =>
    set({
      user,
      session,
      loading: false,
    }),

  setLoading: (loading) => set({ loading }),

  logout: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      loading: false,
    });
  },
}));