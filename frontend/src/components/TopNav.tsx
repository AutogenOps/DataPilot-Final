import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { setLocalAuthenticated } from '../lib/localAuth';
import DataPilotMark from './DataPilotMark';

interface TopNavProps {
  workspace: string;
  isConnected: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function TopNav({
  workspace,
  isConnected,
  isSidebarCollapsed,
  onToggleSidebar,
}: TopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // If Supabase isn't configured, don't attempt auth calls; keep UI stable for demos.
    if (!isSupabaseConfigured) {
      setAuthUser(null);
      setIsAuthLoading(false);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;

      setAuthUser(sessionData.session?.user ?? null);
      setIsAuthLoading(false);

      // Refresh from API (in case metadata changed).
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      if (userData.user) setAuthUser(userData.user);
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (!session?.user) setShowUserMenu(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const userEmail = authUser?.email ?? '';
  const userName = useMemo(() => {
    const metaName = authUser?.user_metadata?.name;
    if (typeof metaName === 'string' && metaName.trim()) return metaName.trim();
    if (userEmail) return userEmail.split('@')[0];
    return '';
  }, [authUser, userEmail]);

  const userInitials = useMemo(() => {
    const base = (userName || userEmail || '').trim();
    if (!base) return 'DP';
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return base.slice(0, 2).toUpperCase();
  }, [userEmail, userName]);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      setLocalAuthenticated(false);
    }
    navigate('/signin');
  };

  return (
    <nav className="relative z-[100] h-16 app-shell border-b border-white/10 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-text-secondary" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        <motion.div
          className="flex items-center gap-2 scan-line"
          whileHover={{ scale: 1.02 }}
        >
          <DataPilotMark className="h-7 w-7 rounded-md" />
          <h1 className="text-xl font-display font-bold text-gradient-cyan">
            DataPilot
          </h1>
        </motion.div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 app-tile rounded-md border cursor-pointer hover:border-accent-cyan/70 transition-colors">
          <span className="font-mono text-sm text-text-secondary">{workspace}</span>
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex items-center px-3 py-1.5"
          title={isConnected ? 'API Connected' : 'API Offline'}
          aria-label={isConnected ? 'API Connected' : 'API Offline'}
        >
          <motion.div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-status-success' : 'bg-status-error'
            }`}
            animate={{
              boxShadow: isConnected
                ? ['0 0 0 0 rgba(126,231,135,0.55)', '0 0 0 8px rgba(126,231,135,0)']
                : ['0 0 0 0 rgba(255,107,107,0.55)', '0 0 0 8px rgba(255,107,107,0)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <motion.button
          className="relative p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-5 h-5 text-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full" />
        </motion.button>

        <div className="relative z-[120]">
          <motion.button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 app-tile rounded-lg border cursor-pointer hover:border-accent-cyan/70 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-cyan via-accent-azure to-accent-warm flex items-center justify-center text-xs font-bold text-black">
              {userInitials}
            </div>
            <span className="hidden sm:inline text-sm text-text-primary">
              {isAuthLoading ? 'Loading...' : userName || 'Local session'}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </motion.button>

          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full z-[200] mt-2 w-56 app-surface border rounded-lg shadow-2xl shadow-black/70 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.10)]">
                <p className="text-sm text-text-primary font-medium">
                  {isAuthLoading ? 'Loading...' : userName || 'Local session'}
                </p>
                <p className="text-xs text-text-muted">
                  {isAuthLoading ? '' : userEmail}
                </p>
              </div>
              {(authUser || !isSupabaseConfigured) && (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-status-error hover:bg-[rgba(255,107,107,0.10)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}
