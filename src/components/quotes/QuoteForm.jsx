import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, Search, FileText, Package } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { calculateQuote } from '../../lib/quoteCalculator';
import { useThemeStore } from '../../store/themeStore';

const FURNITURE_TYPES = ['Closet', 'Cocina', 'Baño', 'Biblioteca', 'Escritorio', 'Comedor', 'Sala', 'Oficina', 'Otro'];

export default function QuoteForm({ onSaved, prefill }) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const tk = isDark ? {
    label:    'text-zinc-400',
    input:    'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500',
    inputSm:  'bg-zinc-800 border-zinc-700 text-white focus:border-amber-500',
    section:  'border-zinc-800 bg-zinc-900/50',
    secTitle: 'text-zinc-200',
    dropdown: 'border-zinc-700 bg-zinc-950',
    dropItem: 'hover:bg-zinc-800 text-white',
    dropSub:  'text-zinc-500',
    divider:  'divide-zinc-800/50',
    thColor:  'text-zinc-500',
    thBorder: 'border-zinc-800',
    tdText:   'text-white',
    summary:  'border-amber-500/20 bg-amber-500/5',
    sumRow:   'text-zinc-400',
    sumDiv:   'border-zinc-700/50',
    totalRow: 'text-white',
    totalAnim:{ initial: '#f59e0b', animate: '#ffffff' },
  } : {
    label:    'text-stone-500',
    input:    'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500',
    inputSm:  'bg-stone-100 border-stone-300 text-stone-900 focus:border-amber-500',
    section:  'border-stone-200 bg-stone-50',
    secTitle: 'text-stone-800',
    dropdown: 'border-stone-200 bg-white shadow-lg',
    dropItem: 'hover:bg-stone-50 text-stone-800',
    dropSub:  'text-stone-400',
    divider:  'divide-stone-100',
    thColor:  'text-stone-400',
    thBorder: 'border-stone-200',
    tdText:   'text-stone-800',
    summary:  'border-amber-500/20 bg-amber-50/60',
    sumRow:   'text-stone-500',
    sumDiv:   'border-stone-200',
    totalRow: 'text-stone-900',
    totalAnim:{ initial: '#f59e0b', animate: '#1c1917' },
  };

  const [clients, setClients] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [matSearch, setMatSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    furniture_type: 'Closet',
    width_mm: 1200,
    height_mm: 2200,
    depth_mm: 600,
    labor_cost: 0,
    extra_cost: 0,
    margin_percent: 30,
  });
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('clients').select('id,name').order('name'),
      supabase.from('materials').select('id,name,unit,cost,stock').order('name'),
    ]);
    const clientList = c || [];
    setClients(clientList);
    setMaterials(m || []);

    if (prefill?.clientName) {
      const existing = clientList.find(
        (cl) => cl.name.toLowerCase() === prefill.clientName.toLowerCase()
      );
      if (existing) {
        setForm((f) => ({ ...f, client_id: existing.id, title: prefill.productName || '' }));
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ owner_id: authData.user.id, name: prefill.clientName, phone: prefill.clientPhone || '', email: prefill.clientEmail || '' })
          .select('id,name')
          .single();
        if (newClient) {
          setClients((prev) => [...prev, newClient]);
          setForm((f) => ({ ...f, client_id: newClient.id, title: prefill.productName || '' }));
        }
      }
    }
  }

  const totals = calculateQuote({
    materials: selectedItems,
    laborCost: form.labor_cost,
    extraCost: form.extra_cost,
    marginPercent: form.margin_percent,
  });

  function addMaterial(mat) {
    if (selectedItems.find((i) => i.material_id === mat.id)) return;
    setSelectedItems((prev) => [...prev, {
      material_id: mat.id,
      description: mat.name,
      quantity: 1,
      unit: mat.unit,
      unit_cost: Number(mat.cost),
      total_cost: Number(mat.cost),
    }]);
    setMatSearch('');
  }

  function updateItem(index, field, value) {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.total_cost = Number(updated.quantity) * Number(updated.unit_cost);
        }
        return updated;
      })
    );
  }

  function removeItem(index) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) return alert('Selecciona un cliente');
    if (!form.title.trim()) return alert('Escribe un título');
    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    const owner_id = authData.user.id;

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        ...form,
        owner_id,
        width_mm: Number(form.width_mm),
        height_mm: Number(form.height_mm),
        depth_mm: Number(form.depth_mm),
        labor_cost: Number(form.labor_cost),
        extra_cost: Number(form.extra_cost),
        margin_percent: Number(form.margin_percent),
        subtotal: totals.subtotal,
        total: totals.total,
      })
      .select()
      .single();

    if (error) { setSaving(false); return alert(error.message); }

    if (selectedItems.length > 0) {
      const items = selectedItems.map((item) => ({ ...item, quote_id: quote.id }));
      await supabase.from('quote_items').insert(items);
    }

    setSaving(false);
    setForm({ client_id: '', title: '', furniture_type: 'Closet', width_mm: 1200, height_mm: 2200, depth_mm: 600, labor_cost: 0, extra_cost: 0, margin_percent: 30 });
    setSelectedItems([]);
    if (onSaved) onSaved();
  }

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(matSearch.toLowerCase())
  );

  const inputBase = `w-full border rounded-xl px-4 py-3 focus:outline-none transition ${tk.input}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Banner lead */}
      {prefill?.clientName && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <FileText size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-400 font-medium">Cotización generada desde consulta de catálogo</p>
            <p className="text-amber-500/70 mt-0.5">
              Cliente: <strong>{prefill.clientName}</strong>
              {prefill.clientPhone && <> · {prefill.clientPhone}</>}
            </p>
            {prefill.message && (
              <p className="text-amber-500/60 mt-1 italic">"{prefill.message}"</p>
            )}
          </div>
        </div>
      )}

      {/* Cliente + Título */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs mb-1 uppercase tracking-wider ${tk.label}`}>Cliente *</label>
          <div className="relative">
            <select
              value={form.client_id}
              onChange={(e) => setField('client_id', e.target.value)}
              className={`${inputBase} appearance-none`}
            >
              <option value="">— Seleccionar cliente —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${tk.label}`} />
          </div>
        </div>
        <div>
          <label className={`block text-xs mb-1 uppercase tracking-wider ${tk.label}`}>Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Ej: Closet principal habitación"
            className={inputBase}
          />
        </div>
      </div>

      {/* Tipo + Dimensiones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={`block text-xs mb-1 uppercase tracking-wider ${tk.label}`}>Tipo de mueble</label>
          <div className="relative">
            <select
              value={form.furniture_type}
              onChange={(e) => setField('furniture_type', e.target.value)}
              className={`${inputBase} appearance-none`}
            >
              {FURNITURE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${tk.label}`} />
          </div>
        </div>
        {[['Ancho (mm)', 'width_mm'], ['Alto (mm)', 'height_mm'], ['Fondo (mm)', 'depth_mm']].map(([label, key]) => (
          <div key={key}>
            <label className={`block text-xs mb-1 uppercase tracking-wider ${tk.label}`}>{label}</label>
            <input type="number" value={form[key]} onChange={(e) => setField(key, e.target.value)} className={inputBase} />
          </div>
        ))}
      </div>

      {/* Materiales */}
      <div className={`rounded-2xl border ${tk.section} p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <Package size={16} className="text-amber-400" />
          <span className={`text-sm font-semibold ${tk.secTitle}`}>Materiales</span>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tk.label}`} />
          <input
            type="text"
            value={matSearch}
            onChange={(e) => setMatSearch(e.target.value)}
            placeholder="Buscar material del inventario..."
            className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition ${tk.input}`}
          />
        </div>

        {/* Dropdown resultados */}
        <AnimatePresence>
          {matSearch.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`rounded-xl border overflow-hidden max-h-48 overflow-y-auto ${tk.dropdown}`}
            >
              {filtered.length === 0 && (
                <p className={`px-4 py-3 text-sm ${tk.label}`}>Sin resultados</p>
              )}
              {filtered.map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => addMaterial(mat)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${tk.dropItem}`}
                >
                  <span>{mat.name}</span>
                  <span className={`text-xs ${tk.dropSub}`}>{mat.unit} · ${Number(mat.cost).toLocaleString()}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabla items */}
        {selectedItems.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs uppercase tracking-wider border-b ${tk.thBorder} ${tk.thColor}`}>
                  <th className="text-left pb-2 font-medium">Material</th>
                  <th className="text-right pb-2 font-medium w-24">Cant.</th>
                  <th className="text-right pb-2 font-medium w-28">P. Unit.</th>
                  <th className="text-right pb-2 font-medium w-28">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className={`divide-y ${tk.divider}`}>
                <AnimatePresence>
                  {selectedItems.map((item, i) => (
                    <motion.tr
                      key={item.material_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className={`py-2 pr-2 ${tk.tdText}`}>{item.description}</td>
                      <td className="py-2 pr-2">
                        <input
                          type="number" min="0.1" step="0.1"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          className={`w-full text-right border rounded-lg px-2 py-1 focus:outline-none transition ${tk.inputSm}`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number" min="0"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(i, 'unit_cost', e.target.value)}
                          className={`w-full text-right border rounded-lg px-2 py-1 focus:outline-none transition ${tk.inputSm}`}
                        />
                      </td>
                      <td className="py-2 text-right text-amber-500 font-medium">
                        ${Number(item.total_cost).toLocaleString('es-AR')}
                      </td>
                      <td className="py-2 pl-2">
                        <button type="button" onClick={() => removeItem(i)} className={`${tk.label} hover:text-red-500 transition`}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Costos adicionales + Margen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['Mano de obra ($)', 'labor_cost'],
          ['Costos extra ($)', 'extra_cost'],
          ['Margen de ganancia (%)', 'margin_percent'],
        ].map(([label, key]) => (
          <div key={key}>
            <label className={`block text-xs mb-1 uppercase tracking-wider ${tk.label}`}>{label}</label>
            <input
              type="number" min="0" max={key === 'margin_percent' ? 200 : undefined}
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              className={inputBase}
            />
          </div>
        ))}
      </div>

      {/* Resumen */}
      <motion.div layout className={`rounded-2xl border p-5 space-y-2 ${tk.summary}`}>
        <h3 className="text-xs uppercase tracking-wider text-amber-500/70 mb-3">Resumen</h3>
        {[
          ['Materiales', totals.materialsSubtotal],
          ['Mano de obra', Number(form.labor_cost)],
          ['Costos extra', Number(form.extra_cost)],
        ].map(([label, val]) => (
          <div key={label} className={`flex justify-between text-sm ${tk.sumRow}`}>
            <span>{label}</span>
            <span>${val.toLocaleString('es-AR')}</span>
          </div>
        ))}
        <div className={`flex justify-between text-sm border-t pt-2 ${tk.sumDiv} ${tk.sumRow}`}>
          <span>Subtotal</span>
          <span>${totals.subtotal.toLocaleString('es-AR')}</span>
        </div>
        <div className={`flex justify-between text-sm ${tk.sumRow}`}>
          <span>Margen ({form.margin_percent}%)</span>
          <span>+${(totals.total - totals.subtotal).toLocaleString('es-AR')}</span>
        </div>
        <div className={`flex justify-between text-xl font-bold border-t border-amber-500/30 pt-3 mt-1 ${tk.totalRow}`}>
          <span>Total</span>
          <motion.span
            key={totals.total}
            initial={{ scale: 1.1, color: tk.totalAnim.initial }}
            animate={{ scale: 1, color: tk.totalAnim.animate }}
            transition={{ duration: 0.3 }}
          >
            ${totals.total.toLocaleString('es-AR')}
          </motion.span>
        </div>
      </motion.div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-2xl px-6 py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
      >
        <FileText size={18} />
        {saving ? 'Guardando…' : 'Guardar cotización'}
      </button>
    </form>
  );
}
