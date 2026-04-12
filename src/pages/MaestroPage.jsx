import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardHat, ClipboardList, Wrench, CheckCircle2,
  ChevronRight, Package, LogOut, Sun, Moon,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useRoleStore } from '../store/roleStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';

const PROD_STATUSES = [
  { value: 'confirmed',     label: 'Confirmada',    next: 'in_production', nextLabel: 'Iniciar producción', color: 'bg-blue-500/20 text-blue-300',    lcolor: 'bg-blue-100 text-blue-700' },
  { value: 'in_production', label: 'En producción', next: 'delivered',     nextLabel: 'Marcar entregada',   color: 'bg-amber-500/20 text-amber-300',  lcolor: 'bg-amber-100 text-amber-700' },
  { value: 'delivered',     label: 'Entregada',     next: null,            nextLabel: null,                 color: 'bg-violet-500/20 text-violet-300',lcolor: 'bg-violet-100 text-violet-700' },
  { value: 'paid',          label: 'Pagada',        next: null,            nextLabel: null,                 color: 'bg-emerald-500/20 text-emerald-300',lcolor: 'bg-emerald-100 text-emerald-700' },
];

function OrderCard({ sale, onUpdate, isDark }) {
  const [updating, setUpdating] = useState(false);
  const statusInfo = PROD_STATUSES.find(s => s.value === sale.status) || PROD_STATUSES[0];

  const tk = isDark
    ? { card: 'bg-zinc-900 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', detail: 'bg-zinc-800/60 border-zinc-700' }
    : { card: 'bg-white border-stone-200',   text: 'text-stone-900', sub: 'text-stone-500', detail: 'bg-stone-50 border-stone-200' };

  async function advance() {
    if (!statusInfo.next) return;
    setUpdating(true);
    await supabase.from('sales').update({ status: statusInfo.next }).eq('id', sale.id);
    setUpdating(false);
    onUpdate();
  }

  const items = sale.quotes?.quote_items || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 space-y-4 ${tk.card}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className={`font-bold text-lg ${tk.text}`}>
            {sale.quotes?.title || `Orden #${sale.id.toString().slice(0, 6)}`}
          </p>
          <p className={`text-sm ${tk.sub}`}>{sale.clients?.name || '—'}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? statusInfo.color : statusInfo.lcolor}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Dimensiones */}
      {sale.quotes && (
        <div className={`rounded-xl border p-3 text-xs ${tk.detail}`}>
          <p className={`font-medium mb-1 ${tk.text}`}>{sale.quotes.furniture_type}</p>
          <p className={tk.sub}>
            {sale.quotes.width_mm} × {sale.quotes.height_mm} × {sale.quotes.depth_mm} mm
          </p>
        </div>
      )}

      {/* Lista de materiales */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          <p className={`text-xs uppercase tracking-wider ${tk.sub}`}>Materiales</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Package size={13} className="text-amber-500 shrink-0" />
              <span className={tk.text}>{item.description}</span>
              <span className={`ml-auto ${tk.sub}`}>× {item.quantity} {item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fecha entrega */}
      {sale.due_date && (
        <p className={`text-xs ${tk.sub}`}>
          Entrega: <span className={`font-medium ${tk.text}`}>{new Date(sale.due_date).toLocaleDateString('es-AR')}</span>
        </p>
      )}

      {/* Botón avanzar estado */}
      {statusInfo.next && (
        <button
          onClick={advance}
          disabled={updating}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition ${
            statusInfo.next === 'in_production'
              ? 'bg-amber-500 hover:bg-amber-400 text-black'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          } disabled:opacity-50`}
        >
          {updating ? 'Actualizando…' : statusInfo.nextLabel}
          <ChevronRight size={16} />
        </button>
      )}
      {!statusInfo.next && (
        <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm py-2">
          <CheckCircle2 size={16} />
          Orden completada
        </div>
      )}
    </motion.div>
  );
}

export default function MaestroPage() {
  const { worker } = useRoleStore();
  const logout     = useAuthStore(s => s.logout);
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilter] = useState('active'); // 'active' | 'done'

  const tk = isDark
    ? { bg: 'bg-zinc-950', header: 'bg-zinc-950 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', tab: 'bg-zinc-900 border-zinc-800 text-zinc-400', tabA: 'bg-white text-black', toggle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' }
    : { bg: 'bg-stone-100', header: 'bg-white border-stone-200',  text: 'text-stone-900', sub: 'text-stone-500', tab: 'bg-white border-stone-200 text-stone-500', tabA: 'bg-stone-900 text-white', toggle: 'bg-stone-200 hover:bg-stone-300 text-stone-600' };

  useEffect(() => { fetchOrders(); }, [worker]);

  async function fetchOrders() {
    setLoading(true);
    let query = supabase
      .from('sales')
      .select('*, clients(name), quotes(title, furniture_type, width_mm, height_mm, depth_mm, quote_items(*))')
      .order('created_at', { ascending: false });

    // Si está asignado a este maestro específicamente
    if (worker?.id) {
      query = query.eq('assigned_worker_id', worker.id);
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const activeOrders = orders.filter(o => !['delivered', 'paid'].includes(o.status));
  const doneOrders   = orders.filter(o =>  ['delivered', 'paid'].includes(o.status));
  const shown        = filterStatus === 'active' ? activeOrders : doneOrders;

  return (
    <div className={`min-h-screen ${tk.bg} ${tk.text}`}>

      {/* Header */}
      <header className={`sticky top-0 z-10 border-b ${tk.header} backdrop-blur-xl px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
            <HardHat size={18} className="text-black" />
          </div>
          <div>
            <p className={`font-bold leading-tight ${tk.text}`}>{worker?.name || 'Maestro'}</p>
            <p className={`text-xs ${tk.sub}`}>Vista de producción</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className={`rounded-xl p-2 transition ${tk.toggle}`}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={handleLogout} className={`rounded-xl p-2 transition ${tk.toggle}`}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Wrench size={14} className="text-amber-500" />
              <p className={`text-xs ${tk.sub}`}>En producción</p>
            </div>
            <p className={`text-3xl font-bold ${tk.text}`}>{activeOrders.length}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <p className={`text-xs ${tk.sub}`}>Completadas</p>
            </div>
            <p className={`text-3xl font-bold ${tk.text}`}>{doneOrders.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[['active', `Activas (${activeOrders.length})`], ['done', `Completadas (${doneOrders.length})`]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${filterStatus === val ? tk.tabA : tk.tab}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Órdenes */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className={`flex flex-col items-center py-16 gap-3 ${tk.sub}`}>
            <ClipboardList size={40} strokeWidth={1} />
            <p className="text-sm">{filterStatus === 'active' ? 'No tenés órdenes activas' : 'Sin órdenes completadas'}</p>
          </div>
        ) : (
          <AnimatePresence>
            {shown.map(sale => (
              <OrderCard key={sale.id} sale={sale} onUpdate={fetchOrders} isDark={isDark} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
