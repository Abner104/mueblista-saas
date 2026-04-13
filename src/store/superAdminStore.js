import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

// Emails autorizados como super-admin (hardcoded + tabla DB)
const SUPER_ADMIN_EMAILS = [
  // Agregá tu email acá como fallback local
];

export const useSuperAdminStore = create((set, get) => ({
  isSuperAdmin: false,
  metrics: null,
  shops: [],
  loading: false,
  metricsLoading: false,

  async checkSuperAdmin(user) {
    if (!user) { set({ isSuperAdmin: false }); return false; }

    // Chequeo local primero
    if (SUPER_ADMIN_EMAILS.includes(user.email)) {
      set({ isSuperAdmin: true });
      return true;
    }

    // Chequeo en DB via RPC (service_role lo puede leer)
    const { data, error } = await supabase
      .from('super_admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const is = !error && !!data;
    set({ isSuperAdmin: is });
    return is;
  },

  async loadMetrics() {
    set({ metricsLoading: true });
    const { data, error } = await supabase.rpc('get_superadmin_metrics');
    if (!error && data) {
      set({
        metrics: data,
        shops: data.shops_list || [],
        metricsLoading: false,
      });
    } else {
      set({ metricsLoading: false });
    }
  },

  async updateShopPlan(ownerId, plan) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan, status: 'active', updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId);
    if (!error) {
      // Refrescar lista
      get().loadMetrics();
    }
    return !error;
  },
}));
