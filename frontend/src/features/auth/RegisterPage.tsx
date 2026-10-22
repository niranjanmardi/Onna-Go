import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);

    try {
      await register(email, fullName, password, defaultCurrency);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please check your information.');
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
          Start Splitting Smarter
        </h2>
        <p className="mt-1 text-sm text-[#737373]">
          Create your free ONNA-GO account for your road trips &amp; group rides.
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
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alice Sharma"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Default Currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="AED">AED (د.إ) — UAE Dirham</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#737373]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#16834A] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
