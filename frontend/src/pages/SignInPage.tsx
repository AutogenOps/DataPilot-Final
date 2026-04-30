import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, Server } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DataPilotMark from '../components/DataPilotMark';
import { setLocalAuthenticated } from '../lib/localAuth';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  const handleResendConfirmation = async () => {
    setError('');
    setInfo('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setInfo('Verification email sent. Please check your inbox/spam and confirm your email.');
    } catch {
      setError('Failed to resend verification email.');
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      // First try Supabase if configured
      if (isSupabaseConfigured) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError) {
          navigate('/');
          return;
        }
        // If Supabase fails, fall back to local auth with specific credentials
      }

      // Local authentication with specific credentials
      if (email.trim() !== 'arushverma767@gmail.com' || password !== 'Arush@1098') {
        setError('Invalid email or password. Please use the authorized credentials.');
        return;
      }

      setLocalAuthenticated(true);
      navigate('/');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-primary flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-accent-cyan/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-accent-azure/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.055)_1px,transparent_0)] bg-[length:34px_34px] opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-bg-primary/80 to-black" />
      </div>

      <div className="relative grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-2xl shadow-black/70 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative hidden min-h-[680px] overflow-hidden border-r border-white/10 bg-[#030303] p-10 lg:flex lg:flex-col lg:justify-between"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(255,184,107,0.16),transparent_28rem)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <DataPilotMark className="h-10 w-10" />
              <div>
                <div className="text-lg font-display font-bold text-text-primary">DataPilot</div>
                <div className="text-xs text-text-muted">Databricks AutoPilot</div>
              </div>
            </div>

            <div className="mt-24 max-w-xl">
              <p className="mb-5 text-xs font-mono uppercase tracking-[0.22em] text-accent-cyan">
                Secure control plane
              </p>
              <h2 className="text-5xl font-display font-extrabold leading-[0.95] text-text-primary">
                Operate your Databricks workspace from one dark command center.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-text-secondary">
                Monitor jobs, clusters, pipelines, logs, and chat-driven actions through a focused interface built for real operations.
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {['Jobs', 'Clusters', 'DLT'].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <CheckCircle2 className="mb-3 h-4 w-4 text-accent-cyan" />
                <div className="text-sm font-medium text-text-primary">{item}</div>
                <div className="mt-1 text-xs text-text-muted">Live API ready</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="p-8 sm:p-10 lg:p-12"
        >
          <div className="mb-8">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <DataPilotMark className="h-9 w-9" />
              <span className="text-xl font-display font-bold text-gradient-cyan">DataPilot</span>
            </div>
            <p className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-text-muted">
              <Server className="h-3.5 w-3.5 text-accent-cyan" />
              Workspace login
            </p>
            <h1 className="text-3xl font-display font-extrabold text-text-primary">
              Sign in to DataPilot
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {isSupabaseConfigured
                ? 'Use your Supabase account to access the dashboard.'
                : 'Local auth is enabled because Supabase is not configured. Use the demo shortcut or any valid email and 6+ character password.'}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-black/70 border border-white/10 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/25 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-3 bg-black/70 border border-white/10 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/25 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-cyan transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {info && (
              <div className="p-3 bg-[rgba(126,231,135,0.08)] border border-status-success rounded-lg">
                <p className="text-xs font-mono text-status-success">{info}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-[rgba(255,107,107,0.10)] border border-status-error rounded-lg">
                <p className="text-xs font-mono text-status-error">{error}</p>
                {error.toLowerCase().includes('email not confirmed') && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    className="mt-2 text-xs font-mono text-accent-cyan hover:text-accent-azure transition-colors"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 bg-black border border-white/20 rounded checked:bg-accent-cyan cursor-pointer"
                />
                <span className="text-text-secondary group-hover:text-text-primary transition-colors">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-accent-cyan hover:text-accent-azure transition-colors">
                Forgot password?
              </a>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-accent-cyan to-accent-azure hover:from-accent-azure hover:to-accent-cyan text-black font-display font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-4 h-4 border-2 border-transparent border-t-black rounded-full"
                  />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <span className="text-xs text-text-muted font-mono">OR</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEmail('demo@datapilot.com');
              setPassword('demo123456');
            }}
            className="w-full px-4 py-2 bg-black/70 border border-white/10 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded-lg text-sm font-medium transition-all"
          >
            Use Demo Credentials
          </motion.button>

          <div className="mt-6 text-center">
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-accent-cyan hover:text-accent-azure font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
