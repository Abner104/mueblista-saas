import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Plus, ChevronDown, X,
  Truck, Wrench, DollarSign, HardHat,
  CheckSquare, Square, ListChecks, Users, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';
import { formatCurrency, formatDate } from '../lib/formatters';
import { useShopCountry } from '../lib/useShopCountry';

// Etapas del checklist — cubren instalación en sitio (PVC, drywall) además
// de fabricación de mueble a medida.
const TASK_STAGES = [
  { value: 'medicion',     label: 'Medición' },
  { value: 'materiales',   label: 'Materiales' },
  { value: 'instalacion',  label: 'Instalación' },
  { value: 'entrega',      label: 'Entrega' },
  { value: 'otro',         label: 'Otro' },
];

const DEFAULT_TASKS = [
  { stage: 'medicion',    label: 'Visita técnica / medición en sitio' },
  { stage: 'materiales',  label: 'Materiales reservados' },
  { stage: 'materiales',  label: 'Materiales en obra' },
  { stage: 'instalacion', label: 'Instalación completada' },
  { stage: 'entrega',     label: 'Entrega y conformidad del cliente' },
];

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
function NewOrderModal({ onClose, onCreated, isDark, maestros, country }) {
  const [quotes,        setQuotes]        = useState([]);
  const [selectedQuote, setSelectedQuote] = useState('');
  const [amount,        setAmount]        = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [workerIds,     setWorkerIds]     = useState([]); // asignación múltiple
  const [useDefaultTasks, setUseDefaultTasks] = useState(true);
  const [saving,        setSaving]        = useState(false);

  const tk = isDark
    ? { bg: 'bg-zinc-950', border: 'border-zinc-800', input: 'bg-zinc-900 border-zinc-700 text-white', sub: 'text-zinc-400', text: 'text-white' }
    : { bg: 'bg-white',    border: 'border-stone-200', input: 'bg-stone-50 border-stone-300 text-stone-900', sub: 'text-stone-500', text: 'text-stone-900' };

  useEffect(() => {
    // "approved" queda afuera a propósito: aprobar una cotización ya crea
    // su orden automáticamente (QuotesPage.jsx). Ofrecerla acá también
    // llevaba a crear una segunda orden duplicada para el mismo trabajo.
    supabase.from('quotes').select('id, title, total, client_id, clients(name)')
      .in('status', ['sent', 'draft'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setQuotes(data || []));
  }, []);

  function handleQuoteSelect(id) {
    setSelectedQuote(id);
    const q = quotes.find(q => q.id === id);
    if (q) setAmount(q.total);
  }

  function toggleWorker(id) {
    setWorkerIds(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  }

  async function handleCreate() {
    if (!selectedQuote) return alert('Seleccioná una cotización');
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const ownerId = authData.user.id;
    const quote = quotes.find(q => q.id === selectedQuote);

    const { data: sale, error } = await supabase.from('sales').insert({
      owner_id: ownerId,
      quote_id: selectedQuote,
      client_id: quote?.client_id || null,
      status: 'confirmed',
      amount: Number(amount),
      payment_status: 'unpaid',
      due_date: dueDate || null,
      assigned_worker_id: workerIds[0] || null, // responsable principal (compat)
    }).select().single();
    if (error) { setSaving(false); return alert(error.message); }

    if (workerIds.length > 0) {
      await supabase.from('order_assignments').insert(
        workerIds.map(worker_id => ({ sale_id: sale.id, worker_id, owner_id: ownerId }))
      );
    }

    if (useDefaultTasks) {
      await supabase.from('order_tasks').insert(
        DEFAULT_TASKS.map((t, i) => ({ sale_id: sale.id, owner_id: ownerId, stage: t.stage, label: t.label, sort_order: i }))
      );
    }

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
              {quotes.map(q => <option key={q.id} value={q.id}>{q.title} · {formatCurrency(q.total, country)}</option>)}
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

        {/* Asignar equipo — multi-selección, un cielo raso o closet se instala entre varios */}
        {maestros.length > 0 && (
          <div>
            <label className={`block text-xs uppercase tracking-wider mb-1.5 ${tk.sub}`}>
              Asignar equipo <span className="normal-case opacity-70">(elegí uno o más)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {maestros.map(m => {
                const active = workerIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleWorker(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      active
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : isDark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <HardHat size={12} /> {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Checklist por defecto */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setUseDefaultTasks(v => !v)}
            className={`relative w-9 h-5 rounded-full border transition-colors shrink-0 ${useDefaultTasks ? 'bg-amber-500 border-amber-500' : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-stone-200 border-stone-300'}`}
          >
            <motion.div animate={{ x: useDefaultTasks ? 16 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow" />
          </div>
          <span className={`text-xs ${tk.sub}`}>Crear checklist estándar (medición, materiales, instalación, entrega)</span>
        </label>

        <button onClick={handleCreate} disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-2xl py-3.5 transition">
          {saving ? 'Creando…' : 'Crear orden'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Checklist de una orden ─────────────────────────────────────────
function TaskChecklist({ saleId, isDark }) {
  const [tasks, setTasks] = useState(null); // null = cargando
  const [newLabel, setNewLabel] = useState('');
  const [newStage, setNewStage] = useState('otro');

  const tk = isDark
    ? { row: 'border-zinc-800', sub: 'text-zinc-500', text: 'text-white', input: 'bg-zinc-800 border-zinc-700 text-white', sel: 'bg-zinc-800 border-zinc-700 text-white' }
    : { row: 'border-stone-100', sub: 'text-stone-500', text: 'text-stone-900', input: 'bg-stone-50 border-stone-300 text-stone-900', sel: 'bg-stone-50 border-stone-300 text-stone-900' };

  useEffect(() => { fetchTasks(); }, [saleId]);

  async function fetchTasks() {
    const { data } = await supabase.from('order_tasks')
      .select('*').eq('sale_id', saleId).order('sort_order');
    setTasks(data || []);
  }

  async function toggleTask(task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    await supabase.from('order_tasks')
      .update({ done: !task.done, done_at: !task.done ? new Date().toISOString() : null })
      .eq('id', task.id);
  }

  async function addTask() {
    if (!newLabel.trim()) return;
    const { data: authData } = await supabase.auth.getUser();
    const sortOrder = tasks?.length || 0;
    const { data } = await supabase.from('order_tasks').insert({
      sale_id: saleId, owner_id: authData.user.id,
      stage: newStage, label: newLabel.trim(), sort_order: sortOrder,
    }).select().single();
    if (data) setTasks(prev => [...prev, data]);
    setNewLabel('');
  }

  async function removeTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('order_tasks').delete().eq('id', id);
  }

  if (tasks === null) {
    return <div className={`text-xs ${tk.sub} py-3 text-center`}>Cargando checklist…</div>;
  }

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="space-y-3">
      {tasks.length > 0 && (
        <p className={`text-xs ${tk.sub}`}>{doneCount}/{tasks.length} tareas completadas</p>
      )}

      <div className="space-y-1.5">
        {TASK_STAGES.map(stage => {
          const stageTasks = tasks.filter(t => t.stage === stage.value);
          if (stageTasks.length === 0) return null;
          return (
            <div key={stage.value}>
              <p className={`text-[10px] uppercase tracking-wider ${tk.sub} mt-2 mb-1`}>{stage.label}</p>
              {stageTasks.map(task => (
                <div key={task.id} className={`flex items-center gap-2 py-1.5 border-b ${tk.row} group`}>
                  <button onClick={() => toggleTask(task)} className="shrink-0">
                    {task.done
                      ? <CheckSquare size={16} className="text-emerald-500" />
                      : <Square size={16} className={tk.sub} />}
                  </button>
                  <span className={`text-sm flex-1 ${task.done ? `line-through ${tk.sub}` : tk.text}`}>{task.label}</span>
                  <button onClick={() => removeTask(task.id)}
                    className={`opacity-0 group-hover:opacity-100 transition shrink-0 ${tk.sub} hover:text-red-400`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Agregar tarea */}
      <div className="flex gap-2 pt-1">
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Nueva tarea…"
          className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 transition ${tk.input}`}
        />
        <div className="relative shrink-0 w-28">
          <select value={newStage} onChange={e => setNewStage(e.target.value)}
            className={`w-full appearance-none rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-amber-500 transition ${tk.sel}`}>
            {TASK_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={addTask} className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-2.5 transition">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta de orden ──────────────────────────────────────────────
function OrderCard({ sale, maestros, onUpdate, isDark, country }) {
  const [prodStatus, setProdStatus] = useState(sale.status);
  const [payStatus,  setPayStatus]  = useState(sale.payment_status);
  const [assignedIds, setAssignedIds] = useState(null); // null = cargando
  const [updating,   setUpdating]   = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const tk = isDark
    ? { card: 'bg-zinc-900 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', sel: 'bg-zinc-800 border-zinc-700 text-white', worker: 'bg-zinc-800/60 border-zinc-700' }
    : { card: 'bg-white border-stone-200',   text: 'text-stone-900', sub: 'text-stone-500', sel: 'bg-stone-50 border-stone-300 text-stone-900', worker: 'bg-stone-50 border-stone-200' };

  useEffect(() => { fetchAssignments(); }, [sale.id]);

  async function fetchAssignments() {
    const { data } = await supabase.from('order_assignments').select('worker_id').eq('sale_id', sale.id);
    setAssignedIds((data || []).map(a => a.worker_id));
  }

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

  async function toggleAssigned(workerId) {
    const isAssigned = assignedIds.includes(workerId);
    setUpdating(true);
    if (isAssigned) {
      setAssignedIds(prev => prev.filter(id => id !== workerId));
      await supabase.from('order_assignments').delete().eq('sale_id', sale.id).eq('worker_id', workerId);
    } else {
      setAssignedIds(prev => [...prev, workerId]);
      const { data: authData } = await supabase.auth.getUser();
      await supabase.from('order_assignments').insert({ sale_id: sale.id, worker_id: workerId, owner_id: authData.user.id });
    }
    // Mantener assigned_worker_id (compat) apuntando al primero del equipo
    const next = isAssigned ? assignedIds.filter(id => id !== workerId) : [...assignedIds, workerId];
    await supabase.from('sales').update({ assigned_worker_id: next[0] || null }).eq('id', sale.id);
    setUpdating(false);
  }

  const prodInfo = PROD_STATUSES.find(s => s.value === prodStatus) || PROD_STATUSES[0];
  const payInfo  = PAY_STATUSES.find(s  => s.value === payStatus)  || PAY_STATUSES[0];
  const assignedWorkers = maestros.filter(m => (assignedIds || []).includes(m.id));

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
            {sale.due_date && ` · Entrega: ${formatDate(sale.due_date, country, { day: '2-digit', month: 'short', year: 'numeric' })}`}
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
        <span className={`font-bold text-lg ${tk.text}`}>{formatCurrency(sale.amount, country)}</span>
      </div>

      {/* Equipo asignado — multi-selección */}
      {maestros.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${tk.worker}`}>
          <div className="flex items-center gap-2">
            <Users size={14} className={assignedWorkers.length ? 'text-amber-500' : tk.sub} />
            <p className={`text-xs uppercase tracking-wider ${tk.sub}`}>
              Equipo asignado {assignedWorkers.length > 0 && `(${assignedWorkers.length})`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {maestros.map(m => {
              const active = (assignedIds || []).includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleAssigned(m.id)}
                  disabled={updating || assignedIds === null}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition disabled:opacity-50 ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-500'
                      : isDark ? 'border-zinc-700 text-zinc-500 hover:bg-zinc-800' : 'border-stone-300 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <HardHat size={10} /> {m.name}
                </button>
              );
            })}
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

      {/* Checklist expandible */}
      <div className={`pt-1 border-t ${isDark ? 'border-zinc-800' : 'border-stone-100'}`}>
        <button
          onClick={() => setShowChecklist(v => !v)}
          className={`flex items-center gap-2 text-xs font-medium py-2 w-full ${tk.sub} hover:${tk.text} transition`}
        >
          <ListChecks size={14} />
          {showChecklist ? 'Ocultar checklist' : 'Ver checklist de tareas'}
          <ChevronDown size={12} className={`ml-auto transition-transform ${showChecklist ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showChecklist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-1 pb-1">
                <TaskChecklist saleId={sale.id} isDark={isDark} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function OrdersPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const country = useShopCountry();
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${tk.text}`}>Órdenes de producción</h1>
          <p className={`${tk.sub} mt-1`}>Seguimiento de ventas y estado de fabricación.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl px-5 py-3 transition shadow-lg shadow-amber-500/20 shrink-0 w-full sm:w-auto">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(sale => (
              <OrderCard key={sale.id} sale={sale} maestros={maestros} onUpdate={fetchAll} isDark={isDark} country={country} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showNew && (
          <NewOrderModal onClose={() => setShowNew(false)} onCreated={fetchAll} isDark={isDark} maestros={maestros} country={country} />
        )}
      </AnimatePresence>
    </div>
  );
}
