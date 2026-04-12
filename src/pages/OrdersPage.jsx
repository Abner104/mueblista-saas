import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Plus, ChevronDown, X,
  Truck, Wrench, DollarSign, HardHat,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';

const PROD_STATUSES = [
  { value: 'pending',       label: 'Pendiente',     color: 'bg-zinc-500/20 text-zinc-300',      lcolor: 'bg-zinc-100 text-zinc-600' },
  { value: 'confirmed',     label: 'Confirmada',    color: 'bg-blue-500/20 text-blue-300',      lcolor: 'bg-blue-100 text-blue-700' },
  { value: 'in_production', label: 'En producción', color: 'bg-amber-500/20 text-amber-300',    lcolor: 'bg-amber-100 text-amber-700' },
  { value: 'delivered',     label: 'Entregada',     color: 'bg-violet-500/20 text-violet-300',  lcolor: 'bg-violet-100 text-violet-700' },
  { value: 'paid',          label: 'Pagada',        color: 'bg-emerald-500/20 text-emerald-300',lcolor: 'bg-emerald-100 text-emerald-700' },
];
const PAY_STATUSES = [
  { value: 'unpaid',  label: 'Sin pago', color: 'bg-red-500/20 text-red-300',        lcolor: 'bg-red-100 text-red-700' },
  { value: 'partial', label: 'Parcial',  color: 'bg-amber-500/20 text-amber-300',    lcolor: 'bg-amber-100 text-amber-700' },
  { value: 'paid',    label: 'Pagado',   color: 'bg-emerald-500/20 text-emerald-300',lcolor: 'bg-emerald-100 text-emerald-700' },
];

// ── Modal nueva orden ─────────────────────────────────────────────
function NewOrderModal({ onClose, onCreated, isDark, maestros }) {
  const [quotes,        setQuotes]        = useState([]);
  const [selectedQuote, setSelectedQuote] = useState('');
  const [amount,        setAmount]        = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [workerId,      setWorkerId]      = useState('');
  const [saving,        setSaving]        = useState(false);

  const tk = isDark
    ? { bg: 'bg-zinc-950', border: 'border-zinc-800', input: 'bg-zinc-900 border-zinc-700 text-white', sub: 'text-zinc-400', text: 'text-white' }
    : { bg: 'bg-white',    border: 'border-stone-200', input: 'bg-stone-50 border-stone-300 text-stone-900', sub: 'text-stone-500', text: 'text-stone-900' };

  useEffect(() => {
    supabase.from('quotes').select('id, title, total, clients(name)')
      .in('status', ['approved', 'sent', 'draft'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setQuotes(data || []));
  }, []);

  function handleQuoteSelect(id) {
    setSelectedQuote(id);
    const q = quotes.find(q => q.id === id);
    if (q) setAmount(q.total);
  }

  async function handleCreate() {
    if (!selectedQuote) return alert('Seleccioná una cotización');
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('sales').insert({
      owner_id: authData.user.id,
      quote_id: selectedQuote,
      status: 'confirmed',
      amount: Number(amount),
      payment_status: 'unpaid',
      due_date: dueDate || null,
      assigned_worker_id: workerId ? Number(workerId) : null,
    }).select().single();
    if (error) { setSaving(false); return alert(error.message); }
    await supabase.from('quotes').update({ status: 'approved' }).eq('id', selectedQuote);
    setSaving(false);
    onCreated();
    onClose();
  }

  const inputCls = `w-full appearance-none ${tk.input} border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={`${tk.bg} border ${tk.border} rounded-3xl w-full max-w-md p-6 space-y-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${tk.text}`}>Nueva orden</h2>
          <button onClick={onClose} className={tk.sub}><X size={20} /></button>
        </div>

        {/* Cotización */}
        <div>
          <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Cotización *</label>
          <div className="relative">
            <select value={selectedQuote} onChange={e => handleQuoteSelect(e.target.value)} className={inputCls}>
              <option value="">— Seleccionar —</option>
              {quotes.map(q => <option key={q.id} value={q.id}>{q.title} · ${Number(q.total).toLocaleString('es-AR')}</option>)}
            </select>
            <ChevronDown size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
          </div>
        </div>

        {/* Monto */}
        <div>
          <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Monto ($)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls.replace('appearance-none', '')} />
        </div>

        {/* Fecha entrega */}
        <div>
          <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Fecha límite de entrega</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls.replace('appearance-none', '')} />
        </div>

        {/* Asignar maestro */}
        {maestros.length > 0 && (
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Asignar maestro</label>
            <div className="relative">
              <select value={workerId} onChange={e => setWorkerId(e.target.value)} className={inputCls}>
                <option value="">— Sin asignar —</option>
                {maestros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
            </div>
          </div>
        )}

        <button onClick={handleCreate} disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-2xl py-3.5 transition">
          {saving ? 'Creando…' : 'Crear orden'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Tarjeta de orden ──────────────────────────────────────────────
function OrderCard({ sale, maestros, onUpdate, isDark }) {
  const [prodStatus, setProdStatus] = useState(sale.status);
  const [payStatus,  setPayStatus]  = useState(sale.payment_status);
  const [workerId,   setWorkerId]   = useState(sale.assigned_worker_id ?? '');
  const [updating,   setUpdating]   = useState(false);

  const tk = isDark
    ? { card: 'bg-zinc-900 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', sel: 'bg-zinc-800 border-zinc-700 text-white', worker: 'bg-zinc-800/60 border-zinc-700' }
    : { card: 'bg-white border-stone-200',   text: 'text-stone-900', sub: 'text-stone-500', sel: 'bg-stone-50 border-stone-300 text-stone-900', worker: 'bg-stone-50 border-stone-200' };

  async function updateProd(val) {
    setUpdating(true);
    setProdStatus(val);
    await supabase.from('sales').update({ status: val }).eq('id', sale.id);
    setUpdating(false);
    onUpdate();
  }

  async function updatePay(val) {
    setUpdating(true);
    setPayStatus(val);
    await supabase.from('sales').update({ payment_status: val }).eq('id', sale.id);
    setUpdating(false);
  }

  async function updateWorker(val) {
    setUpdating(true);
    setWorkerId(val);
    await supabase.from('sales')
      .update({ assigned_worker_id: val ? Number(val) : null })
      .eq('id', sale.id);
    setUpdating(false);
  }

  const prodInfo    = PROD_STATUSES.find(s => s.value === prodStatus) || PROD_STATUSES[0];
  const payInfo     = PAY_STATUSES.find(s  => s.value === payStatus)  || PAY_STATUSES[0];
  const assignedMae = maestros.find(m => m.id === Number(workerId));

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${tk.card} space-y-4`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className={`font-bold ${tk.text}`}>
            {sale.quotes?.title || `Orden #${String(sale.id).slice(0, 8)}`}
          </p>
          <p className={`text-sm ${tk.sub}`}>
            {sale.clients?.name || '—'}
            {sale.due_date && ` · Entrega: ${new Date(sale.due_date).toLocaleDateString('es-AR')}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? prodInfo.color : prodInfo.lcolor}`}>{prodInfo.label}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? payInfo.color : payInfo.lcolor}`}>{payInfo.label}</span>
        </div>
      </div>

      {/* Monto */}
      <div className="flex items-center gap-2">
        <DollarSign size={15} className="text-amber-400" />
        <span className={`font-bold text-lg ${tk.text}`}>${Number(sale.amount).toLocaleString('es-AR')}</span>
      </div>

      {/* Maestro asignado */}
      {maestros.length > 0 && (
        <div className={`rounded-xl border p-3 flex items-center gap-3 ${tk.worker}`}>
          <HardHat size={15} className={assignedMae ? 'text-amber-500' : tk.sub} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Maestro asignado</p>
            <div className="relative">
              <select
                value={workerId}
                onChange={e => updateWorker(e.target.value)}
                disabled={updating}
                className={`w-full appearance-none ${tk.sel} border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 transition`}
              >
                <option value="">— Sin asignar —</option>
                {maestros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
            </div>
          </div>
        </div>
      )}

      {/* Selectores estado + pago */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Producción</label>
          <div className="relative">
            <select value={prodStatus} onChange={e => updateProd(e.target.value)} disabled={updating}
              className={`w-full appearance-none ${tk.sel} border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition`}>
              {PROD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
          </div>
        </div>
        <div>
          <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Pago</label>
          <div className="relative">
            <select value={payStatus} onChange={e => updatePay(e.target.value)} disabled={updating}
              className={`w-full appearance-none ${tk.sel} border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition`}>
              {PAY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function OrdersPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [sales,        setSales]        = useState([]);
  const [maestros,     setMaestros]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showNew,      setShowNew]      = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const tk = isDark
    ? { text: 'text-white', sub: 'text-zinc-400', tab: 'bg-zinc-900 text-zinc-400 border-zinc-800', tabActive: 'bg-white text-black' }
    : { text: 'text-stone-900', sub: 'text-stone-500', tab: 'bg-white text-stone-500 border-stone-200', tabActive: 'bg-stone-900 text-white' };

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: salesData }, { data: workersData }] = await Promise.all([
      supabase.from('sales')
        .select('*, clients(name), quotes(title, quote_items(*))')
        .order('created_at', { ascending: false }),
      supabase.from('workers')
        .select('id, name, worker_role')
        .eq('worker_role', 'maestro')
        .eq('status', 'active'),
    ]);
    setSales(salesData || []);
    setMaestros(workersData || []);
    setLoading(false);
  }

  const filtered = filterStatus === 'all' ? sales : sales.filter(s => s.status === filterStatus);

  const kpis = [
    { label: 'Total órdenes', value: sales.length,                                                           icon: ClipboardList },
    { label: 'En producción', value: sales.filter(s => s.status === 'in_production').length,                 icon: Wrench },
    { label: 'Entregadas',    value: sales.filter(s => s.status === 'delivered' || s.status === 'paid').length, icon: Truck },
    { label: 'Sin cobrar',    value: sales.filter(s => s.payment_status === 'unpaid').length,                icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${tk.text}`}>Órdenes de producción</h1>
          <p className={`${tk.sub} mt-1`}>Seguimiento de ventas y estado de fabricación.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl px-5 py-3 transition shadow-lg shadow-amber-500/20 shrink-0">
          <Plus size={18} /> Nueva orden
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className={`rounded-2xl border p-5 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={15} className="text-amber-400" />
              <p className={`text-xs ${tk.sub}`}>{label}</p>
            </div>
            <p className={`text-3xl font-bold ${tk.text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todas'], ...PROD_STATUSES.map(s => [s.value, s.label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${filterStatus === val ? tk.tabActive : tk.tab}`}>
            {label}
            {val !== 'all' && <span className="ml-1.5 text-xs opacity-60">{sales.filter(s => s.status === val).length}</span>}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 ${tk.sub}`}>
          <ClipboardList size={40} strokeWidth={1} />
          <p className="text-sm">No hay órdenes todavía</p>
          <button onClick={() => setShowNew(true)}
            className="mt-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl px-4 py-2 text-sm font-medium">
            Crear primera orden
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(sale => (
              <OrderCard key={sale.id} sale={sale} maestros={maestros} onUpdate={fetchAll} isDark={isDark} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showNew && (
          <NewOrderModal onClose={() => setShowNew(false)} onCreated={fetchAll} isDark={isDark} maestros={maestros} />
        )}
      </AnimatePresence>
    </div>
  );
}
