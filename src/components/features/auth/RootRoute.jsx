import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useSuperAdminStore } from '../../../store/superAdminStore';
import LandingPage from '../../../pages/LandingPage';

/**
 * RootRoute — decide qué mostrar en /
 * - Cargando auth: spinner mínimo
 * - Super-admin autenticado: redirige a /super
 * - Usuario normal autenticado: redirige a /app
 * - Sin sesión: muestra LandingPage
 */
export default function RootRoute() {
  const { user, loading } = useAuthStore();
  const { isSuperAdmin, checkSuperAdmin } = useSuperAdminStore();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    setChecking(true);
    checkSuperAdmin(user).finally(() => setChecking(false));
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#0a0806] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (user) return <Navigate to={isSuperAdmin ? '/super' : '/app'} replace />;

  return <LandingPage />;
}
