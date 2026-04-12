import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, FileText, Inbox, DollarSign,
  TrendingUp, CheckCircle2, LogOut, Sun, Moon,
  ChevronRight, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useRoleStore } from '../store/roleStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS  = { draft:'Borrador', sent:'Enviada', approved:'Aprobada', rejected:'Rechazada' };
const STATUS_DARK  = { draft:'bg-zinc-700/60 text-zinc-300', sent:'bg-amber-500/20 text-amber-300', approved:'bg-emerald-500/20 text-emerald-300', rejected:'bg-red-500/20 text-red-300' };
const STATUS_LIGHT = { draft:'bg-zinc-200 text-zinc-600',    sent:'bg-amber-100 text-amber-700',    approved:'bg-emerald-100 text-emerald-700',    rejected:'bg-red-100 text-red-700' };

export default function VendedorPage() {
  const { worker, ownerId } = useRoleStore();
  const logout              = useAuthStore(s => s.logout);
  const { theme, toggle }   = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [leads,   setLeads]   = useState([]);
  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('quotes'); // 'quotes' | 'leads' | 'comisiones'

  const tk = isDark
    ? { bg: 'bg-zinc-950', header: 'bg-zinc-950 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', card: 'bg-zinc-900 border-zinc-800', tab: 'bg-zinc-900 border-zinc-800 text-zinc-400', tabA: 'bg-white text-black', toggle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300', row: 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-800' }
    : { bg: 'bg-stone-100', header: 'bg-white border-stone-200',  text: 'text-stone-900', sub: 'text-stone-500', card: 'bg-white border-stone-200', tab: 'bg-white border-stone-200 text-stone-500', tabA: 'bg-stone-900 text-white', toggle: 'bg-stone-200 hover:bg-stone-300 text-stone-600', row: 'bg-stone-50 hover:bg-stone-100 border-stone-200' };

  useEffect(() => { fetchData(); }, [worker, ownerId]);

  async function fetchData() {
    setLoading(true);

    // Cotizaciones de este vendedor (filtradas por seller_worker_id si están asignadas, o todas del taller)
    const quotesQuery = worker?.id
      ? supabase.from('quotes').select('*, clients(name)').eq('seller_worker_id', worker.id).order('created_at', { ascending: false })
      : supabase.from('quotes').select('*, clients(name)').order('created_at', { ascending: false }).limit(20);

    const leadsQuery = supabase
      .from('catalog_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    const [{ data: q }, { data: l }] = await Promise.all([quotesQuery, leadsQuery]);
    setQuotes(q || []);
    setLeads(l || []);
    setLoading(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Comisiones calculadas
  const approvedQuotes  = quotes.filter(q => q.status === 'approved');
  const totalVentas     = approvedQuotes.reduce((s, q) => s + Number(q.total || 0), 0);
  const commissionPct   = worker?.commission_pct || 0;
  const totalComision   = totalVentas * (commissionPct / 100);
  const leadsNuevos     = leads.filter(l => l.status === 'new').length;

  const SC = isDark ? STATUS_DARK : STATUS_LIGHT;

  return (
    <div className={`min-h-screen ${tk.bg} ${tk.text}`}>

      {/* Header */}
      <header className={`sticky top-0 z-10 border-b ${tk.header} backdrop-blur-xl px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
            <Briefcase size={18} className="text-black" />
          </div>
          <div>
            <p className={`font-bold leading-tight ${tk.text}`}>{worker?.name || 'Vendedor'}</p>
            <p className={`text-xs ${tk.sub}`}>Panel de ventas</p>
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
          <div className={`rounded-2xl border p-4 ${tk.card}`}>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-amber-500" />
              <p className={`text-xs ${tk.sub}`}>Cotizaciones</p>
            </div>
            <p className={`text-3xl font-bold ${tk.text}`}>{quotes.length}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${tk.card}`}>
            <div className="flex items-center gap-2 mb-1">
              <Inbox size={14} className="text-violet-400" />
              <p className={`text-xs ${tk.sub}`}>Leads nuevos</p>
            </div>
            <p className={`text-3xl font-bold ${tk.text}`}>{leadsNuevos}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${tk.card}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-400" />
              <p className={`text-xs ${tk.sub}`}>Ventas aprobadas</p>
            </div>
            <p className={`text-xl font-bold ${tk.text}`}>${totalVentas.toLocaleString('es-AR')}</p>
          </div>
          <div className={`rounded-2xl border p-4 col-span-1 ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-amber-500" />
              <p className={`text-xs text-amber-600`}>Mi comisión ({commissionPct}%)</p>
            </div>
            <p className={`text-xl font-bold text-amber-500`}>${totalComision.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[['quotes', 'Cotizaciones'], ['leads', 'Consultas'], ['comisiones', 'Mis comisiones']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition border ${tab === val ? tk.tabA : tk.tab}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* Tab: Cotizaciones */}
            {tab === 'quotes' && (
              <motion.div key="quotes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {quotes.length === 0 ? (
                  <div className={`flex flex-col items-center py-12 gap-2 ${tk.sub}`}>
                    <FileText size={36} strokeWidth={1} />
                    <p className="text-sm">Sin cotizaciones asignadas</p>
                  </div>
                ) : quotes.map(q => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-4 flex items-center gap-3 transition ${tk.row}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${tk.text}`}>{q.title}</p>
                      <p className={`text-xs ${tk.sub}`}>{q.clients?.name || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-500">${Number(q.total).toLocaleString('es-AR')}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SC[q.status]}`}>
                        {STATUS_LABELS[q.status]}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Tab: Leads */}
            {tab === 'leads' && (
              <motion.div key="leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {leads.length === 0 ? (
                  <div className={`flex flex-col items-center py-12 gap-2 ${tk.sub}`}>
                    <Inbox size={36} strokeWidth={1} />
                    <p className="text-sm">No hay consultas</p>
                  </div>
                ) : leads.map(lead => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-4 flex items-center gap-3 transition ${tk.row}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${lead.status === 'new' ? 'bg-amber-500/20' : isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
                      {lead.status === 'new' ? <Inbox size={14} className="text-amber-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${tk.text}`}>{lead.name}</p>
                      <p className={`text-xs truncate ${tk.sub}`}>{lead.product_name || 'Consulta general'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock size={11} className={tk.sub} />
                      <span className={`text-[10px] ${tk.sub}`}>{new Date(lead.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Tab: Comisiones */}
            {tab === 'comisiones' && (
              <motion.div key="comisiones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className={`rounded-2xl border p-5 space-y-3 ${tk.card}`}>
                  <p className={`text-xs uppercase tracking-wider ${tk.sub}`}>Resumen de comisión</p>
                  <div className="space-y-2">
                    {[
                      ['Cotizaciones aprobadas', approvedQuotes.length, null],
                      ['Total en ventas', `$${totalVentas.toLocaleString('es-AR')}`, null],
                      ['Porcentaje acordado', `${commissionPct}%`, null],
                      ['Tu comisión total', `$${totalComision.toLocaleString('es-AR')}`, 'text-amber-500 font-bold text-lg'],
                    ].map(([label, value, cls]) => (
                      <div key={label} className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-zinc-800' : 'border-stone-100'} last:border-0`}>
                        <span className={`text-sm ${tk.sub}`}>{label}</span>
                        <span className={cls || `text-sm font-medium ${tk.text}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detalle por cotización */}
                {approvedQuotes.length > 0 && (
                  <div className="space-y-2">
                    <p className={`text-xs uppercase tracking-wider ${tk.sub}`}>Detalle por venta</p>
                    {approvedQuotes.map(q => (
                      <div key={q.id} className={`rounded-xl border p-3 flex items-center justify-between ${tk.row}`}>
                        <div>
                          <p className={`text-sm font-medium ${tk.text}`}>{q.title}</p>
                          <p className={`text-xs ${tk.sub}`}>{q.clients?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs ${tk.sub}`}>${Number(q.total).toLocaleString('es-AR')}</p>
                          <p className="text-sm font-bold text-amber-500">
                            +${(Number(q.total) * commissionPct / 100).toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
