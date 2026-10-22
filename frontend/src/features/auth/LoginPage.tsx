import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    searchParams.get('expired') ? 'Your session expired. Please sign in again.' : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'Password123!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#171717]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block cursor-pointer mb-2" onClick={() => navigate('/')}>
          <Logo size="lg" showTagline={true} theme="light" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-[#737373]">
          Sign in to access your trips, expenses, and settlements.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-[#E8E8E5] py-8 px-6 sm:px-10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#E11D48] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#16834A] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 pt-5 border-t border-[#E8E8E5]">
            <p className="text-xs text-[#737373] mb-2 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#16834A]" />
              <span>One-Click Test Accounts:</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin('alice_rider@onnago.app')}
                className="py-2 px-2.5 rounded-lg bg-[#FAFAF8] hover:bg-[#F4F4F2] border border-[#E8E8E5] text-[#171717] text-center font-medium transition-colors"
              >
                Alice (Trip Owner)
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('bob_biker@onnago.app')}
                className="py-2 px-2.5 rounded-lg bg-[#FAFAF8] hover:bg-[#F4F4F2] border border-[#E8E8E5] text-[#171717] text-center font-medium transition-colors"
              >
                Bob (Member)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-[#737373]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#16834A] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
