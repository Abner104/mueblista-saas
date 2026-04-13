import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Plus, Trash2, Phone, Mail, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const tk = isDark ? {
    card:  'bg-zinc-900 border-zinc-800',
    panel: 'bg-zinc-900/50 border-zinc-800',
    input: 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500',
    text:  'text-white',
    sub:   'text-zinc-400',
    del:   'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
  } : {
    card:  'bg-white border-stone-200',
    panel: 'bg-white border-stone-200',
    input: 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500',
    text:  'text-stone-900',
    sub:   'text-stone-500',
    del:   'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
  };

  useEffect(() => { fetchSuppliers(); }, []);

  async function fetchSuppliers() {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('suppliers').insert({ ...form, owner_id: user.id });
    setLoading(false);
    setForm(EMPTY);
    setShowForm(false);
    fetchSuppliers();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar proveedor?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${tk.text}`}>Proveedores</h1>
          <p className={`${tk.sub} mt-1`}>Contactos de materiales y herrajes.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl px-5 py-3 transition shadow-lg shadow-amber-500/20 w-full sm:w-auto"
        >
          <Plus size={18} /> Nuevo proveedor
        </button>
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
                <h2 className={`text-lg font-semibold ${tk.text}`}>Nuevo proveedor</h2>
                <button type="button" onClick={() => setShowForm(false)} className={tk.sub}><X size={18} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ['name',    'Nombre *',  'text',  true],
                  ['phone',   'Teléfono',  'tel',   false],
                  ['email',   'Correo',    'email', false],
                  ['address', 'Dirección', 'text',  false],
                ].map(([key, placeholder, type, required]) => (
                  <input
                    key={key}
                    type={type}
                    placeholder={placeholder}
                    required={required}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${tk.input}`}
                  />
                ))}
              </div>
              <textarea
                placeholder="Notas"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={2}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition resize-none ${tk.input}`}
              />
              <button
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-2xl py-3.5 transition"
              >
                {loading ? 'Guardando…' : 'Guardar proveedor'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <p className={`text-sm ${tk.sub}`}>{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''}</p>

      {suppliers.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 ${tk.sub}`}>
          <Truck size={40} strokeWidth={1} />
          <p className="text-sm">No hay proveedores todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {suppliers.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border ${tk.card} p-5 flex flex-col gap-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Truck size={17} className="text-amber-400" />
                    </div>
                    <div>
                      <p className={`font-semibold ${tk.text}`}>{s.name}</p>
                      {s.address && <p className={`text-xs ${tk.sub} truncate max-w-[160px]`}>{s.address}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className={`rounded-xl border px-2.5 py-1.5 text-xs transition shrink-0 ${tk.del}`}>
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className={`space-y-1.5 text-sm ${tk.sub}`}>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-2 hover:text-amber-500 transition">
                      <Phone size={13} className="shrink-0" /> {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-2 hover:text-amber-500 transition">
                      <Mail size={13} className="shrink-0" /> {s.email}
                    </a>
                  )}
                </div>

                {s.notes && (
                  <p className={`text-xs ${tk.sub} border-t ${isDark ? 'border-zinc-800' : 'border-stone-200'} pt-2`}>{s.notes}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
