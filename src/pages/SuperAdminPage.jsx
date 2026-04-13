/**
 * SuperAdminPage — /super
 * Panel de control global. Solo accesible para super-admins.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Users, Crown, Clock, Search, ChevronDown,
  Check, RefreshCw, BarChart2, Package, Inbox, Shield,
  LogOut, ExternalLink, AlertTriangle, Trash2, ChevronUp,
  Zap, RotateCcw, Eye, Mail,
} from 'lucide-react';
import { useSuperAdminStore } from '../store/superAdminStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const PLAN_COLORS = {
  free:       { bg: 'bg-zinc-700/50', text: 'text-zinc-400',    border: 'border-zinc-700',      label: 'Free'       },
  trialing:   { bg: 'bg-blue-500/20', text: 'text-blue-300',    border: 'border-blue-500/40',   label: 'Trial'      },
  pro:        { bg: 'bg-amber-500/20',text: 'text-amber-300',   border: 'border-amber-500/40',  label: 'Pro'        },
  enterprise: { bg: 'bg-violet-500/20',text:'text-violet-300',  border: 'border-violet-500/40', label: 'Enterprise' },
  past_due:   { bg: 'bg-red-500/20',  text: 'text-red-300',     border: 'border-red-500/40',    label: 'Vencido'    },
  canceled:   { bg: 'bg-zinc-600/30', text: 'text-zinc-500',    border: 'border-zinc-700',      label: 'Cancelado'  },
};

function PlanBadge({ plan, status }) {
  const key = status === 'trialing' ? 'trialing'
    : status === 'past_due'  ? 'past_due'
    : status === 'canceled'  ? 'canceled'
    : plan;
  const c = PLAN_COLORS[key] || PLAN_COLORS.free;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      {(key === 'pro' || key === 'enterprise') && <Crown size={9} />}
      {c.label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color = 'text-amber-400', danger = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${danger ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}
    >
      <div className={`w-9 h-9 rounded-xl ${danger ? 'bg-red-500/10' : 'bg-zinc-800'} flex items-center justify-center mb-3`}>
        <Icon size={17} className={color} />
      </div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>}
    </motion.div>
  );
}

function PlanSelector({ currentPlan, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  const plans = [
    { value: 'free',       label: 'Free',       color: 'text-zinc-400' },
    { value: 'pro',        label: 'Pro',        color: 'text-amber-400' },
    { value: 'enterprise', label: 'Enterprise', color: 'text-violet-400' },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? <RefreshCw size={10} className="animate-spin" /> : null}
        Cambiar plan <ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-30 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden min-w-[130px]"
          >
            {plans.map(p => (
              <button
                key={p.value}
                onClick={() => { onSelect(p.value); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-zinc-800 transition text-left"
              >
                <span className={`font-medium ${p.color}`}>{p.label}</span>
                {p.value === currentPlan && <Check size={11} className="text-amber-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Fila expandible de taller
function ShopRow({ shop, onPlanChange, onDelete, onResetTrial, updatingPlan, i }) {
  const [expanded, setExpanded] = useState(false);

  const trialEnd = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
  const trialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : null;
  const trialExpired = trialEnd && trialEnd < new Date();

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.02 }}
        className={`hover:bg-zinc-800/40 transition cursor-pointer ${expanded ? 'bg-zinc-800/30' : ''}`}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Taller */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Store size={13} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm truncate max-w-[120px]">{shop.shop_name || '—'}</p>
              <p className="text-[10px] text-zinc-600 truncate max-w-[120px]">{shop.city || ''}</p>
            </div>
          </div>
        </td>

        {/* Email */}
        <td className="px-4 py-3">
          <p className="text-zinc-400 text-xs truncate max-w-[160px]">{shop.email}</p>
        </td>

        {/* Plan */}
        <td className="px-4 py-3">
          <PlanBadge plan={shop.sub_plan || 'free'} status={shop.sub_status || 'active'} />
        </td>

        {/* Trial */}
        <td className="px-4 py-3">
          {shop.sub_status === 'trialing' ? (
            trialExpired
              ? <span className="text-xs text-red-400 font-medium">Expirado</span>
              : <span className="text-xs text-blue-300">{trialDays}d restantes</span>
          ) : <span className="text-zinc-700 text-xs">—</span>}
        </td>

        {/* Stats */}
        <td className="px-4 py-3 text-center">
          <span className="text-zinc-300 text-sm font-medium">{shop.products_count ?? 0}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-zinc-300 text-sm font-medium">{shop.leads_count ?? 0}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-zinc-300 text-sm font-medium">{shop.quotes_count ?? 0}</span>
        </td>

        {/* Registrado */}
        <td className="px-4 py-3">
          <p className="text-zinc-500 text-xs whitespace-nowrap">
            {shop.created_at
              ? new Date(shop.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
              : '—'}
          </p>
        </td>

        {/* Expand icon */}
        <td className="px-4 py-3 text-zinc-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </motion.tr>

      {/* Panel expandido */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={9} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 bg-zinc-800/30 border-t border-zinc-800 flex flex-wrap gap-3 items-center">

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 flex-1">

                    {shop.slug && (
                      <a
                        href={`/catalogo/${shop.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        <Eye size={12} /> Ver catálogo
                      </a>
                    )}

                    <a
                      href={`mailto:${shop.email}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition"
                    >
                      <Mail size={12} /> Enviar email
                    </a>

                    <div onClick={e => e.stopPropagation()}>
                      <PlanSelector
                        currentPlan={shop.sub_plan || 'free'}
                        loading={updatingPlan === shop.owner_id}
                        onSelect={(plan) => onPlanChange(shop.owner_id, plan)}
                      />
                    </div>

                    {shop.sub_status === 'trialing' && (
                      <button
                        onClick={e => { e.stopPropagation(); onResetTrial(shop.owner_id); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 hover:bg-blue-500/20 transition"
                      >
                        <RotateCcw size={12} /> Resetear trial (+14 días)
                      </button>
                    )}
                  </div>

                  {/* Eliminar taller */}
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(shop.owner_id, shop.shop_name); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 transition ml-auto"
                  >
                    <Trash2 size={12} /> Eliminar taller
                  </button>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function SuperAdminPage() {
  const { metrics, shops, metricsLoading, loadMetrics, updateShopPlan } = useSuperAdminStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch]         = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [updatingPlan, setUpdatingPlan] = useState(null);
  const [toast, setToast]           = useState(null);

  useEffect(() => { loadMetrics(); }, []);

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handlePlanChange(ownerId, plan) {
    setUpdatingPlan(ownerId);
    const ok = await updateShopPlan(ownerId, plan);
    setUpdatingPlan(null);
    showToast(ok ? `Plan actualizado a ${plan}` : 'Error al actualizar plan', ok ? 'ok' : 'err');
  }

  async function handleDelete(ownerId, shopName) {
    if (!confirm(`¿Eliminar el taller "${shopName || ownerId}"?\n\nEsto borrará shop_config y la suscripción. El usuario de auth no se elimina.`)) return;
    const { error } = await supabase
      .from('shop_config')
      .delete()
      .eq('owner_id', ownerId);
    if (!error) {
      showToast(`Taller eliminado`, 'ok');
      loadMetrics();
    } else {
      showToast('Error al eliminar taller', 'err');
    }
  }

  async function handleResetTrial(ownerId) {
    const newEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('subscriptions')
      .update({ trial_ends_at: newEnd, status: 'trialing', updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId);
    if (!error) {
      showToast('Trial reseteado por 14 días más', 'ok');
      loadMetrics();
    } else {
      showToast('Error al resetear trial', 'err');
    }
  }

  const filtered = (shops || []).filter(s => {
    const matchSearch = !search ||
      s.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.slug?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'all' || s.sub_plan === filterPlan || s.sub_status === filterPlan;
    return matchSearch && matchPlan;
  });

  const m = metrics || {};

  // Talleres con trial por vencer en 3 días
  const urgentTrials = (shops || []).filter(s => {
    if (s.sub_status !== 'trialing' || !s.trial_ends_at) return false;
    const days = Math.ceil((new Date(s.trial_ends_at) - new Date()) / 86400000);
    return days >= 0 && days <= 3;
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-black" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Carpento</p>
              <h1 className="text-sm font-black text-white leading-none">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-zinc-600 mr-1">{user?.email}</span>
            <button
              onClick={loadMetrics}
              disabled={metricsLoading}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={metricsLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 transition"
            >
              <ExternalLink size={13} /> <span className="hidden sm:inline">Panel</span>
            </button>
            <button
              onClick={async () => { await logout(); navigate('/'); }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut size={13} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

        {/* Métricas */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-4">Métricas globales</p>
          {metricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <MetricCard icon={Store}    label="Talleres"       value={m.total_shops}    color="text-amber-400" />
              <MetricCard icon={Crown}    label="Plan Pro"       value={m.pro_shops}      color="text-amber-400" sub="activos" />
              <MetricCard icon={Clock}    label="En trial"       value={m.trialing_shops} color="text-blue-400"  />
              <MetricCard icon={Zap}      label="Plan Free"      value={m.free_shops}     color="text-zinc-400"  />
              <MetricCard icon={Inbox}    label="Leads totales"  value={m.total_leads}    color="text-violet-400" />
              <MetricCard icon={Package}  label="Cotizaciones"   value={m.total_quotes}   color="text-emerald-400" />
              <MetricCard
                icon={AlertTriangle}
                label="Trial por vencer"
                value={urgentTrials}
                color="text-red-400"
                danger={urgentTrials > 0}
                sub="en ≤ 3 días"
              />
            </div>
          )}
        </div>

        {/* Tabla */}
        <div>
          {/* Filtros */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex-1 min-w-[180px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                placeholder="Buscar nombre, email, slug, ciudad..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'free', 'pro', 'trialing', 'canceled'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPlan(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                    filterPlan === f
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 ml-auto">{filtered.length} talleres</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Taller', 'Email', 'Plan', 'Trial', 'Productos', 'Leads', 'Cotizaciones', 'Registrado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-zinc-600 text-sm">
                        {metricsLoading ? 'Cargando...' : 'No hay talleres que coincidan'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((shop, i) => (
                      <ShopRow
                        key={shop.owner_id || shop.slug || i}
                        shop={shop}
                        i={i}
                        updatingPlan={updatingPlan}
                        onPlanChange={handlePlanChange}
                        onDelete={handleDelete}
                        onResetTrial={handleResetTrial}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl text-sm font-medium"
            style={{
              background: toast.type === 'ok' ? '#1a2e1a' : '#2e1a1a',
              border: `1px solid ${toast.type === 'ok' ? '#2d5a2d' : '#5a2d2d'}`,
              color:  toast.type === 'ok' ? '#6fcf6f' : '#cf6f6f',
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {toast.type === 'ok' ? <Check size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
