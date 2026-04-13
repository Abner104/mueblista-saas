/**
 * SuperAdminPage — /super
 * Panel de control global. Solo accesible para super-admins.
 * Muestra todos los talleres, métricas globales y permite cambiar planes.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Users, TrendingUp, Zap, Crown, Clock,
  Search, ChevronDown, Check, X, RefreshCw,
  BarChart2, DollarSign, Package, Inbox, Shield,
  LogOut, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { useSuperAdminStore } from '../store/superAdminStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const PLAN_COLORS = {
  free:       { bg: 'bg-zinc-700/50', text: 'text-zinc-400',  border: 'border-zinc-700',  label: 'Free'       },
  trialing:   { bg: 'bg-blue-500/20', text: 'text-blue-300',  border: 'border-blue-500/40', label: 'Trial'     },
  pro:        { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40', label: 'Pro'     },
  enterprise: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40', label: 'Enterprise' },
  past_due:   { bg: 'bg-red-500/20',  text: 'text-red-300',   border: 'border-red-500/40', label: 'Vencido'   },
  canceled:   { bg: 'bg-zinc-600/30', text: 'text-zinc-500',  border: 'border-zinc-700',   label: 'Cancelado' },
};

function PlanBadge({ plan, status }) {
  const key = status === 'trialing' ? 'trialing' : status === 'past_due' ? 'past_due' : status === 'canceled' ? 'canceled' : plan;
  const c = PLAN_COLORS[key] || PLAN_COLORS.free;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      {key === 'pro' || key === 'enterprise' ? <Crown size={9} /> : null}
      {c.label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color = 'text-amber-400' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
    >
      <div className={`w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center mb-3`}>
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
  const plans = ['free', 'pro', 'enterprise'];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50"
      >
        Cambiar plan <ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-9 z-20 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden min-w-[120px]"
          >
            {plans.map(p => (
              <button
                key={p}
                onClick={() => { onSelect(p); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-xs hover:bg-zinc-800 transition text-left"
              >
                <span className="text-zinc-300 capitalize">{p}</span>
                {p === currentPlan && <Check size={11} className="text-amber-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SuperAdminPage() {
  const { metrics, shops, loading: storeLoading, metricsLoading, loadMetrics, updateShopPlan } = useSuperAdminStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [updatingPlan, setUpdatingPlan] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadMetrics(); }, []);

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handlePlanChange(ownerId, plan) {
    setUpdatingPlan(ownerId);
    const ok = await updateShopPlan(ownerId, plan);
    setUpdatingPlan(null);
    showToast(ok ? `Plan actualizado a ${plan}` : 'Error al actualizar plan', ok ? 'ok' : 'err');
  }

  const filtered = (shops || []).filter(s => {
    const matchSearch = !search ||
      s.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.slug?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'all' || s.sub_plan === filterPlan || s.sub_status === filterPlan;
    return matchSearch && matchPlan;
  });

  const m = metrics || {};

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield size={18} className="text-black" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Carpento</p>
              <h1 className="text-sm font-black text-white leading-none">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadMetrics}
              disabled={metricsLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={metricsLoading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 transition"
            >
              <ExternalLink size={13} /> Ir al panel
            </button>
            <button
              onClick={async () => { await logout(); navigate('/'); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Métricas globales */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-4">Métricas globales</p>
          {metricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <MetricCard icon={Store}     label="Talleres totales"  value={m.total_shops}    color="text-amber-400" />
              <MetricCard icon={Crown}     label="Plan Pro"          value={m.pro_shops}      color="text-amber-400" sub="activos" />
              <MetricCard icon={Clock}     label="En trial"          value={m.trialing_shops} color="text-blue-400"  />
              <MetricCard icon={Zap}       label="Plan Free"         value={m.free_shops}     color="text-zinc-400"  />
              <MetricCard icon={Inbox}     label="Leads totales"     value={m.total_leads}    color="text-violet-400" />
              <MetricCard icon={Package}   label="Cotizaciones"      value={m.total_quotes}   color="text-emerald-400" />
              <MetricCard icon={DollarSign} label="Revenue cobrado"  value={m.total_revenue ? `$${Number(m.total_revenue).toLocaleString('es-AR')}` : '$0'} color="text-green-400" />
              <MetricCard icon={Users}     label="Talleres 7 días"   value={m.new_shops_7d}   color="text-pink-400"  sub="nuevos" />
            </div>
          )}
        </div>

        {/* Tabla de talleres */}
        <div>
          {/* Filtros */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, slug..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
            <div className="flex gap-2">
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

          {/* Tabla */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Taller', 'Email', 'Slug', 'Plan', 'Productos', 'Leads', 'Cotizaciones', 'Registrado', 'Acciones'].map(h => (
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
                      <motion.tr
                        key={shop.slug || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-zinc-800/40 transition"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white truncate max-w-[140px]">
                            {shop.shop_name || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-400 text-xs truncate max-w-[180px]">{shop.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {shop.slug ? (
                            <a
                              href={`/catalogo/${shop.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition"
                            >
                              /{shop.slug} <ExternalLink size={10} />
                            </a>
                          ) : <span className="text-zinc-700 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={shop.sub_plan || 'free'} status={shop.sub_status || 'active'} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-zinc-300 font-medium">{shop.products_count ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-zinc-300 font-medium">{shop.leads_count ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-zinc-300 font-medium">{shop.quotes_count ?? 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-500 text-xs whitespace-nowrap">
                            {shop.created_at
                              ? new Date(shop.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
                              : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <PlanSelector
                            currentPlan={shop.sub_plan || 'free'}
                            loading={updatingPlan === shop.owner_id}
                            onSelect={(plan) => handlePlanChange(shop.owner_id, plan)}
                          />
                        </td>
                      </motion.tr>
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
              color: toast.type === 'ok' ? '#6fcf6f' : '#cf6f6f',
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
