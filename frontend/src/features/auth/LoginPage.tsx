import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Logo } from '@/components/brand/Logo';
import { Eye, EyeOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { activeTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('expired') ? 'Your session expired. Please sign in again.' : null
  );
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedIdent = identifier.trim();
    if (!trimmedIdent) {
      setError('Please enter your username or email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedIdent, password);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('504') || msg.includes('500') || msg.includes('502')) {
        setError('Cannot connect to backend API server. Please ensure the FastAPI backend is running on http://127.0.0.1:8000.');
      } else {
        setError(msg || 'Incorrect username/email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      // Instant sign-in with verified active demo user
      await login('alice_rider@rupaii.app', 'Password123!');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('504') || msg.includes('500') || msg.includes('502')) {
        setError('Cannot connect to backend API server. Please ensure the FastAPI backend is running on http://127.0.0.1:8000.');
      } else {
        setError('Demo login failed: ' + (msg || 'Unable to authenticate.'));
      }
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center px-4 sm:px-6 py-10 relative z-10">
      <div className="w-full max-w-[400px] glass-panel p-7 sm:p-8 space-y-6 border border-white/25 shadow-2xl animate-fadeIn">
        {/* Header & Logo */}
        <div>
          <div className="inline-block cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" showTagline={false} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white glass-text-glow">
            Sign in
          </h1>
          <p className="mt-1 text-xs text-zinc-300">
            Sign in to coordinate trips, split expenses, and manage settlements.
          </p>

          {/* Active Wallpaper Indicator Badge */}
          {activeTheme && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{activeTheme.name}</span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/20 border border-red-400/35 text-red-200 text-xs animate-fadeIn flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Username or Email */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-semibold text-zinc-200 mb-1.5"
            >
              Username or email
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or email"
              className="glass-input w-full px-3.5 text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-zinc-200 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="glass-input w-full pl-3.5 pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end pt-1.5">
              <Link
                to="/forgot-password"
                className="text-xs text-zinc-300 hover:text-white hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full h-12 rounded-[10px] bg-[#16834A] hover:bg-[#15803D] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>Sign in</span>
            </button>
          </div>
        </form>

        {/* Quick Demo Access Button */}
        <div className="pt-1 border-t border-white/10 space-y-3">
          <p className="text-[11px] text-center text-zinc-400 font-medium">
            Testing the app? Use instant 1-click access:
          </p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading || demoLoading}
            className="w-full h-11 rounded-[10px] glass-interactive border border-emerald-400/30 hover:border-emerald-400/60 text-emerald-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {demoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{demoLoading ? 'Signing in...' : 'Quick Demo Sign In (Alice)'}</span>
          </button>
        </div>

        {/* Register Footer */}
        <div className="text-center pt-2 text-sm text-zinc-300">
          New here?{' '}
          <Link
            to="/register"
            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
