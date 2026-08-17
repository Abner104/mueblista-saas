import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Fingerprint } from 'lucide-react';
import { useSuperAdminStore } from '../store/superAdminStore';
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '../lib/countries';
import { isPasskeySupported } from '../lib/passkeys';

// Si el usuario no tiene fila en shop_config (ej: el upsert del registro
// falló porque en ese momento aún no había sesión, por confirmación de
// email pendiente), la crea ahora a partir de los metadata guardados
// en el signUp.
async function ensureShopConfig(user) {
  const { data: existing } = await supabase
    .from('shop_config')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (existing) return;

  const meta = user.user_metadata || {};
  await supabase.from('shop_config').upsert({
    owner_id: user.id,
    shop_name: meta.shop_name || 'Mi Taller',
    slug: meta.shop_slug || '',
    country: meta.country || DEFAULT_COUNTRY_CODE,
  }, { onConflict: 'owner_id' });
}

async function redirectAfterLogin(user, checkSuperAdmin, navigate) {
  await ensureShopConfig(user);
  const isSuperAdmin = await checkSuperAdmin(user);
  navigate(isSuperAdmin ? '/super' : '/app');
}

// Convierte el nombre del taller a slug válido
function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSuperAdmin } = useSuperAdminStore();
  const [isRegister, setIsRegister] = useState(searchParams.get('register') === '1');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugPreview, setSlugPreview] = useState('');
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported);
  }, []);

  async function handlePasskeyLogin() {
    setError('');
    setPasskeyLoading(true);
    const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();
    setPasskeyLoading(false);
    if (passkeyError) { setError(passkeyError.message || 'No se pudo entrar con la huella.'); return; }
    if (data?.user) await redirectAfterLogin(data.user, checkSuperAdmin, navigate);
  }

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    shopName: '',
    country: DEFAULT_COUNTRY_CODE,
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'shopName') setSlugPreview(toSlug(value));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister) {
      if (!form.shopName.trim()) {
        setError('Ingresá el nombre de tu taller');
        setLoading(false);
        return;
      }
      const slug = toSlug(form.shopName);
      if (!slug) {
        setError('El nombre del taller no es válido');
        setLoading(false);
        return;
      }

      // Verificar que el slug no esté tomado
      const { data: existing } = await supabase
        .from('shop_config')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        setError(`El nombre "${form.shopName}" ya está en uso. Probá con otro.`);
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: form.fullName, shop_slug: slug, shop_name: form.shopName, country: form.country },
        },
      });

      if (signUpError) { setError(signUpError.message); setLoading(false); return; }

      if (data.user) {
        // Crear shop_config con slug y país (define moneda y método de pago).
        // Si todavía no hay sesión (falta confirmar email), esto puede fallar
        // por RLS — se reintenta en el primer login vía ensureShopConfig.
        if (data.session) {
          const { error: shopError } = await supabase.from('shop_config').upsert({
            owner_id: data.user.id,
            shop_name: form.shopName,
            slug,
            country: form.country,
          }, { onConflict: 'owner_id' });

          if (shopError) {
            setError(`Cuenta creada pero hubo un problema al configurar el taller: ${shopError.message}`);
            setLoading(false);
            return;
          }
        }

        setError('');
        // Si Supabase requiere confirmación de correo
        if (!data.session) {
          setLoading(false);
          alert('¡Cuenta creada! Revisá tu correo para confirmar y luego ingresá.');
          setIsRegister(false);
          return;
        }
        await redirectAfterLogin(data.user, checkSuperAdmin, navigate);
      }

      setLoading(false);
      return;
    }

    // Login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);
    if (loginError) { setError(loginError.message); return; }
    await redirectAfterLogin(loginData.user, checkSuperAdmin, navigate);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white grid lg:grid-cols-2">

      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex flex-col justify-between px-16 py-12 border-r border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#1a1208]">
        <div className="flex items-center gap-3">
          <img src="/LogoCarpento.png" alt="WoodFlow" className="h-10 w-auto" />
        </div>

        <div className="max-w-lg">
          <p className="text-amber-400 text-sm uppercase tracking-widest mb-4 font-medium">
            Para talleres de muebles
          </p>
          <h1 className="text-5xl font-bold leading-tight text-white">
            Gestioná tu taller como un profesional
          </h1>
          <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
            Cotizaciones, inventario, órdenes de producción y tu catálogo público — todo en un solo lugar.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Catálogo público', 'Tus clientes ven y piden cotizaciones online'],
              ['PDF automático', 'Genera presupuestos profesionales en segundos'],
              ['Control de stock', 'El maestro descuenta materiales al producir'],
              ['Multi-taller', 'Cada taller tiene su propio espacio aislado'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="font-semibold text-sm text-white">{title}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-700">© 2025 Carpento · Todos los derechos reservados</p>
      </div>

      {/* ── Formulario ── */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/LogoCarpento.png" alt="WoodFlow" className="h-9 w-auto" />
          </div>

          <motion.form
            key={isRegister ? 'register' : 'login'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="rounded-3xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-5 md:p-8 shadow-2xl"
          >
            <h2 className="text-2xl md:text-3xl font-bold">{isRegister ? 'Crear cuenta' : 'Ingresar'}</h2>
            <p className="mt-2 text-zinc-400 text-sm">
              {isRegister ? 'Registrá tu taller y empezá a gestionar' : 'Accedé a tu panel de trabajo'}
            </p>

            {/* Login con huella/Face ID — requiere haber activado una passkey antes */}
            {!isRegister && passkeySupported && (
              <>
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-60 text-amber-400 font-semibold px-4 py-3.5 transition"
                >
                  <Fingerprint size={18} />
                  {passkeyLoading ? 'Verificando…' : 'Entrar con huella / Face ID'}
                </button>
                <div className="flex items-center gap-3 mt-5 mb-1">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs text-zinc-600 uppercase tracking-wider">o con tu contraseña</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
              </>
            )}

            <div className="mt-7 space-y-3">

              {isRegister && (
                <>
                  <input
                    type="text"
                    placeholder="Tu nombre completo"
                    value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm outline-none focus:border-amber-500 transition placeholder-zinc-600"
                  />

                  <div>
                    <input
                      type="text"
                      placeholder="Nombre de tu taller"
                      value={form.shopName}
                      onChange={(e) => setField('shopName', e.target.value)}
                      required
                      className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm outline-none focus:border-amber-500 transition placeholder-zinc-600"
                    />
                    <AnimatePresence>
                      {slugPreview && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-1.5 ml-1 text-xs text-zinc-500"
                        >
                          Tu catálogo quedará en:{' '}
                          <span className="text-amber-400 font-medium">
                            /catalogo/{slugPreview}
                          </span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5 ml-1">País del taller</label>
                    <select
                      value={form.country}
                      onChange={(e) => setField('country', e.target.value)}
                      required
                      className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm outline-none focus:border-amber-500 transition text-white"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 ml-1 text-xs text-zinc-500">
                      Define la moneda y el método de pago de tu suscripción.
                    </p>
                  </div>
                </>
              )}

              <input
                type="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm outline-none focus:border-amber-500 transition placeholder-zinc-600"
              />

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 pr-12 text-sm outline-none focus:border-amber-500 transition placeholder-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold px-4 py-3.5 transition shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Procesando…' : isRegister ? 'Crear cuenta' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setIsRegister((v) => !v); setError(''); }}
              className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              {isRegister ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate gratis'}
            </button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
