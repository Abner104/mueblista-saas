import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

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
  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugPreview, setSlugPreview] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    shopName: '',
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
          data: { full_name: form.fullName, shop_slug: slug, shop_name: form.shopName },
        },
      });

      if (signUpError) { setError(signUpError.message); setLoading(false); return; }

      if (data.user) {
        // Crear shop_config con slug
        await supabase.from('shop_config').upsert({
          owner_id: data.user.id,
          shop_name: form.shopName,
          slug,
        }, { onConflict: 'owner_id' });

        setError('');
        // Si Supabase requiere confirmación de correo
        if (!data.session) {
          setLoading(false);
          alert('¡Cuenta creada! Revisá tu correo para confirmar y luego ingresá.');
          setIsRegister(false);
          return;
        }
        navigate('/app');
      }

      setLoading(false);
      return;
    }

    // Login
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);
    if (loginError) { setError(loginError.message); return; }
    navigate('/app');
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
