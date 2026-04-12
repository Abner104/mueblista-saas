import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Scissors, Boxes,
  Truck, Briefcase, ClipboardList, LogOut, ExternalLink,
  Sun, Moon, Inbox, Menu, X, HardHat,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Items que aparecen en el bottom nav móvil (los más usados)
const BOTTOM_NAV = [
  { to: '/app',              label: 'Dashboard',   icon: LayoutDashboard, badge: null },
  { to: '/app/cotizaciones', label: 'Cotizaciones', icon: FileText,        badge: 'quotes' },
  { to: '/app/leads',        label: 'Consultas',    icon: Inbox,           badge: 'leads' },
  { to: '/app/ordenes',      label: 'Órdenes',      icon: ClipboardList,   badge: 'orders' },
  { to: '/app/inventario',   label: 'Inventario',   icon: Boxes,           badge: 'stock' },
];

// Todos los items (sidebar desktop + drawer móvil)
const NAV_ITEMS = [
  { to: '/app',             label: 'Dashboard',         icon: LayoutDashboard, badge: null },
  { to: '/app/clientes',    label: 'Clientes',           icon: Users,           badge: null },
  { to: '/app/leads',       label: 'Consultas',          icon: Inbox,           badge: 'leads' },
  { to: '/app/cotizaciones',label: 'Cotizaciones',       icon: FileText,        badge: 'quotes' },
  { to: '/app/cortes',      label: 'Cortes',             icon: Scissors,        badge: null },
  { to: '/app/inventario',  label: 'Inventario',         icon: Boxes,           badge: 'stock' },
  { to: '/app/proveedores',  label: 'Proveedores',        icon: Truck,           badge: null },
  { to: '/app/ventas',       label: 'Editor de catálogo', icon: Briefcase,       badge: null },
  { to: '/app/ordenes',      label: 'Órdenes',            icon: ClipboardList,   badge: 'orders' },
  { to: '/app/trabajadores', label: 'Equipo',             icon: HardHat,         badge: null },
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export default function AppShell() {
  const logout   = useAuthStore((s) => s.logout);
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';
  const [slug, setSlug] = useState('');
  const [badges, setBadges] = useState({ leads: 0, quotes: 0, stock: 0, orders: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Aplica clase en <html> para Tailwind dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else        root.classList.remove('dark');
  }, [isDark]);

  // Carga slug real desde Supabase
  useEffect(() => {
    supabase.from('shop_config').select('slug').maybeSingle().then(({ data }) => {
      if (data?.slug) setSlug(data.slug);
    });
  }, []);

  // Carga badges/contadores
  useEffect(() => {
    async function loadBadges() {
      const [
        { count: leads },
        { count: quotes },
        { data: mats },
        { count: orders },
      ] = await Promise.all([
        supabase.from('catalog_leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('materials').select('stock, min_stock').gt('min_stock', 0),
        supabase.from('sales').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'in_production']),
      ]);
      const lowStock = (mats || []).filter(m => Number(m.stock) <= Number(m.min_stock)).length;
      setBadges({
        leads:  leads    || 0,
        quotes: quotes   || 0,
        stock:  lowStock,
        orders: orders   || 0,
      });
    }
    loadBadges();
    const interval = setInterval(loadBadges, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  // ── tokens de color según tema ──────────────────────────────────
  const tk = isDark ? {
    bg:        'bg-zinc-950',
    sidebar:   'bg-zinc-950/90 border-zinc-800',
    navIdle:   'text-zinc-300 hover:bg-zinc-900 hover:text-white',
    navActive: 'bg-white text-black',
    pill:      'bg-white',
    header:    'border-zinc-800 bg-zinc-950/70',
    main:      'bg-zinc-950',
    card:      'bg-zinc-900 border-zinc-800',
    text:      'text-white',
    subtext:   'text-zinc-400',
    extLink:   'text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700',
    session:   'bg-zinc-900 border-zinc-800',
    sessionTxt:'text-zinc-400',
    logout:    'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20',
    toggle:    'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
    drawer:    'bg-zinc-950 border-zinc-800',
    drawerOverlay: 'bg-black/70',
    bottomNav: 'bg-zinc-950 border-zinc-800',
    bottomIdle: 'text-zinc-500',
    bottomActive: 'text-white',
    bottomActiveBg: 'bg-zinc-800',
  } : {
    bg:        'bg-stone-100',
    sidebar:   'bg-white border-stone-200',
    navIdle:   'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
    navActive: 'bg-stone-900 text-white',
    pill:      'bg-stone-900',
    header:    'border-stone-200 bg-white/80',
    main:      'bg-stone-100',
    card:      'bg-white border-stone-200',
    text:      'text-stone-900',
    subtext:   'text-stone-500',
    extLink:   'text-stone-500 hover:text-stone-900 hover:bg-stone-100 border-stone-300 hover:border-stone-400',
    session:   'bg-stone-50 border-stone-200',
    sessionTxt:'text-stone-500',
    logout:    'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    toggle:    'bg-stone-200 hover:bg-stone-300 text-stone-700',
    drawer:    'bg-white border-stone-200',
    drawerOverlay: 'bg-black/40',
    bottomNav: 'bg-white border-stone-200',
    bottomIdle: 'text-stone-400',
    bottomActive: 'text-stone-900',
    bottomActiveBg: 'bg-stone-100',
  };

  // Componente de nav item reutilizable
  function NavItem({ to, label, icon: Icon, badge }) {
    const count = badge ? badges[badge] : 0;
    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        onClick={() => setDrawerOpen(false)}
        className={({ isActive }) =>
          `relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
            isActive ? tk.navActive + ' shadow-lg' : tk.navIdle
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className={`absolute inset-0 rounded-2xl ${tk.pill}`}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              />
            )}
            <span className="relative z-10"><Icon size={18} /></span>
            <span className="relative z-10 font-medium flex-1">{label}</span>
            {count > 0 && (
              <span className={`relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                isActive ? 'bg-black/20 text-white' : 'bg-amber-500 text-black'
              }`}>
                {count}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <div className={`min-h-screen ${tk.bg} ${tk.text}`}>

      {/* ── LAYOUT DESKTOP (lg+) ── */}
      <div className="hidden lg:grid min-h-screen lg:grid-cols-[280px_1fr]">

        {/* Sidebar desktop */}
        <aside className={`border-r ${tk.sidebar} backdrop-blur-xl p-6 flex flex-col`}>
          <div className="mb-8">
            <img src="/LogoCarpento.png" alt="WoodFlow" className="h-20 w-auto" />
          </div>

          <nav className="space-y-1 flex-1">
            {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}
          </nav>

          {slug && (
            <a
              href={`/catalogo/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all text-sm font-medium border border-dashed ${tk.extLink}`}
            >
              <ExternalLink size={16} />
              Ver catálogo público
            </a>
          )}

          <div className={`mt-4 rounded-2xl ${tk.session} p-4 border space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${tk.sessionTxt}`}>Sesión</div>
                <div className={`text-sm font-medium break-all ${tk.text}`}>{user?.email}</div>
              </div>
              <button
                onClick={toggle}
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
                className={`rounded-xl p-2 transition ${tk.toggle}`}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            <button
              onClick={handleLogout}
              className={`w-full rounded-xl border px-4 py-3 font-medium flex items-center justify-center gap-2 transition ${tk.logout}`}
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main desktop */}
        <section className="min-w-0">
          <header className={`border-b ${tk.header} px-6 py-4 backdrop-blur-xl sticky top-0 z-10`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-xl font-semibold ${tk.text}`}>Panel de gestión</h2>
                <p className={`text-sm ${tk.subtext}`}>Cotizaciones, cortes, inventario y ventas del taller</p>
              </div>
              <div className={`hidden md:flex items-center gap-3`}>
                <div className={`rounded-xl border ${tk.card} px-4 py-2 text-sm ${tk.subtext}`}>
                  Taller activo
                </div>
              </div>
            </div>
          </header>
          <main className="p-6">
            <AnimatedOutlet />
          </main>
        </section>
      </div>

      {/* ── LAYOUT MÓVIL (< lg) ── */}
      <div className="lg:hidden flex flex-col min-h-screen">

        {/* Header móvil */}
        <header className={`border-b ${tk.header} backdrop-blur-xl sticky top-0 z-20 px-4 py-3 flex items-center justify-between`}>
          <img src="/LogoCarpento.png" alt="WoodFlow" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className={`rounded-xl p-2 transition ${tk.toggle}`}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className={`rounded-xl p-2 transition ${tk.toggle}`}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Contenido móvil */}
        <main className="flex-1 p-4 pb-24">
          <AnimatedOutlet />
        </main>

        {/* Bottom nav móvil */}
        <nav className={`fixed bottom-0 left-0 right-0 z-20 border-t ${tk.bottomNav} backdrop-blur-xl`}>
          <div className="flex items-center justify-around px-2 py-1.5">
            {BOTTOM_NAV.map(({ to, label, icon: Icon, badge }) => {
              const count = badge ? badges[badge] : 0;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${
                      isActive ? tk.bottomActive + ' ' + tk.bottomActiveBg : tk.bottomIdle
                    }`
                  }
                >
                  <div className="relative">
                    <Icon size={20} />
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ── DRAWER MÓVIL (menú completo) ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-30 ${tk.drawerOverlay} lg:hidden`}
              onClick={() => setDrawerOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className={`fixed top-0 right-0 bottom-0 z-40 w-72 ${tk.drawer} border-l flex flex-col lg:hidden`}
            >
              {/* Drawer header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-stone-200'}`}>
                <img src="/LogoCarpento.png" alt="WoodFlow" className="h-7 w-auto" />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className={`rounded-xl p-1.5 transition ${tk.toggle}`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}
                {slug && (
                  <a
                    href={`/catalogo/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    className={`mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all text-sm font-medium border border-dashed ${tk.extLink}`}
                  >
                    <ExternalLink size={16} />
                    Ver catálogo público
                  </a>
                )}
              </nav>

              {/* Sesión + logout */}
              <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-stone-200'}`}>
                <div className={`rounded-2xl ${tk.session} p-4 border space-y-3`}>
                  <div>
                    <div className={`text-xs ${tk.sessionTxt}`}>Sesión activa</div>
                    <div className={`text-sm font-medium break-all mt-0.5 ${tk.text}`}>{user?.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`w-full rounded-xl border px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition text-sm ${tk.logout}`}
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
