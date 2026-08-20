import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, Plus, Trash2, X, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';
import { useShopCountry } from '../lib/useShopCountry';
import { formatCurrency } from '../lib/formatters';
import CurrencyInput from '../components/shared/CurrencyInput';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const EMPTY = { label: '', price_m2: '', range_pct: 20 };

export default function PricingRulesPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const country = useShopCountry();

  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const tk = isDark ? {
    text:   'text-white', sub: 'text-zinc-400',
    card:   'bg-zinc-900 border-zinc-800', panel: 'bg-zinc-900/50 border-zinc-800',
    input:  'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500',
    row:    'bg-zinc-800/50 border-zinc-700/50',
  } : {
    text:   'text-stone-900', sub: 'text-stone-500',
    card:   'bg-white border-stone-200', panel: 'bg-white border-stone-200',
    input:  'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500',
    row:    'bg-stone-50 border-stone-200',
  };

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    const { data } = await supabase.from('pricing_rules').select('*').order('sort_order').order('created_at');
    setRules(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pricing_rules').insert({
      owner_id: user.id,
      label: form.label,
      price_m2: Number(form.price_m2 || 0),
      range_pct: Number(form.range_pct || 0),
      sort_order: rules.length,
    });
    setLoading(false);
    setForm(EMPTY);
    setShowForm(false);
    fetchRules();
  }

  async function toggleVisible(rule) {
    await supabase.from('pricing_rules').update({ visible: !rule.visible }).eq('id', rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, visible: !r.visible } : r));
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await supabase.from('pricing_rules').delete().eq('id', pendingDelete);
    setRules((prev) => prev.filter((r) => r.id !== pendingDelete));
    setDeleting(false);
    setPendingDelete(null);
  }

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link to="/app/configuracion" className={`inline-flex items-center gap-1.5 text-sm ${tk.sub} hover:text-amber-500 transition mb-3`}>
          <ArrowLeft size={14} /> Configuración
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${tk.text}`}>Cotizador del catálogo</h1>
            <p className={`${tk.sub} mt-1 max-w-md`}>
              Tarifas por m² para que tus clientes vean un precio estimado en tu catálogo público, antes de pedirte la cotización exacta.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl px-5 py-3 transition shadow-lg shadow-amber-500/20 shrink-0 w-full sm:w-auto"
          >
            <Plus size={18} /> Nueva tarifa
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className={`rounded-3xl border ${tk.panel} p-6 space-y-4`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-lg font-semibold ${tk.text}`}>Nueva tarifa</h2>
                <button type="button" onClick={() => setShowForm(false)} className={tk.sub}><X size={18} /></button>
              </div>
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Tipo de trabajo *</label>
                <input
                  required
                  value={form.label}
                  onChange={(e) => setField('label', e.target.value)}
                  placeholder="Ej: Cielo raso PVC"
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tk.input}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Precio base por m² *</label>
                  <CurrencyInput allowDecimals value={form.price_m2} onChange={(v) => setField('price_m2', v)}
                    placeholder="0" className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tk.input}`} />
                </div>
                <div>
                  <label className={`block text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>Margen del rango (%)</label>
                  <input
                    type="number" min="0" max="100" step="any"
                    value={form.range_pct}
                    onChange={(e) => setField('range_pct', e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tk.input}`}
                  />
                </div>
              </div>
              <p className={`text-xs ${tk.sub}`}>
                El cliente va a ver un rango, no un precio cerrado — por ejemplo con {formatCurrency(form.price_m2 || 0, country)}/m² y {form.range_pct || 0}% de margen: "desde {formatCurrency(form.price_m2 || 0, country)} hasta {formatCurrency(Number(form.price_m2 || 0) * (1 + Number(form.range_pct || 0) / 100), country)} por m²".
              </p>
              <button
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-2xl py-3.5 transition"
              >
                {loading ? 'Guardando…' : 'Guardar tarifa'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {rules.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 ${tk.sub}`}>
          <Ruler size={40} strokeWidth={1} />
          <p className="text-sm">Todavía no cargaste ninguna tarifa.</p>
          <p className="text-xs max-w-xs text-center">Sin tarifas cargadas, el cotizador no aparece en tu catálogo público.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {rules.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-2xl border ${tk.row} p-4 flex items-center justify-between gap-3`}
              >
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${tk.text} truncate`}>{r.label}</p>
                  <p className={`text-xs ${tk.sub}`}>
                    {formatCurrency(r.price_m2, country)}/m² · rango +{r.range_pct}%
                    {!r.visible && <span className="ml-2 text-amber-500">· oculta</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleVisible(r)}
                    title={r.visible ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'}
                    className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-zinc-700 text-zinc-500 hover:text-amber-400' : 'hover:bg-stone-200 text-stone-400 hover:text-amber-600'}`}
                  >
                    {r.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => setPendingDelete(r.id)}
                    className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400' : 'hover:bg-stone-200 text-stone-400 hover:text-red-500'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="¿Eliminar esta tarifa?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleting}
        isDark={isDark}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
