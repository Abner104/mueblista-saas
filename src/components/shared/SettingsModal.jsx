import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import PasskeyManager from './PasskeyManager';

// Modal de configuración de cuenta para las vistas de maestro/vendedor,
// que son pantalla única sin sub-rutas propias. El panel del dueño usa
// en cambio la página /app/configuracion (AccountSettingsPage), no este
// modal.
export default function SettingsModal({ open, onClose, isDark = true, email }) {
  const tk = isDark
    ? { bg: 'bg-zinc-950', border: 'border-zinc-800', text: 'text-white', sub: 'text-zinc-400' }
    : { bg: 'bg-white',    border: 'border-stone-200', text: 'text-stone-900', sub: 'text-stone-500' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`${tk.bg} border ${tk.border} rounded-3xl w-full max-w-sm p-5 space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-amber-400" />
                <p className={`text-sm font-bold ${tk.text}`}>Configuración</p>
              </div>
              <button onClick={onClose} className={tk.sub}><X size={18} /></button>
            </div>
            {email && <p className={`text-xs ${tk.sub} -mt-2`}>{email}</p>}

            <PasskeyManager isDark={isDark} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
