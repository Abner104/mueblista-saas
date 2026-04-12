import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

export default function AppProviders({ children }) {
  const setAuth    = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) { setAuth({ user: null, session: null }); return; }
      setAuth({ user: data.session?.user ?? null, session: data.session ?? null });
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ user: session?.user ?? null, session: session ?? null });
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [setAuth, setLoading]);

  return children;
}
