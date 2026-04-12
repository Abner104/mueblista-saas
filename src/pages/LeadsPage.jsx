import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, Phone, Mail, MessageSquare, Package,
  ChevronDown, X, FileText, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';

const STATUS = {
  new:       { label: 'Nuevo',      color: 'bg-amber-500/20 text-amber-300',   icon: Clock },
  contacted: { label: 'Contactado', color: 'bg-blue-500/20 text-blue-300',     icon: Phone },
  quoted:    { label: 'Cotizado',   color: 'bg-violet-500/20 text-violet-300', icon: FileText },
  closed:    { label: 'Cerrado',    color: 'bg-emerald-500/20 text-emerald-300',icon: CheckCircle2 },
};

const STATUS_LIGHT = {
  new:       'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  quoted:    'bg-violet-100 text-violet-700',
  closed:    'bg-emerald-100 text-emerald-700',
};

function LeadDetailModal({ lead, onClose, onStatusChange, onConvertQuote, onDelete, isDark }) {
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);

  const tk = isDark
    ? { bg: 'bg-zinc-950', border: 'border-zinc-800', card: 'bg-zinc-900', text: 'text-white', sub: 'text-zinc-400', sel: 'bg-zinc-900 border-zinc-700' }
    : { bg: 'bg-white',    border: 'border-stone-200', card: 'bg-stone-50', text: 'text-stone-900', sub: 'text-stone-500', sel: 'bg-stone-50 border-stone-300' };

  async function saveStatus(val) {
    setSaving(true);
    await supabase.from('catalog_leads').update({ status: val }).eq('id', lead.id);
    setStatus(val);
    onStatusChange(lead.id, val);
    setSaving(false);
  }

  const statusInfo = STATUS[status] || STATUS.new;

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
        className={`${tk.bg} border ${tk.border} rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between p-6 border-b ${tk.border}`}>
          <div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? STATUS[status]?.color : STATUS_LIGHT[status]}`}>
              {STATUS[status]?.label}
            </span>
            <h2 className={`text-xl font-bold mt-2 ${tk.text}`}>{lead.name}</h2>
            {lead.product_name && (
              <p className={`text-sm mt-0.5 ${tk.sub}`}>
                Interesado en: <span className="font-medium">{lead.product_name}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className={`${tk.sub} hover:${tk.text} transition p-1`}>
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div className={`px-6 py-4 space-y-3 border-b ${tk.border}`}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-sm hover:text-amber-500 transition">
              <Phone size={15} className="text-amber-400 shrink-0" />
              <span className={tk.text}>{lead.phone}</span>
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-sm hover:text-amber-500 transition">
              <Mail size={15} className="text-amber-400 shrink-0" />
              <span className={tk.text}>{lead.email}</span>
            </a>
          )}
          {lead.message && (
            <div className="flex items-start gap-3 text-sm">
              <MessageSquare size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className={tk.sub}>{lead.message}</p>
            </div>
          )}
          <p className={`text-xs ${tk.sub}`}>
            Recibido: {new Date(lead.created_at).toLocaleString('es-AR')}
          </p>
        </div>

        {/* Acciones */}
        <div className={`px-6 py-4 flex flex-wrap gap-3`}>
          <div className="relative flex-1 min-w-36">
            <select
              value={status}
              onChange={(e) => saveStatus(e.target.value)}
              disabled={saving}
              className={`w-full appearance-none ${tk.sel} border rounded-xl px-4 py-2.5 text-sm ${tk.text} focus:outline-none focus:border-amber-500 transition`}
            >
              {Object.entries(STATUS).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
          </div>

          <button
            onClick={() => onConvertQuote(lead)}
            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm font-medium transition"
          >
            <FileText size={14} /> Crear cotización
          </button>

          <button
            onClick={() => onDelete(lead.id)}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm font-medium transition"
          >
            <XCircle size={14} /> Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const tk = isDark
    ? { bg: 'bg-zinc-950', card: 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700', text: 'text-white', sub: 'text-zinc-400', tab: 'bg-zinc-900 text-zinc-400 border-zinc-800', tabActive: 'bg-white text-black' }
    : { bg: 'bg-stone-50',  card: 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm', text: 'text-stone-900', sub: 'text-stone-500', tab: 'bg-white text-stone-500 border-stone-200', tabActive: 'bg-stone-900 text-white' };

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data } = await supabase
      .from('catalog_leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  function handleStatusChange(id, newStatus) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    if (selected?.id === id) setSelected((p) => ({ ...p, status: newStatus }));
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este lead?')) return;
    await supabase.from('catalog_leads').delete().eq('id', id);
    setSelected(null);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  function handleConvertQuote(lead) {
    navigate('/app/cotizaciones', {
      state: {
        prefill: {
          clientName:  lead.name,
          clientPhone: lead.phone,
          clientEmail: lead.email || '',
          productName: lead.product_name || '',
          message:     lead.message || '',
          leadId:      lead.id,
        }
      }
    });
  }

  const filtered = filterStatus === 'all' ? leads : leads.filter((l) => l.status === filterStatus);

  const counts = Object.keys(STATUS).reduce((acc, k) => {
    acc[k] = leads.filter((l) => l.status === k).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${tk.text}`}>Consultas recibidas</h1>
        <p className={`${tk.sub} mt-1`}>Pedidos que llegaron desde tu catálogo público.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS).map(([key, { label, color, icon: Icon }]) => (
          <div key={key} className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? color : STATUS_LIGHT[key]}`}>{label}</span>
            </div>
            <p className={`text-3xl font-bold ${tk.text}`}>{counts[key] || 0}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todos', leads.length], ...Object.entries(STATUS).map(([v, { label }]) => [v, label, counts[v] || 0])].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
              filterStatus === val ? tk.tabActive : tk.tab
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-60">{count}</span>
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
          <Inbox size={40} strokeWidth={1} />
          <p className="text-sm">No hay leads en esta categoría</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((lead, i) => {
              const si = STATUS[lead.status] || STATUS.new;
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(lead)}
                  className={`group cursor-pointer rounded-2xl border transition-all p-4 flex items-center gap-4 ${tk.card}`}
                >
                  {/* Icono */}
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Inbox size={18} className="text-amber-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${tk.text}`}>{lead.name}</p>
                    <div className={`flex items-center gap-3 text-sm ${tk.sub} flex-wrap`}>
                      {lead.phone && <span className="flex items-center gap-1"><Phone size={11} /> {lead.phone}</span>}
                      {lead.product_name && <span className="flex items-center gap-1"><Package size={11} /> {lead.product_name}</span>}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${isDark ? si.color : STATUS_LIGHT[lead.status]}`}>
                    {si.label}
                  </span>

                  {/* Fecha */}
                  <p className={`text-xs shrink-0 ${tk.sub}`}>
                    {new Date(lead.created_at).toLocaleDateString('es-AR')}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal detalle */}
      <AnimatePresence>
        {selected && (
          <LeadDetailModal
            lead={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onConvertQuote={handleConvertQuote}
            onDelete={handleDelete}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
