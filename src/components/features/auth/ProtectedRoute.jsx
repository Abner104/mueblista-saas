import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useRoleStore } from '../../../store/roleStore';

// Rutas reservadas al dueño del taller (o admin). Un trabajador con
// worker_role 'maestro'/'vendedor' no debe poder entrar acá aunque
// escriba la URL directamente — solo /maestro o /vendedor.
const OWNER_ONLY_PREFIX = '/app';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  const { role, loadRole, loading: roleLoading } = useRoleStore();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    if (!user) { setRoleChecked(true); return; }
    loadRole(user.id).finally(() => setRoleChecked(true));
  }, [user?.id]);

  if (loading || (user && (!roleChecked || roleLoading))) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Un trabajador (maestro/vendedor) no accede al panel de dueño (/app/*)
  if (location.pathname.startsWith(OWNER_ONLY_PREFIX)) {
    if (role === 'maestro')  return <Navigate to="/maestro" replace />;
    if (role === 'vendedor') return <Navigate to="/vendedor" replace />;
  }

  return children;
}
