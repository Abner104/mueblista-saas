/**
 * BillingPage — /app/billing
 * Estado del plan, días de trial, botón de upgrade a Pro con MercadoPago.
 * Los planes se cargan dinámicamente desde la tabla plan_config.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, Check, Clock, AlertTriangle,
  CreditCard, ExternalLink, RefreshCw, Shield,
} from 'lucide-react';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { supabase } from '../lib/supabaseClient';

function FeatureRow({ label, locked = false }) {
  return (
    <div className={`flex items-center gap-2.5 text-sm ${locked ? 'opacity-40' : ''}`}>
      {locked
        ? <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center shrink-0" />
        : <Check size={14} className="text-amber-400 shrink-0" />
      }
      <span className={locked ? 'line-through text-zinc-600' : 'text-zinc-300'}>{label}</span>
    </div>
  );
}

function TrialBanner({ daysLeft }) {
  const urgent = daysLeft <= 3;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 flex items-center gap-4 ${
        urgent
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-blue-500/40 bg-blue-500/10'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${urgent ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
        {urgent ? <AlertTriangle size={18} className="text-red-400" /> : <Clock size={18} className="text-blue-400" />}
      </div>
      <div className="flex-1">
        <p className={`font-bold text-sm ${urgent ? 'text-red-300' : 'text-blue-300'}`}>
          {urgent ? `¡Tu trial vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}!` : `Trial activo — ${daysLeft} días restantes`}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {urgent
            ? 'Suscribite al plan Pro para no perder acceso a todas las funciones.'
            : 'Estás usando todas las funciones Pro gratis durante el período de prueba.'}
        </p>
      </div>
    </motion.div>
  );
}

export default function BillingPage() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { plan, isPro, isTrialing, trialEndsAt, trialDaysLeft, load } = useSubscriptionStore();
  const [loadingMP, setLoadingMP] = useState(false);
  const [error, setError] = useState('');
  const [mpUrl, setMpUrl] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [pricePro, setPricePro] = useState(12000);

  const tk = isDark ? {
    bg:     'bg-zinc-950',
    card:   'bg-zinc-900 border-zinc-800',
    text:   'text-white',
    sub:    'text-zinc-400',
  } : {
    bg:     'bg-stone-50',
    card:   'bg-white border-stone-200',
    text:   'text-stone-900',
    sub:    'text-stone-500',
  };

  useEffect(() => {
    if (user?.id) load(user.id);
  }, [user?.id]);

  useEffect(() => {
    async function fetchPlanes() {
      const { data } = await supabase
        .from('plan_config')
        .select('*')
        .in('plan_id', ['free', 'pro'])
        .order('price', { ascending: true });

      if (data?.length) {
        setPlanes(data);
        const pro = data.find(p => p.plan_id === 'pro');
        if (pro) setPricePro(pro.price);
      }
    }
    fetchPlanes();
  }, []);

  async function handleUpgrade() {
    if (!user) return;
    setLoadingMP(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mp-create-preference', {
        body: {
          owner_id:    user.id,
          owner_email: user.email,
          plan:        'pro',
          price:       pricePro,
        },
      });

      if (fnError || !data?.init_point) {
        throw new Error(fnError?.message || 'No se pudo crear la preferencia de pago');
      }

      setMpUrl(data.init_point);
      // Abre MP en nueva pestaña
      window.open(data.init_point, '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMP(false);
    }
  }

  const daysLeft = trialDaysLeft();

  return (
    <div className={`space-y-6 pb-10`}>

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-black ${tk.text}`}>Suscripción</h1>
        <p className={`mt-1 text-sm ${tk.sub}`}>
          Administrá tu plan y método de pago.
        </p>
      </div>

      {/* Banner trial */}
      {isTrialing && daysLeft > 0 && <TrialBanner daysLeft={daysLeft} />}

      {/* Plan actual */}
      <div className={`rounded-2xl border ${tk.card} p-4 md:p-6`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className={`text-xs uppercase tracking-widest ${tk.sub} mb-1`}>Plan actual</p>
            <div className="flex items-center gap-3">
              <span
                className="text-3xl font-black"
                style={{ color: isPro ? '#c8923a' : '#71717a' }}
              >
                {plan === 'pro' ? 'Pro' : plan === 'enterprise' ? 'Enterprise' : 'Free'}
              </span>
              {isPro && plan !== 'free' && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Crown size={10} /> Activo
                </span>
              )}
              {isTrialing && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Clock size={10} /> Trial
                </span>
              )}
            </div>
            {trialEndsAt && isTrialing && (
              <p className={`text-xs ${tk.sub} mt-1`}>
                Trial vence el {trialEndsAt.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          {(!isPro || isTrialing) && (
            <motion.button
              onClick={handleUpgrade}
              disabled={loadingMP}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-black text-sm transition disabled:opacity-60 w-full sm:w-auto justify-center"
              style={{ background: '#c8923a', color: '#0f0d0b', boxShadow: '0 8px 24px #c8923a40' }}
            >
              {loadingMP
                ? <RefreshCw size={15} className="animate-spin" />
                : <Crown size={15} />}
              {loadingMP ? 'Procesando...' : 'Suscribirse al Plan Pro'}
            </motion.button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {mpUrl && !error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-300">
            <ExternalLink size={14} className="shrink-0" />
            Se abrió MercadoPago.{' '}
            <a href={mpUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">
              Clic acá si no se abrió
            </a>
          </div>
        )}
      </div>

      {/* Comparación de planes */}
      <div className="grid md:grid-cols-2 gap-4">
        {planes.map((p, i) => {
          const isCurrentPlan = p.plan_id === plan || (p.plan_id === 'pro' && isPro && !isTrialing);
          const isHighlight = p.plan_id === 'pro';
          const priceLabel = p.price === 0 ? '$0' : `$${Number(p.price).toLocaleString('es-AR')}`;
          return (
            <motion.div
              key={p.plan_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-2xl border p-4 md:p-6 relative overflow-hidden ${
                isHighlight
                  ? 'border-amber-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950'
                  : tk.card
              }`}
            >
              {isHighlight && (
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #c8923a, transparent)' }} />
              )}
              {isCurrentPlan && !isTrialing && (
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Plan actual
                </div>
              )}

              <p className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: p.color }}>
                {p.name}
              </p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black text-white">{priceLabel}</span>
                <span className={`text-sm ${tk.sub}`}>/{p.period}</span>
              </div>

              <div className="space-y-2.5 mb-5">
                {(p.features || []).map(f => (
                  <FeatureRow key={f.label} label={f.label} />
                ))}
              </div>

              {isHighlight && (!isPro || isTrialing) && (
                <button
                  onClick={handleUpgrade}
                  disabled={loadingMP}
                  className="w-full rounded-xl py-3 text-sm font-black transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#c8923a', color: '#0f0d0b' }}
                >
                  {loadingMP ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {loadingMP ? 'Procesando...' : 'Pagar con MercadoPago'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Info de pago seguro */}
      <div className={`rounded-2xl border ${tk.card} p-5 flex items-center gap-4`}>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${tk.text}`}>Pago 100% seguro con MercadoPago</p>
          <p className={`text-xs ${tk.sub} mt-0.5`}>
            Procesamos los pagos a través de MercadoPago. Podés pagar con tarjeta de crédito, débito o dinero en cuenta. Cancelá cuando quieras.
          </p>
        </div>
      </div>
    </div>
  );
}
