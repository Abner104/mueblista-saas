import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Página donde cae el usuario al hacer clic en el link de
// "recuperar contraseña" del correo. Supabase ya deja una sesión
// temporal activa (vía el token del link) — acá solo se pide la
// contraseña nueva y se llama updateUser.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(
        updateError.message.includes('session')
          ? 'El link expiró o ya se usó. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".'
          : updateError.message
      );
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src="/LogoCarpento.png" alt="Carpento" className="h-9 w-auto" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="rounded-3xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-5 md:p-8 shadow-2xl"
        >
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold">Contraseña actualizada</h2>
              <p className="mt-2 text-zinc-400 text-sm">Ya podés ingresar con tu contraseña nueva.</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-3.5 transition shadow-lg shadow-amber-500/20"
              >
                Ir a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl md:text-3xl font-bold">Nueva contraseña</h2>
              <p className="mt-2 text-zinc-400 text-sm">Elegí una contraseña nueva para tu cuenta.</p>

              <div className="relative mt-6">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña nueva"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
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

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
                {loading ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
