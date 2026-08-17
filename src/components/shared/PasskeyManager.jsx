import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Plus, Trash2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { isPasskeySupported, passkeyErrorMessage } from '../../lib/passkeys';

// Panel reutilizable para activar/gestionar login con huella (Face ID,
// huella dactilar, Windows Hello) vía WebAuthn. Se usa tanto en el panel
// del dueño como en las vistas de maestro/vendedor.
export default function PasskeyManager({ isDark = true }) {
  const [supported, setSupported] = useState(null); // null = verificando
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const tk = isDark
    ? { card: 'bg-zinc-900 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', row: 'border-zinc-800' }
    : { card: 'bg-white border-stone-200', text: 'text-stone-900', sub: 'text-stone-500', row: 'border-stone-100' };

  useEffect(() => {
    isPasskeySupported().then((ok) => {
      setSupported(ok);
      if (ok) fetchPasskeys();
      else setLoading(false);
    });
  }, []);

  async function fetchPasskeys() {
    setLoading(true);
    const { data, error: listError } = await supabase.auth.passkey.list();
    if (!listError) setPasskeys(data || []);
    setLoading(false);
  }

  async function handleRegister() {
    setError('');
    setRegistering(true);
    const { error: registerError } = await supabase.auth.registerPasskey();
    setRegistering(false);
    if (registerError) { setError(passkeyErrorMessage(registerError)); return; }
    fetchPasskeys();
  }

  async function handleDelete(passkeyId) {
    setDeletingId(passkeyId);
    const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId });
    setDeletingId(null);
    if (deleteError) { setError(passkeyErrorMessage(deleteError)); return; }
    setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
  }

  if (supported === false) {
    return (
      <div className={`rounded-2xl border ${tk.card} p-5 flex items-start gap-3`}>
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className={`text-sm font-semibold ${tk.text}`}>Huella no disponible en este dispositivo</p>
          <p className={`text-xs ${tk.sub} mt-1`}>
            Este navegador o dispositivo no tiene un lector de huella, Face ID o PIN configurado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${tk.card} p-5 space-y-4`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Fingerprint size={18} className="text-amber-400" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${tk.text}`}>Ingreso con huella / Face ID</p>
          <p className={`text-xs ${tk.sub}`}>Entrá sin escribir la contraseña, usando la biometría del celular.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-300">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <RefreshCw size={16} className={`animate-spin ${tk.sub}`} />
        </div>
      ) : (
        <>
          {passkeys.length > 0 && (
            <div className="space-y-1.5">
              <AnimatePresence>
                {passkeys.map((pk) => (
                  <motion.div
                    key={pk.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-3 py-2.5 border-b ${tk.row} last:border-b-0`}
                  >
                    <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${tk.text}`}>{pk.friendly_name || 'Passkey'}</p>
                      {pk.created_at && (
                        <p className={`text-[11px] ${tk.sub}`}>
                          Agregada el {new Date(pk.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(pk.id)}
                      disabled={deletingId === pk.id}
                      className="text-zinc-500 hover:text-red-400 transition shrink-0 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={registering}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
          >
            {registering
              ? <><RefreshCw size={14} className="animate-spin" /> Registrando…</>
              : <><Plus size={14} /> {passkeys.length > 0 ? 'Agregar otra huella' : 'Activar huella en este dispositivo'}</>
            }
          </button>
        </>
      )}
    </div>
  );
}
