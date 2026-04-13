import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

const FREE_LIMITS = {
  max_products:      10,
  max_clients:       20,
  can_use_optimizer: false,
  can_use_workers:   false,
};

const PRO_LIMITS = {
  max_products:      999999,
  max_clients:       999999,
  can_use_optimizer: true,
  can_use_workers:   true,
};

export const useSubscriptionStore = create((set, get) => ({
  plan:        'free',
  status:      'trialing',
  isPro:       false,
  isTrialing:  false,
  trialEndsAt: null,
  limits:      FREE_LIMITS,
  loading:     true,

  async load(userId) {
    if (!userId) { set({ loading: false }); return; }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error || !data) {
      // No tiene suscripción — la creamos
      await supabase.from('subscriptions').insert({
        owner_id: userId,
        plan: 'free',
        status: 'trialing',
      }).select().maybeSingle();

      set({
        plan: 'free',
        status: 'trialing',
        isPro: true, // trial = pro temporalmente
        isTrialing: true,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        limits: PRO_LIMITS,
        loading: false,
      });
      return;
    }

    const isPro = data.plan === 'pro' || data.plan === 'enterprise' ||
      (data.status === 'trialing' && data.trial_ends_at && new Date(data.trial_ends_at) > new Date());

    set({
      plan:        data.plan,
      status:      data.status,
      isPro,
      isTrialing:  data.status === 'trialing',
      trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
      limits:      isPro ? PRO_LIMITS : FREE_LIMITS,
      loading:     false,
    });
  },

  // Días que quedan del trial
  trialDaysLeft() {
    const { trialEndsAt, isTrialing } = get();
    if (!isTrialing || !trialEndsAt) return 0;
    const diff = trialEndsAt - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },
}));
