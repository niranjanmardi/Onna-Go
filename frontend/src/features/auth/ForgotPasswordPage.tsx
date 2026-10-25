import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Logo } from '@/components/brand/Logo';
import { Loader2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string; dev_reset_token?: string }>(
        '/auth/password-reset-request',
        { email }
      );
      if (res.dev_reset_token) {
        setDevToken(res.dev_reset_token);
        setSuccess('Reset token generated. Enter your new password below.');
      } else {
        setSuccess(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error requesting reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devToken) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/auth/password-reset-confirm', {
        token: devToken,
        new_password: newPassword,
      });
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Error resetting password.');
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
            Reset password
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

        {success && (
          <div
            role="status"
            className="p-3 rounded-[10px] bg-[#F0FDF4] dark:bg-[#052E16]/40 border border-[#BBF7D0] dark:border-[#166534]/40 text-[#16834A] dark:text-[#22C55E] text-xs mb-4 animate-fadeIn"
          >
            {success}
          </div>
        )}

        {!devToken ? (
          <form className="space-y-4" onSubmit={handleRequestToken} noValidate>
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-medium text-[#71717A] dark:text-[#9E9E9E] mb-1.5"
              >
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-12 bg-[#FAFAF9] dark:bg-[#121212] border border-[#E4E4E7] dark:border-[#222222] rounded-[10px] px-3.5 text-sm text-[#121212] dark:text-[#EDEDED] placeholder-[#A1A1AA] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] focus:ring-1 focus:ring-[#16834A] dark:focus:ring-[#22C55E] transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[10px] bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] font-medium text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>Request password reset</span>
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleConfirmReset} noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-medium text-[#71717A] dark:text-[#9E9E9E] mb-1.5"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-12 bg-[#FAFAF9] dark:bg-[#121212] border border-[#E4E4E7] dark:border-[#222222] rounded-[10px] px-3.5 text-sm text-[#121212] dark:text-[#EDEDED] placeholder-[#A1A1AA] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] focus:ring-1 focus:ring-[#16834A] dark:focus:ring-[#22C55E] transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[10px] bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] font-medium text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>Set new password</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-6 text-sm text-[#71717A] dark:text-[#9E9E9E]">
          <Link
            to="/login"
            className="font-medium text-[#16834A] dark:text-[#22C55E] hover:underline transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
