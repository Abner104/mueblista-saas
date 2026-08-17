import { Link } from 'react-router-dom';
import { CreditCard, Briefcase, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import PasskeyManager from '../components/shared/PasskeyManager';

const SHOP_LINKS = [
  { to: '/app/billing', label: 'Suscripción',        desc: 'Tu plan, el trial y el método de pago',       icon: CreditCard },
  { to: '/app/ventas',  label: 'Editor de catálogo', desc: 'Identidad, contacto, productos y colecciones', icon: Briefcase  },
];

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const tk = isDark
    ? { text: 'text-white', sub: 'text-zinc-400', card: 'bg-zinc-900 border-zinc-800', row: 'border-zinc-800 hover:bg-zinc-800/60' }
    : { text: 'text-stone-900', sub: 'text-stone-500', card: 'bg-white border-stone-200', row: 'border-stone-100 hover:bg-stone-50' };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className={`text-2xl md:text-3xl font-bold ${tk.text}`}>Configuración</h1>
        <p className={`${tk.sub} mt-1`}>{user?.email}</p>
      </div>

      <div className={`rounded-2xl border overflow-hidden divide-y ${tk.card} ${isDark ? 'divide-zinc-800' : 'divide-stone-100'}`}>
        {SHOP_LINKS.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-5 py-4 transition ${tk.row}`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Icon size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${tk.text}`}>{label}</p>
              <p className={`text-xs ${tk.sub}`}>{desc}</p>
            </div>
            <ChevronRight size={16} className={tk.sub} />
          </Link>
        ))}
      </div>

      <PasskeyManager isDark={isDark} />
    </div>
  );
}
