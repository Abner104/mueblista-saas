import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

// Modal de confirmación reutilizable — reemplaza confirm() nativo del
// navegador para que las acciones destructivas se vean consistentes con
// el resto del panel (mismo patrón visual que QuotesPage usa in-line).
export default function ConfirmDialog({
  open,
  title,
  message,
  items,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  isDark = true,
  onConfirm,
  onCancel,
}) {
  const tk = isDark
    ? { bg: 'bg-zinc-900 border-zinc-800', text: 'text-white', sub: 'text-zinc-400', cancel: 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' }
    : { bg: 'bg-white border-stone-200', text: 'text-stone-900', sub: 'text-stone-500', cancel: 'border-stone-300 text-stone-600 hover:bg-stone-100' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`w-full max-w-sm rounded-2xl border p-5 space-y-3 ${tk.bg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                <AlertTriangle size={15} className={danger ? 'text-red-500' : 'text-amber-500'} />
              </div>
              <p className={`text-sm font-semibold ${tk.text}`}>{title}</p>
            </div>

            {message && <p className={`text-xs ${tk.sub}`}>{message}</p>}

            {items?.length > 0 && (
              <ul className={`text-xs space-y-1 ${tk.sub}`}>
                {items.map((it, i) => <li key={i}>• {it}</li>)}
              </ul>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onConfirm} disabled={loading}
                className={`flex-1 font-bold rounded-xl py-2 text-sm transition disabled:opacity-50 ${
                  danger ? 'bg-red-500 hover:bg-red-400 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'
                }`}
              >
                {loading ? 'Procesando…' : confirmLabel}
              </button>
              <button onClick={onCancel} disabled={loading}
                className={`px-4 rounded-xl border text-sm transition disabled:opacity-50 ${tk.cancel}`}>
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
