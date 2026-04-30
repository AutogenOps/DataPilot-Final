import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { isLocalAuthenticated } from '../lib/localAuth';

const AUTH_TIMEOUT_MS = 8000;

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (!isSupabaseConfigured) {
        setIsAuthenticated(isLocalAuthenticated());
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(!!data.session);
      } catch {
        if (!isMounted) return;
        setIsAuthenticated(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      // Never leave the app stuck on a blank loading screen.
      setIsAuthenticated(false);
    }, AUTH_TIMEOUT_MS);

    checkAuth().finally(() => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    });

    const { data: authListener } = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(() => {
          // Reset to loading briefly so navigations don't show stale state.
          setIsAuthenticated(null);
          checkAuth();
        })
      : { data: { subscription: { unsubscribe: () => undefined } } };

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full" />
          </div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}
