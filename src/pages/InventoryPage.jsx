import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes, Plus, Trash2, X, Search, AlertTriangle,
  TrendingUp, TrendingDown, ChevronDown,
  ArrowUpCircle, ArrowDownCircle, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';

// ── Constantes ────────────────────────────────────────────────────
const CATEGORIES = ['melamina', 'herraje', 'canto', 'corredera', 'tornillería', 'vidrio', 'iluminación', 'otro'];
const UNITS = ['unidad', 'plancha', 'metro', 'metro²', 'kg', 'litro', 'caja', 'rollo'];

const EMPTY_MAT = {
  supplier_id: '', name: '', sku: '', category: 'melamina',
  unit: 'unidad', cost: '', stock: '', min_stock: '',
  sheet_width_mm: '', sheet_height_mm: '',
};
const EMPTY_MOV = { material_id: '', type: 'in', quantity: '', note: '' };

const MOV_TYPE = {
  in:         { label: 'Entrada',  icon: ArrowUpCircle,   color: 'text-emerald-400' },
  out:        { label: 'Salida',   icon: ArrowDownCircle, color: 'text-red-400' },
  adjustment: { label: 'Ajuste',   icon: RefreshCw,       color: 'text-blue-400' },
};

// ── Componente stock-badge ────────────────────────────────────────
function StockBadge({ stock, minStock, isDark }) {
  const isLow = Number(stock) <= Number(minStock);
  if (!isLow) return null;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600'}`}>
      Stock bajo
    </span>
  );
}

// ── Barra de stock visual ─────────────────────────────────────────
function StockBar({ stock, minStock, isDark }) {
  const s = Number(stock);
  const m = Number(minStock);
  if (m === 0) return null;
  const pct = Math.min((s / (m * 3)) * 100, 100);
  const color = s <= m ? '#ef4444' : s <= m * 1.5 ? '#f59e0b' : '#10b981';
  return (
    <div className={`h-1.5 rounded-full w-full ${isDark ? 'bg-zinc-700' : 'bg-stone-200'}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ── Modal nuevo material ──────────────────────────────────────────
function MaterialModal({ suppliers, onClose, onSaved, isDark }) {
  const [form, setForm] = useState(EMPTY_MAT);
  const [loading, setLoading] = useState(false);

  const tk = isDark
    ? { bg: 'bg-zinc-950', border: 'border-zinc-800', input: 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500', label: 'text-zinc-400', text: 'text-white', sel: 'bg-zinc-900 border-zinc-700 text-white' }
    : { bg: 'bg-white', border: 'border-stone-200', input: 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500', label: 'text-stone-500', text: 'text-stone-900', sel: 'bg-stone-50 border-stone-300 text-stone-900' };

  function setF(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('materials').insert({
      ...form,
      owner_id: user.id,
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0),
      min_stock: Number(form.min_stock || 0),
      sheet_width_mm: form.sheet_width_mm ? Number(form.sheet_width_mm) : null,
      sheet_height_mm: form.sheet_height_mm ? Number(form.sheet_height_mm) : null,
      supplier_id: form.supplier_id || null,
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    onSaved();
    onClose();
  }

  const InputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${tk.input}`;
  const SelCls   = `w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 ${tk.sel}`;
  const Label    = ({ children }) => <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.label}`}>{children}</label>;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={`${tk.bg} border ${tk.border} rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between p-6 border-b ${tk.border}`}>
          <h2 className={`text-xl font-bold ${tk.text}`}>Nuevo material</h2>
          <button onClick={onClose} className={tk.label}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <Label>Nombre *</Label>
              <input required value={form.name} onChange={(e) => setF('name', e.target.value)}
                placeholder="Ej: Melamina Blanco Nieve 18mm" className={InputCls} />
            </div>
            <div>
              <Label>SKU</Label>
              <input value={form.sku} onChange={(e) => setF('sku', e.target.value)}
                placeholder="MEL-001" className={InputCls} />
            </div>
          </div>

          {/* Categoría + Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoría</Label>
              <div className="relative">
                <select value={form.category} onChange={(e) => setF('category', e.target.value)} className={SelCls}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.label} pointer-events-none`} />
              </div>
            </div>
            <div>
              <Label>Unidad</Label>
              <div className="relative">
                <select value={form.unit} onChange={(e) => setF('unit', e.target.value)} className={SelCls}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
                <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.label} pointer-events-none`} />
              </div>
            </div>
          </div>

          {/* Proveedor */}
          <div>
            <Label>Proveedor</Label>
            <div className="relative">
              <select value={form.supplier_id} onChange={(e) => setF('supplier_id', e.target.value)} className={SelCls}>
                <option value="">— Sin proveedor —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.label} pointer-events-none`} />
            </div>
          </div>

          {/* Costo + Stock + Stock mín */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Costo ($)</Label>
              <input type="number" min="0" value={form.cost} onChange={(e) => setF('cost', e.target.value)} placeholder="0" className={InputCls} />
            </div>
            <div>
              <Label>Stock actual</Label>
              <input type="number" min="0" value={form.stock} onChange={(e) => setF('stock', e.target.value)} placeholder="0" className={InputCls} />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <input type="number" min="0" value={form.min_stock} onChange={(e) => setF('min_stock', e.target.value)} placeholder="0" className={InputCls} />
            </div>
          </div>

          {/* Plancha (opcional) */}
          <div>
            <Label>Medidas plancha — opcional (mm)</Label>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={form.sheet_width_mm} onChange={(e) => setF('sheet_width_mm', e.target.value)} placeholder="Ancho" className={InputCls} />
              <input type="number" value={form.sheet_height_mm} onChange={(e) => setF('sheet_height_mm', e.target.value)} placeholder="Alto" className={InputCls} />
            </div>
          </div>

          <button disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-2xl py-3.5 transition mt-2">
            {loading ? 'Guardando…' : 'Guardar material'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Modal movimiento de stock ─────────────────────────────────────
function MovementModal({ materials, onClose, onSaved, isDark }) {
  const [form, setForm] = useState(EMPTY_MOV);
  const [loading, setLoading] = useState(false);
  const selected = materials.find((m) => m.id === form.material_id);

  const tk = isDark
    ? { bg: 'bg-zinc-950', border: 'border-zinc-800', input: 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500', label: 'text-zinc-400', text: 'text-white', sel: 'bg-zinc-900 border-zinc-700 text-white', info: 'bg-zinc-900 border-zinc-700' }
    : { bg: 'bg-white', border: 'border-stone-200', input: 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500', label: 'text-stone-500', text: 'text-stone-900', sel: 'bg-stone-50 border-stone-300 text-stone-900', info: 'bg-stone-50 border-stone-200' };

  function setF(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  // Calcula nuevo stock preview
  const newStock = useMemo(() => {
    if (!selected) return null;
    const q = Number(form.quantity || 0);
    const s = Number(selected.stock || 0);
    if (form.type === 'in') return s + q;
    if (form.type === 'out') return Math.max(0, s - q);
    if (form.type === 'adjustment') return q;
    return s;
  }, [form.quantity, form.type, selected]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.material_id) return alert('Seleccioná un material');
    const qty = Number(form.quantity || 0);
    if (qty <= 0) return alert('Cantidad debe ser mayor a 0');
    if (form.type === 'out' && newStock < 0) return alert('Stock insuficiente');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('material_movements').insert({
      owner_id: user.id,
      material_id: form.material_id,
      type: form.type,
      quantity: qty,
      note: form.note,
    });
    await supabase.from('materials').update({ stock: newStock }).eq('id', form.material_id);
    setLoading(false);
    onSaved();
    onClose();
  }

  const InputCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${tk.input}`;
  const SelCls   = `w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 ${tk.sel}`;
  const Label    = ({ children }) => <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.label}`}>{children}</label>;


  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={`${tk.bg} border ${tk.border} rounded-3xl w-full max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between p-6 border-b ${tk.border}`}>
          <h2 className={`text-xl font-bold ${tk.text}`}>Registrar entrada / salida</h2>
          <button onClick={onClose} className={tk.label}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Material */}
          <div>
            <Label>Material *</Label>
            <div className="relative">
              <select value={form.material_id} onChange={(e) => setF('material_id', e.target.value)} required className={SelCls}>
                <option value="">— Seleccionar —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock} {m.unit})</option>
                ))}
              </select>
              <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.label} pointer-events-none`} />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <Label>Tipo de movimiento</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(MOV_TYPE).map(([key, { label, icon: Icon, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setF('type', key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition ${
                    form.type === key
                      ? isDark ? 'border-amber-500 bg-amber-500/10' : 'border-amber-500 bg-amber-50'
                      : isDark ? `border-zinc-700 ${tk.bg}` : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <Icon size={16} className={form.type === key ? color : tk.label} />
                  <span className={form.type === key ? tk.text : tk.label}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <Label>Cantidad {selected ? `(${selected.unit})` : ''}</Label>
            <input
              type="number" min="0.01" step="0.01" required
              value={form.quantity} onChange={(e) => setF('quantity', e.target.value)}
              placeholder="0" className={InputCls}
            />
          </div>

          {/* Preview nuevo stock */}
          {selected && form.quantity && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between rounded-xl border p-3 text-sm ${tk.info}`}
            >
              <span className={tk.label}>Stock actual: <strong className={tk.text}>{selected.stock} {selected.unit}</strong></span>
              <span className={tk.label}>→ Nuevo: <strong className={newStock < Number(selected.min_stock) ? 'text-red-400' : 'text-emerald-400'}>{newStock} {selected.unit}</strong></span>
            </motion.div>
          )}

          {/* Nota */}
          <div>
            <Label>Nota (opcional)</Label>
            <input value={form.note} onChange={(e) => setF('note', e.target.value)}
              placeholder="Ej: Compra a proveedor X" className={InputCls} />
          </div>

          <button disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-2xl py-3.5 transition">
            {loading ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function InventoryPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showMatModal, setShowMatModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [movingMat, setMovingMat] = useState(null); // pre-selección

  const tk = isDark ? {
    card:    'bg-zinc-900 border-zinc-800',
    kpi:     'bg-zinc-900 border-zinc-800',
    text:    'text-white',
    sub:     'text-zinc-400',
    search:  'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500',
    tab:     'bg-zinc-900 text-zinc-400 border-zinc-800',
    tabA:    'bg-white text-black',
    row:     'bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/40',
    del:     'text-zinc-600 hover:text-red-400',
  } : {
    card:    'bg-white border-stone-200',
    kpi:     'bg-white border-stone-200',
    text:    'text-stone-900',
    sub:     'text-stone-500',
    search:  'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500',
    tab:     'bg-white text-stone-500 border-stone-200',
    tabA:    'bg-stone-900 text-white',
    row:     'bg-stone-50 hover:bg-stone-100 border-stone-200',
    del:     'text-stone-400 hover:text-red-500',
  };

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: mats }, { data: sups }] = await Promise.all([
      supabase.from('materials').select('*, suppliers(name)').order('name'),
      supabase.from('suppliers').select('id,name').order('name'),
    ]);
    setMaterials(mats || []);
    setSuppliers(sups || []);
  }

  const lowStockCount = useMemo(
    () => materials.filter((m) => Number(m.stock) <= Number(m.min_stock)).length,
    [materials]
  );
  const totalValue = useMemo(
    () => materials.reduce((s, m) => s + Number(m.cost || 0) * Number(m.stock || 0), 0),
    [materials]
  );

  const filtered = useMemo(() => {
    return materials
      .filter((m) => filterCat === 'all' || m.category === filterCat)
      .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) ||
                     m.sku?.toLowerCase().includes(search.toLowerCase()));
  }, [materials, filterCat, search]);

  async function handleDelete(id) {
    if (!confirm('¿Eliminar material?')) return;
    await supabase.from('materials').delete().eq('id', id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  function openMovement(mat = null) {
    setMovingMat(mat);
    setShowMovModal(true);
  }

  // Categorías presentes en el inventario
  const cats = useMemo(() => ['all', ...new Set(materials.map((m) => m.category))], [materials]);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-3xl font-bold ${tk.text}`}>Inventario</h1>
          <p className={`${tk.sub} mt-1`}>Materiales, stock y movimientos del taller.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => openMovement()}
            className={`flex items-center gap-2 border rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
              isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-stone-300 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <ArrowUpCircle size={16} /> Entrada / Salida
          </button>
          <button
            onClick={() => setShowMatModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl px-5 py-2.5 text-sm transition shadow-lg shadow-amber-500/20"
          >
            <Plus size={18} /> Nuevo material
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Materiales',   value: materials.length,                     icon: Boxes,         color: 'text-blue-400',   bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
          { label: 'Stock bajo',   value: lowStockCount,                        icon: AlertTriangle, color: 'text-red-400',    bg: isDark ? 'bg-red-500/10' : 'bg-red-50' },
          { label: 'Proveedores',  value: suppliers.length,                     icon: TrendingUp,    color: 'text-violet-400', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
          { label: 'Valor total',  value: `$${totalValue.toLocaleString('es-AR')}`, icon: TrendingDown, color: 'text-emerald-400', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-5 ${tk.kpi}`}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className={`text-xs ${tk.sub} mb-1`}>{label}</p>
            <p className={`text-2xl font-bold ${tk.text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Búsqueda + filtros ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tk.sub}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className={`w-full rounded-2xl border pl-9 pr-4 py-2.5 text-sm outline-none transition ${tk.search}`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition border capitalize ${
                filterCat === cat ? tk.tabA : tk.tab
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabla de materiales ── */}
      {filtered.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 ${tk.sub}`}>
          <Boxes size={40} strokeWidth={1} />
          <p className="text-sm">{search ? 'Sin resultados' : 'No hay materiales todavía'}</p>
        </div>
      ) : (
        <div className={`rounded-3xl border ${tk.card} overflow-hidden`}>
          <div className="overflow-x-auto">
          {/* Encabezado tabla */}
          <div className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs uppercase tracking-wider ${tk.sub} border-b ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-stone-200 bg-stone-50'} min-w-[480px]`}>
            <span>Material</span>
            <span className="text-right w-20">Costo</span>
            <span className="text-right w-24">Stock</span>
            <span className="w-32 hidden md:block">Barra</span>
            <span className="w-24 hidden md:block">Proveedor</span>
            <span className="w-16" />
          </div>

          <div className="divide-y divide-transparent">
            <AnimatePresence>
              {filtered.map((mat, i) => {
                const isLow = Number(mat.stock) <= Number(mat.min_stock);
                return (
                  <motion.div
                    key={mat.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-4 items-center border-b last:border-0 transition ${tk.row} ${isDark ? 'border-zinc-800/50' : 'border-stone-100'} min-w-[480px]`}
                  >
                    {/* Nombre + cat + badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm ${tk.text} truncate`}>{mat.name}</p>
                        <StockBadge stock={mat.stock} minStock={mat.min_stock} isDark={isDark} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-stone-100 text-stone-600'}`}>
                          {mat.category}
                        </span>
                        {mat.sku && <span className={`text-[10px] ${tk.sub}`}>{mat.sku}</span>}
                        {mat.sheet_width_mm && (
                          <span className={`text-[10px] ${tk.sub}`}>{mat.sheet_width_mm}×{mat.sheet_height_mm}mm</span>
                        )}
                      </div>
                    </div>

                    {/* Costo */}
                    <div className="text-right w-20">
                      <p className={`text-sm font-medium ${tk.text}`}>${Number(mat.cost).toLocaleString('es-AR')}</p>
                      <p className={`text-[10px] ${tk.sub}`}>/{mat.unit}</p>
                    </div>

                    {/* Stock */}
                    <div className="text-right w-24">
                      <p className={`text-sm font-bold ${isLow ? 'text-red-400' : tk.text}`}>
                        {mat.stock} <span className={`text-xs font-normal ${tk.sub}`}>{mat.unit}</span>
                      </p>
                      <p className={`text-[10px] ${tk.sub}`}>mín: {mat.min_stock}</p>
                    </div>

                    {/* Barra */}
                    <div className="w-32 hidden md:block">
                      <StockBar stock={mat.stock} minStock={mat.min_stock} isDark={isDark} />
                    </div>

                    {/* Proveedor */}
                    <p className={`text-xs w-24 truncate hidden md:block ${tk.sub}`}>
                      {mat.suppliers?.name || '—'}
                    </p>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 w-16 justify-end">
                      <button
                        onClick={() => openMovement(mat)}
                        title="Registrar entrada / salida"
                        className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-zinc-700 text-zinc-500 hover:text-amber-400' : 'hover:bg-stone-200 text-stone-400 hover:text-amber-600'}`}
                      >
                        <ArrowUpCircle size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(mat.id)}
                        title="Eliminar"
                        className={`p-2 rounded-xl transition ${tk.del}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      <AnimatePresence>
        {showMatModal && (
          <MaterialModal
            suppliers={suppliers}
            onClose={() => setShowMatModal(false)}
            onSaved={fetchData}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMovModal && (
          <MovementModal
            materials={movingMat ? [movingMat, ...materials.filter((m) => m.id !== movingMat.id)] : materials}
            onClose={() => { setShowMovModal(false); setMovingMat(null); }}
            onSaved={fetchData}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
