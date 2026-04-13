import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useSuperAdminStore } from '../../../store/superAdminStore';

export default function SuperAdminRoute({ children }) {
  const { user, loading: authLoading } = useAuthStore();
  const { isSuperAdmin, checkSuperAdmin } = useSuperAdminStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setChecking(false); return; }
    checkSuperAdmin(user).finally(() => setChecking(false));
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/app" replace />;

  return children;
}
