import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useRoleStore = create((set) => ({
  role: 'admin',
  worker: null,
  ownerId: null,
  loading: false, // arranca en false — no bloquea nada por defecto

  async loadRole(userId) {
    if (!userId) { set({ role: 'admin', worker: null, ownerId: userId, loading: false }); return; }

    set({ loading: true });

    // Timeout de seguridad — máximo 3 segundos esperando
    const timeout = setTimeout(() => {
      set({ role: 'admin', worker: null, ownerId: userId, loading: false });
    }, 3000);

    try {
      const { data: workerRow, error } = await supabase
        .from('workers')
        .select('*')
        .eq('invited_user_id', userId)
        .maybeSingle();

      clearTimeout(timeout);

      if (!error && workerRow) {
        set({
          role: workerRow.worker_role || 'maestro',
          worker: workerRow,
          ownerId: workerRow.owner_id,
          loading: false,
        });
      } else {
        set({ role: 'admin', worker: null, ownerId: userId, loading: false });
      }
    } catch {
      clearTimeout(timeout);
      set({ role: 'admin', worker: null, ownerId: userId, loading: false });
    }
  },

  clear() {
    set({ role: 'admin', worker: null, ownerId: null, loading: false });
  },
}));
