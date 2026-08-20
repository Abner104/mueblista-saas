import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Briefcase, ChevronRight, Globe, Check, Ruler } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { supabase } from '../lib/supabaseClient';
import { COUNTRIES } from '../lib/countries';
import PasskeyManager from '../components/shared/PasskeyManager';

const SHOP_LINKS = [
  { to: '/app/billing', label: 'Suscripción',        desc: 'Tu plan, el trial y el método de pago',       icon: CreditCard },
  { to: '/app/ventas',  label: 'Editor de catálogo', desc: 'Identidad, contacto, productos y colecciones', icon: Briefcase  },
  { to: '/app/configuracion/cotizador', label: 'Cotizador del catálogo', desc: 'Tarifas por m² para el estimador público', icon: Ruler },
];

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [country, setCountry] = useState('');
  const [savingCountry, setSavingCountry] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const tk = isDark
    ? { text: 'text-white', sub: 'text-zinc-400', card: 'bg-zinc-900 border-zinc-800', row: 'border-zinc-800 hover:bg-zinc-800/60' }
    : { text: 'text-stone-900', sub: 'text-stone-500', card: 'bg-white border-stone-200', row: 'border-stone-100 hover:bg-stone-50' };

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('shop_config').select('country').eq('owner_id', user.id).maybeSingle()
      .then(({ data }) => setCountry(data?.country || ''));
  }, [user?.id]);

  async function changeCountry(code) {
    if (code === country || savingCountry) return;
    setSavingCountry(true);
    await supabase.from('shop_config').upsert({ owner_id: user.id, country: code }, { onConflict: 'owner_id' });
    setCountry(code);
    setSavingCountry(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className={`text-2xl md:text-3xl font-bold ${tk.text}`}>Configuración</h1>
        <p className={`${tk.sub} mt-1`}>{user?.email}</p>
      </div>

      <div className={`rounded-2xl border p-5 ${tk.card}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Globe size={16} className="text-amber-400" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${tk.text}`}>País del taller</p>
            <p className={`text-xs ${tk.sub}`}>Define la moneda de tus cotizaciones, órdenes y catálogo.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {COUNTRIES.map((c) => {
            const active = country === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => changeCountry(c.code)}
                disabled={savingCountry}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
                  active
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : isDark ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800/60' : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="text-base">{c.flag}</span>
                {c.name} <span className="opacity-60">· {c.currency}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
        {savedFlash && <p className="text-xs text-emerald-500 mt-3">País actualizado.</p>}
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
