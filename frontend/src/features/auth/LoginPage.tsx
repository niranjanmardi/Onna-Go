import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('expired') ? 'Your session expired. Please sign in again.' : null
  );
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Incorrect username/email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#0A0A0A] flex flex-col justify-center px-4 sm:px-6 py-12 text-[#121212] dark:text-[#EDEDED] transition-colors">
      <div className="w-full max-w-[400px] mx-auto">
        <div className="mb-6">
          <div className="inline-block cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" showTagline={false} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#121212] dark:text-[#EDEDED]">
            Sign in
          </h1>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-[10px] bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FCA5A5] dark:border-[#991B1B]/40 text-[#DC2626] dark:text-[#EF4444] text-xs mb-4 animate-fadeIn"
          >
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-medium text-[#71717A] dark:text-[#9E9E9E] mb-1.5"
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
              className="w-full h-12 bg-[#FAFAF9] dark:bg-[#121212] border border-[#E4E4E7] dark:border-[#222222] rounded-[10px] px-3.5 text-sm text-[#121212] dark:text-[#EDEDED] placeholder-[#A1A1AA] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] focus:ring-1 focus:ring-[#16834A] dark:focus:ring-[#22C55E] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#71717A] dark:text-[#9E9E9E] mb-1.5"
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
                className="w-full h-12 bg-[#FAFAF9] dark:bg-[#121212] border border-[#E4E4E7] dark:border-[#222222] rounded-[10px] pl-3.5 pr-11 text-sm text-[#121212] dark:text-[#EDEDED] placeholder-[#A1A1AA] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] focus:ring-1 focus:ring-[#16834A] dark:focus:ring-[#22C55E] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#121212] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end pt-1.5">
              <Link
                to="/forgot-password"
                className="text-xs text-[#71717A] dark:text-[#9E9E9E] hover:text-[#121212] dark:hover:text-[#EDEDED] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-[10px] bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] font-medium text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>Sign in</span>
            </button>
          </div>
        </form>

        <div className="text-center mt-6 text-sm text-[#71717A] dark:text-[#9E9E9E]">
          New here?{' '}
          <Link
            to="/register"
            className="font-medium text-[#16834A] dark:text-[#22C55E] hover:underline transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
