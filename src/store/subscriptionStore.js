import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_FREE_LIMITS = {
  max_products:      10,
  max_clients:       20,
  can_use_optimizer: false,
  can_use_workers:   false,
};

const DEFAULT_PRO_LIMITS = {
  max_products:      999999,
  max_clients:       999999,
  can_use_optimizer: true,
  can_use_workers:   true,
};

async function fetchPlanLimits(planId) {
  const { data } = await supabase
    .from('plan_config')
    .select('max_products, max_clients, can_optimizer, can_workers')
    .eq('plan_id', planId)
    .maybeSingle();

  if (!data) return planId === 'free' ? DEFAULT_FREE_LIMITS : DEFAULT_PRO_LIMITS;

  return {
    max_products:      data.max_products,
    max_clients:       data.max_clients,
    can_use_optimizer: data.can_optimizer,
    can_use_workers:   data.can_workers,
  };
}

export const useSubscriptionStore = create((set, get) => ({
  plan:        'free',
  status:      'trialing',
  isPro:       false,
  isTrialing:  false,
  trialEndsAt: null,
  limits:      DEFAULT_FREE_LIMITS,
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

      const limits = await fetchPlanLimits('pro'); // trial = pro temporalmente

      set({
        plan: 'free',
        status: 'trialing',
        isPro: true,
        isTrialing: true,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        limits,
        loading: false,
      });
      return;
    }

    const isPro = data.plan === 'pro' || data.plan === 'enterprise' ||
      (data.status === 'trialing' && data.trial_ends_at && new Date(data.trial_ends_at) > new Date());

    const effectivePlan = isPro ? (data.plan === 'enterprise' ? 'enterprise' : 'pro') : 'free';
    const limits = await fetchPlanLimits(effectivePlan);

    set({
      plan:        data.plan,
      status:      data.status,
      isPro,
      isTrialing:  data.status === 'trialing',
      trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
      limits,
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
