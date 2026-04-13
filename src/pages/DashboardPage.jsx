import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, FileText, Inbox, Boxes, ClipboardList,
  TrendingUp, AlertTriangle, CheckCircle2, ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

function CountUp({ to, duration = 1.2 }) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (to === 0) return;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / (duration * 1000), 1);
      setVal(Math.round(p * to));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{val}</>;
}

const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
};

export default function DashboardPage() {
  const user    = useAuthStore((s) => s.user);
  const { theme } = useThemeStore();
  const isDark  = theme === 'dark';
  const navigate = useNavigate();

  const [stats,     setStats]     = useState({ clients: 0, leads: 0, quotes: 0, materials: 0, orders: 0, revenue: 0 });
  const [lowStock,  setLowStock]  = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [shopConfig, setShopConfig] = useState(null);
  const [loading,   setLoading]   = useState(true);

  const tk = isDark ? {
    hero:    'from-zinc-900 to-zinc-950 border-zinc-800',
    card:    'bg-zinc-900 border-zinc-800',
    text:    'text-white',
    sub:     'text-zinc-400',
    row:     'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-800',
    badge:   'bg-amber-500/20 text-amber-300',
    badgeR:  'bg-red-500/20 text-red-300',
    link:    'text-amber-400 hover:text-amber-300',
  } : {
    hero:    'from-stone-100 to-white border-stone-200',
    card:    'bg-white border-stone-200',
    text:    'text-stone-900',
    sub:     'text-stone-500',
    row:     'bg-stone-50 hover:bg-stone-100 border-stone-200',
    badge:   'bg-amber-100 text-amber-700',
    badgeR:  'bg-red-100 text-red-700',
    link:    'text-amber-600 hover:text-amber-500',
  };

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const uid = currentUser?.id;

    const [
      clientsRes, leadsRes, quotesRes,
      materialsRes, ordersRes, revenueRes,
      recentLeadsRes, shopRes,
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('catalog_leads').select('*', { count: 'exact', head: true }),
      supabase.from('quotes').select('*', { count: 'exact', head: true }),
      supabase.from('materials').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('amount').eq('payment_status', 'paid'),
      supabase.from('catalog_leads').select('id,name,product_name,created_at,status').eq('status', 'new').order('created_at', { ascending: false }).limit(5),
      uid
        ? supabase.from('shop_config').select('shop_name,slug').eq('owner_id', uid).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Stock bajo: filtrar manualmente
    const { data: allMats } = await supabase.from('materials').select('id,name,stock,min_stock,unit');
    const low = (allMats || []).filter((m) => Number(m.stock) <= Number(m.min_stock));

    const revenue = (revenueRes.data || []).reduce((s, r) => s + Number(r.amount), 0);

    setStats({
      clients:   clientsRes.count   || 0,
      leads:     leadsRes.count     || 0,
      quotes:    quotesRes.count    || 0,
      materials: materialsRes.count || 0,
      orders:    ordersRes.count    || 0,
      revenue,
    });
    setLowStock(low.slice(0, 5));
    setRecentLeads(recentLeadsRes.data || []);
    setShopConfig(shopRes.data || null);
    setLoading(false);
  }

  const kpis = [
    { label: 'Clientes',      value: stats.clients,   icon: Users,         to: '/app/clientes',    color: 'text-blue-400',    bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
    { label: 'Leads nuevos',  value: stats.leads,     icon: Inbox,         to: '/app/leads',       color: 'text-amber-400',   bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
    { label: 'Cotizaciones',  value: stats.quotes,    icon: FileText,      to: '/app/cotizaciones',color: 'text-violet-400',  bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Órdenes',       value: stats.orders,    icon: ClipboardList, to: '/app/ordenes',     color: 'text-emerald-400', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
    { label: 'Materiales',    value: stats.materials, icon: Boxes,         to: '/app/inventario',  color: 'text-pink-400',    bg: isDark ? 'bg-pink-500/10' : 'bg-pink-50' },
    {
      label: 'Ingresos cobrados',
      value: `$${stats.revenue.toLocaleString('es-AR')}`,
      icon: TrendingUp,
      to: '/app/ordenes',
      color: 'text-amber-400',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      raw: true,
    },
  ];

  const firstName  = user?.user_metadata?.full_name?.split(' ')[0] || 'bro';
  const shopName   = shopConfig?.shop_name || user?.user_metadata?.shop_name || user?.user_metadata?.full_name || '';
  const hourGreet  = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <div className="space-y-6">

      {/* ── Hero personalizado ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-3xl border bg-gradient-to-br ${tk.hero} p-4 md:p-7 overflow-hidden relative`}
      >
        {/* Vetas decorativas */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: isDark ? 0.06 : 0.03 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0"
              style={{
                left: `${10 + i * 12}%`,
                width: `${0.8 + (i % 3) * 0.5}px`,
                background: `linear-gradient(180deg, transparent, #c8923a, transparent)`,
                transform: `skewX(${-2 + i * 0.8}deg)`,
              }}
            />
          ))}
        </div>
        {/* Glow amber */}
        <div className="absolute right-0 top-0 bottom-0 pointer-events-none"
          style={{ width: 300, background: 'radial-gradient(ellipse at right, #c8923a08, transparent 70%)' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className={`text-xs uppercase tracking-widest font-medium mb-2 ${tk.sub}`}>{hourGreet}</p>
            <h1 className={`text-2xl md:text-3xl font-black ${tk.text} leading-tight`}>
              {shopName || firstName}
            </h1>
            <p className={`mt-1.5 text-sm ${tk.sub}`}>
              {shopName ? `Bienvenido, ${firstName} · ` : ''}Acá está el estado del taller hoy.
            </p>
          </div>
          {shopConfig?.slug && (
            <motion.a
              href={`/catalogo/${shopConfig.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition ${tk.link}`}
              style={{ borderColor: isDark ? '#272118' : '#e7e5e4' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Ver catálogo público <ArrowUpRight size={14} />
            </motion.a>
          )}
        </div>
      </motion.section>

      {/* ── KPIs ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`rounded-2xl border ${tk.card} h-28 animate-pulse`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map(({ label, value, icon: Icon, to, color, bg, raw }, i) => (
            <motion.div
              key={label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              onClick={() => navigate(to)}
              className={`rounded-2xl border ${tk.card} p-5 cursor-pointer relative overflow-hidden group`}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              {/* Línea de acento top al hover */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px] origin-left"
                style={{ background: 'linear-gradient(90deg, #c8923a, #8b5e3c)' }}
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={17} className={color} />
              </div>
              <p className={`text-xs ${tk.sub} mb-1`}>{label}</p>
              <p className={`text-2xl font-black ${tk.text}`}>
                {raw ? value : <CountUp to={Number(value)} />}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Leads recientes ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
          className={`rounded-3xl border ${tk.card} p-4 md:p-6`}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Inbox size={16} className="text-amber-400" />
              <h2 className={`font-semibold ${tk.text}`}>Leads sin atender</h2>
            </div>
            <button onClick={() => navigate('/app/leads')} className={`text-xs ${tk.link} flex items-center gap-1`}>
              Ver todos <ArrowUpRight size={12} />
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div className={`flex flex-col items-center py-8 gap-2 ${tk.sub}`}>
              <CheckCircle2 size={28} strokeWidth={1.3} />
              <p className="text-sm">Sin leads pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate('/app/leads')}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${tk.row}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Inbox size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${tk.text}`}>{lead.name}</p>
                    <p className={`text-xs truncate ${tk.sub}`}>{lead.product_name || 'Consulta general'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${tk.badge}`}>Nuevo</span>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Stock bajo ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.45 }}
          className={`rounded-3xl border ${tk.card} p-4 md:p-6`}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h2 className={`font-semibold ${tk.text}`}>Stock bajo</h2>
            </div>
            <button onClick={() => navigate('/app/inventario')} className={`text-xs ${tk.link} flex items-center gap-1`}>
              Inventario <ArrowUpRight size={12} />
            </button>
          </div>

          {lowStock.length === 0 ? (
            <div className={`flex flex-col items-center py-8 gap-2 ${tk.sub}`}>
              <CheckCircle2 size={28} strokeWidth={1.3} />
              <p className="text-sm">Todo el inventario está OK</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStock.map((mat) => {
                const pct = Math.min(100, Math.round((Number(mat.stock) / Math.max(Number(mat.min_stock), 1)) * 100));
                const barColor = pct < 50 ? '#ef4444' : '#f97316';
                return (
                  <motion.div
                    key={mat.id}
                    onClick={() => navigate('/app/inventario')}
                    className={`rounded-xl border p-3 cursor-pointer transition ${tk.row}`}
                    whileHover={{ x: 2, transition: { duration: 0.15 } }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                        <Boxes size={13} className="text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${tk.text}`}>{mat.name}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${tk.badgeR}`}>
                        {mat.stock} {mat.unit}
                      </span>
                    </div>
                    {/* Barra de nivel animada */}
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-stone-200'}`}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                      />
                    </div>
                    <p className={`text-[10px] mt-1 ${tk.sub}`}>
                      {pct}% del mínimo · Mín: {mat.min_stock} {mat.unit}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

      </div>
    </div>
  );
}
