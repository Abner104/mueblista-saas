/**
 * SuperAdminPage — /super
 * Panel de control global. Solo accesible para super-admins.
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Crown, Clock, Search, ChevronDown,
  Check, RefreshCw, Package, Inbox, Shield,
  LogOut, ExternalLink, AlertTriangle, Trash2, ChevronUp,
  Zap, RotateCcw, Eye, Mail, Settings, Plus, X,
  DollarSign, Users, Save, Pencil,
} from 'lucide-react';
import { useSuperAdminStore } from '../store/superAdminStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// ── Colores de plan ────────────────────────────────────────────────
const PLAN_COLORS = {
  free:       { bg: 'bg-zinc-700/50',   text: 'text-zinc-400',   border: 'border-zinc-700',      label: 'Free'       },
  trialing:   { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40',   label: 'Trial'      },
  pro:        { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/40',  label: 'Pro'        },
  enterprise: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40', label: 'Enterprise' },
  past_due:   { bg: 'bg-red-500/20',    text: 'text-red-300',    border: 'border-red-500/40',    label: 'Vencido'    },
  canceled:   { bg: 'bg-zinc-600/30',   text: 'text-zinc-500',   border: 'border-zinc-700',      label: 'Cancelado'  },
};

// ── Componentes base ───────────────────────────────────────────────
function PlanBadge({ plan, status }) {
  const key = status === 'trialing' ? 'trialing'
    : status === 'past_due' ? 'past_due'
    : status === 'canceled' ? 'canceled'
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
  const ref = useCallback(node => {
    if (!node) return;
    function handleClick(e) { if (!node.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const plans = [
    { value: 'free', label: 'Free', color: 'text-zinc-400'  },
    { value: 'pro',  label: 'Pro',  color: 'text-amber-400' },
  ];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading && <RefreshCw size={10} className="animate-spin" />}
        Cambiar plan <ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden min-w-[130px]"
            style={{ marginTop: 4 }}
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

// ── Fila expandible de taller ──────────────────────────────────────
function ShopRow({ shop, onPlanChange, onDelete, onResetTrial, updatingPlan, i }) {
  const [expanded, setExpanded] = useState(false);
  const trialEnd  = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null;
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
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Store size={13} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm truncate max-w-[120px]">{shop.shop_name || '—'}</p>
              {shop.city && <p className="text-[10px] text-zinc-600">{shop.city}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-zinc-400 text-xs truncate max-w-[160px]">{shop.email}</p>
        </td>
        <td className="px-4 py-3">
          <PlanBadge plan={shop.sub_plan || 'free'} status={shop.sub_status || 'active'} />
        </td>
        <td className="px-4 py-3">
          {shop.sub_status === 'trialing'
            ? trialExpired
              ? <span className="text-xs text-red-400 font-medium">Expirado</span>
              : <span className="text-xs text-blue-300">{trialDays}d restantes</span>
            : <span className="text-zinc-700 text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-center"><span className="text-zinc-300 text-sm font-medium">{shop.products_count ?? 0}</span></td>
        <td className="px-4 py-3 text-center"><span className="text-zinc-300 text-sm font-medium">{shop.leads_count ?? 0}</span></td>
        <td className="px-4 py-3 text-center"><span className="text-zinc-300 text-sm font-medium">{shop.quotes_count ?? 0}</span></td>
        <td className="px-4 py-3">
          <p className="text-zinc-500 text-xs whitespace-nowrap">
            {shop.created_at ? new Date(shop.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
          </p>
        </td>
        <td className="px-4 py-3 text-zinc-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </motion.tr>

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
                  <div className="flex flex-wrap gap-2 flex-1">
                    {shop.slug && (
                      <a href={`/catalogo/${shop.slug}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition">
                        <Eye size={12} /> Ver catálogo
                      </a>
                    )}
                    <a href={`mailto:${shop.email}`} onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition">
                      <Mail size={12} /> Enviar email
                    </a>
                    <div onClick={e => e.stopPropagation()}>
                      <PlanSelector
                        currentPlan={shop.sub_plan || 'free'}
                        loading={updatingPlan === shop.owner_id}
                        onSelect={plan => onPlanChange(shop.owner_id, plan)}
                      />
                    </div>
                    {shop.sub_status === 'trialing' && (
                      <button onClick={e => { e.stopPropagation(); onResetTrial(shop.owner_id); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 hover:bg-blue-500/20 transition">
                        <RotateCcw size={12} /> Resetear trial (+14 días)
                      </button>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onDelete(shop.owner_id, shop.shop_name); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 transition ml-auto">
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

// ── Editor de un plan ──────────────────────────────────────────────
function PlanEditor({ plan, onSave, onCancel }) {
  const [form, setForm] = useState({ ...plan, features: [...(plan.features || [])] });
  const [saving, setSaving] = useState(false);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function setFeature(i, val) {
    setForm(p => {
      const f = [...p.features];
      f[i] = { label: val };
      return { ...p, features: f };
    });
  }
  function addFeature()    { setForm(p => ({ ...p, features: [...p.features, { label: '' }] })); }
  function removeFeature(i){ setForm(p => ({ ...p, features: p.features.filter((_, idx) => idx !== i) })); }

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inp = 'w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-5"
    >
      {/* Header del editor */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: form.color }} />
          <h3 className="text-sm font-bold text-white">Editando Plan {form.name}</h3>
        </div>
        <button onClick={onCancel} className="text-zinc-600 hover:text-zinc-400 transition"><X size={16} /></button>
      </div>

      {/* Campos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Nombre</label>
          <input value={form.name} onChange={e => setF('name', e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Período</label>
          <input value={form.period} onChange={e => setF('period', e.target.value)} placeholder="por mes" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Color (hex)</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.color} onChange={e => setF('color', e.target.value)}
              className="h-10 w-12 rounded-xl border border-zinc-700 bg-zinc-800 cursor-pointer p-1" />
            <input value={form.color} onChange={e => setF('color', e.target.value)} className={`${inp} flex-1`} />
          </div>
        </div>
      </div>

      {/* Límites */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Límites del plan</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-zinc-600 mb-1">Máx. productos</label>
            <input type="number" value={form.max_products} onChange={e => setF('max_products', Number(e.target.value))} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 mb-1">Máx. clientes</label>
            <input type="number" value={form.max_clients} onChange={e => setF('max_clients', Number(e.target.value))} className={inp} />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <button
              type="button"
              onClick={() => setF('can_optimizer', !form.can_optimizer)}
              className={`relative w-10 h-6 rounded-full border transition-colors shrink-0 ${form.can_optimizer ? 'bg-amber-500 border-amber-500' : 'bg-zinc-700 border-zinc-600'}`}
            >
              <motion.div animate={{ x: form.can_optimizer ? 18 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow" />
            </button>
            <span className="text-xs text-zinc-400">Optimizador CNC</span>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <button
              type="button"
              onClick={() => setF('can_workers', !form.can_workers)}
              className={`relative w-10 h-6 rounded-full border transition-colors shrink-0 ${form.can_workers ? 'bg-amber-500 border-amber-500' : 'bg-zinc-700 border-zinc-600'}`}
            >
              <motion.div animate={{ x: form.can_workers ? 18 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow" />
            </button>
            <span className="text-xs text-zinc-400">Gestión de equipo</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Features visibles en Billing</p>
        <div className="space-y-2">
          {form.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: form.color + '30', border: `1px solid ${form.color}60` }}>
                <Check size={9} style={{ color: form.color }} />
              </div>
              <input
                value={f.label}
                onChange={e => setFeature(i, e.target.value)}
                placeholder="Descripción de la feature..."
                className={`${inp} flex-1`}
              />
              <button onClick={() => removeFeature(i)} className="text-zinc-600 hover:text-red-400 transition shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
          <button onClick={addFeature}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition mt-1">
            <Plus size={13} /> Agregar feature
          </button>
        </div>
      </div>

      {/* Guardar */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 transition">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-60"
          style={{ background: form.color, color: '#0f0d0b' }}>
          {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Página principal ───────────────────────────────────────────────
export default function SuperAdminPage() {
  const { metrics, shops, metricsLoading, loadMetrics, updateShopPlan } = useSuperAdminStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [search, setSearch]         = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [updatingPlan, setUpdatingPlan] = useState(null);
  const [toast, setToast]           = useState(null);
  const [activeTab, setActiveTab]   = useState('talleres'); // 'talleres' | 'planes'

  // Plan config
  const [planConfigs, setPlanConfigs] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null); // plan_id siendo editado

  useEffect(() => { loadMetrics(); loadPlanConfigs(); }, []);

  async function loadPlanConfigs() {
    const { data } = await supabase.from('plan_config').select('*').in('plan_id', ['free', 'pro']).order('price');
    if (data) setPlanConfigs(data);
  }

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
    const { error } = await supabase.from('shop_config').delete().eq('owner_id', ownerId);
    if (!error) { showToast('Taller eliminado', 'ok'); loadMetrics(); }
    else          showToast('Error al eliminar taller', 'err');
  }

  async function handleResetTrial(ownerId) {
    const newEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('subscriptions')
      .update({ trial_ends_at: newEnd, status: 'trialing', updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId);
    if (!error) { showToast('Trial reseteado por 14 días más', 'ok'); loadMetrics(); }
    else          showToast('Error al resetear trial', 'err');
  }

  async function handleSavePlan(form) {
    const { error } = await supabase
      .from('plan_config')
      .update({
        name:          form.name,
        period:        form.period,
        color:         form.color,
        max_products:  form.max_products,
        max_clients:   form.max_clients,
        can_optimizer: form.can_optimizer,
        can_workers:   form.can_workers,
        features:      form.features,
        updated_at:    new Date().toISOString(),
      })
      .eq('plan_id', form.plan_id);

    if (!error) {
      showToast(`Plan "${form.name}" actualizado`, 'ok');
      setEditingPlan(null);
      loadPlanConfigs();
    } else {
      showToast('Error al guardar plan', 'err');
    }
  }

  const filtered = (shops || []).filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.shop_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.slug?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q);
    const matchPlan = filterPlan === 'all' || s.sub_plan === filterPlan || s.sub_status === filterPlan;
    return matchSearch && matchPlan;
  });

  const m = metrics || {};
  const urgentTrials = (shops || []).filter(s => {
    if (s.sub_status !== 'trialing' || !s.trial_ends_at) return false;
    const days = Math.ceil((new Date(s.trial_ends_at) - new Date()) / 86400000);
    return days >= 0 && days <= 3;
  }).length;

  const TABS = [
    { id: 'talleres', label: 'Talleres', icon: Store },
    { id: 'planes',   label: 'Planes',   icon: Settings },
  ];

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

          {/* Tabs en el header */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === t.id ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs text-zinc-600">{user?.email}</span>
            <button onClick={loadMetrics} disabled={metricsLoading}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 transition disabled:opacity-50">
              <RefreshCw size={13} className={metricsLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button onClick={() => navigate('/app')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 transition">
              <ExternalLink size={13} /> <span className="hidden sm:inline">Panel</span>
            </button>
            <button onClick={async () => { await logout(); navigate('/'); }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-red-400 hover:bg-red-500/10 transition">
              <LogOut size={13} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

        {/* ── TAB: TALLERES ── */}
        {activeTab === 'talleres' && (
          <>
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
                  <MetricCard icon={Store}         label="Talleres"         value={m.total_shops}    color="text-amber-400" />
                  <MetricCard icon={Crown}         label="Plan Pro"         value={m.pro_shops}      color="text-amber-400" sub="activos" />
                  <MetricCard icon={Clock}         label="En trial"         value={m.trialing_shops} color="text-blue-400" />
                  <MetricCard icon={Zap}           label="Plan Free"        value={m.free_shops}     color="text-zinc-400" />
                  <MetricCard icon={Inbox}         label="Leads totales"    value={m.total_leads}    color="text-violet-400" />
                  <MetricCard icon={Package}       label="Cotizaciones"     value={m.total_quotes}   color="text-emerald-400" />
                  <MetricCard icon={AlertTriangle} label="Trial por vencer" value={urgentTrials}
                    color="text-red-400" danger={urgentTrials > 0} sub="en ≤ 3 días" />
                </div>
              )}
            </div>

            {/* Tabla de talleres */}
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex-1 min-w-[180px] relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type="text" placeholder="Buscar nombre, email, slug, ciudad..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'free', 'pro', 'trialing', 'canceled'].map(f => (
                    <button key={f} onClick={() => setFilterPlan(f)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                        filterPlan === f ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                      }`}>
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
                          <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filtered.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-600 text-sm">
                          {metricsLoading ? 'Cargando...' : 'No hay talleres que coincidan'}
                        </td></tr>
                      ) : filtered.map((shop, i) => (
                        <ShopRow key={shop.owner_id || i} shop={shop} i={i}
                          updatingPlan={updatingPlan}
                          onPlanChange={handlePlanChange}
                          onDelete={handleDelete}
                          onResetTrial={handleResetTrial}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB: PLANES ── */}
        {activeTab === 'planes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Configuración de planes</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Editá precios, límites y features de cada plan. Los cambios se reflejan en la página de Suscripción de todos los usuarios.
              </p>
            </div>

            {planConfigs.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-600">
                <Settings size={32} strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-sm">No hay planes configurados.</p>
                <p className="text-xs mt-1">Ejecutá el SQL <code>plan_config.sql</code> en Supabase.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {planConfigs.map(plan => (
                  <div key={plan.plan_id}>
                    <AnimatePresence mode="wait">
                      {editingPlan === plan.plan_id ? (
                        <PlanEditor
                          key="editor"
                          plan={plan}
                          onSave={handleSavePlan}
                          onCancel={() => setEditingPlan(null)}
                        />
                      ) : (
                        <motion.div
                          key="card"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: plan.color }} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-white">{plan.name}</h3>
                                  <span className="text-xs text-zinc-600 uppercase tracking-wider">{plan.plan_id}</span>
                                </div>
                                <p className="text-sm text-zinc-400 mt-0.5">
                                  <span className="font-bold text-white text-lg">${Number(plan.price).toLocaleString('es-CL')}</span>
                                  <span className="text-zinc-600"> {plan.currency} / {plan.period}</span>
                                </p>
                              </div>
                            </div>
                            <button onClick={() => setEditingPlan(plan.plan_id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition">
                              <Pencil size={12} /> Editar
                            </button>
                          </div>

                          {/* Límites + features */}
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-xl bg-zinc-800/60 p-3">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Productos</p>
                              <p className="text-sm font-bold text-white">
                                {plan.max_products >= 999999 ? 'Ilimitados' : plan.max_products}
                              </p>
                            </div>
                            <div className="rounded-xl bg-zinc-800/60 p-3">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Clientes</p>
                              <p className="text-sm font-bold text-white">
                                {plan.max_clients >= 999999 ? 'Ilimitados' : plan.max_clients}
                              </p>
                            </div>
                            <div className="rounded-xl bg-zinc-800/60 p-3">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Optimizador</p>
                              <p className={`text-sm font-bold ${plan.can_optimizer ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {plan.can_optimizer ? 'Habilitado' : 'Deshabilitado'}
                              </p>
                            </div>
                            <div className="rounded-xl bg-zinc-800/60 p-3">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Equipo</p>
                              <p className={`text-sm font-bold ${plan.can_workers ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {plan.can_workers ? 'Habilitado' : 'Deshabilitado'}
                              </p>
                            </div>
                          </div>

                          {/* Features */}
                          {plan.features?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {plan.features.map((f, i) => (
                                <span key={i} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300">
                                  <Check size={10} style={{ color: plan.color }} />
                                  {f.label}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Última actualización */}
                          {plan.updated_at && (
                            <p className="text-[10px] text-zinc-700 mt-3">
                              Actualizado: {new Date(plan.updated_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
