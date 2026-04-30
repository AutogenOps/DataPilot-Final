import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DataPilotMark from '../components/DataPilotMark';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isPasswordValid) {
      setError('Password does not meet requirements');
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Ensure the confirmation email (if enabled in Supabase) brings the user back to this app.
          emailRedirectTo: `${window.location.origin}/signin`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const StrengthIndicator = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-1.5 h-1.5 rounded-full transition-colors ${
          met ? 'bg-status-success' : 'bg-text-muted'
        }`}
      />
      <span className={`text-xs ${met ? 'text-status-success' : 'text-text-muted'}`}>
        {label}
      </span>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="w-16 h-16 bg-gradient-to-br from-status-success to-accent-cyan rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-bg-primary" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold text-gradient-cyan mb-2">
            Account Created!
          </h2>
          <p className="text-text-secondary mb-6">
            Please check your email to verify your account
          </p>
          <p className="text-xs text-text-muted">Redirecting to sign in...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-azure/10" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0, 180, 216, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="backdrop-blur-xl bg-bg-surface/30 border border-[rgba(255,255,255,0.14)] rounded-2xl p-8"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <DataPilotMark className="h-8 w-8" />
              <h1 className="text-3xl font-display font-bold text-gradient-cyan">
                DataPilot
              </h1>
            </div>
            <p className="text-text-secondary text-sm">
              Join the AI orchestration revolution
            </p>
          </motion.div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-xs font-mono text-text-muted mb-2">
                FULL NAME
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full pl-10 pr-4 py-3 bg-bg-primary border border-[rgba(255,255,255,0.14)] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <label className="block text-xs font-mono text-text-muted mb-2">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-bg-primary border border-[rgba(255,255,255,0.14)] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-xs font-mono text-text-muted mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-bg-primary border border-[rgba(255,255,255,0.14)] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-accent-cyan transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {password && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-bg-primary rounded-lg border border-[rgba(255,255,255,0.08)] space-y-1.5"
                >
                  <p className="text-xs text-text-muted mb-2 font-mono">
                    Password strength
                  </p>
                  <StrengthIndicator met={passwordStrength.length} label="At least 8 characters" />
                  <StrengthIndicator met={passwordStrength.uppercase} label="One uppercase letter" />
                  <StrengthIndicator met={passwordStrength.lowercase} label="One lowercase letter" />
                  <StrengthIndicator met={passwordStrength.number} label="One number" />
                </motion.div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <label className="block text-xs font-mono text-text-muted mb-2">
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 bg-bg-primary border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 transition-all ${
                    confirmPassword
                      ? passwordsMatch
                        ? 'border-status-success focus:border-status-success focus:ring-status-success/30'
                        : 'border-status-error focus:border-status-error focus:ring-status-error/30'
                      : 'border-[rgba(255,255,255,0.14)] focus:border-accent-cyan focus:ring-accent-cyan/30'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-accent-cyan transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[rgba(255,107,107,0.10)] border border-status-error rounded-lg"
              >
                <p className="text-xs font-mono text-status-error">{error}</p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 bg-bg-primary border border-[rgba(255,255,255,0.14)] rounded checked:bg-accent-cyan cursor-pointer"
                  required
                />
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                  I agree to the{' '}
                  <a href="#" className="text-accent-cyan hover:text-accent-azure">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-accent-cyan hover:text-accent-azure">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-accent-cyan to-accent-azure hover:from-accent-azure hover:to-accent-cyan text-bg-primary font-display font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-4 h-4 border-2 border-transparent border-t-bg-primary rounded-full"
                  />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link
                to="/signin"
                className="text-accent-cyan hover:text-accent-azure font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8"
        >
          <p className="text-xs text-text-muted">Enterprise AI Orchestration Platform</p>
        </motion.div>
      </div>
    </div>
  );
}
