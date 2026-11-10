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
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center px-4 sm:px-6 py-10 relative z-10">
      <div className="w-full max-w-[400px] glass-panel p-7 sm:p-8 space-y-6 border border-white/25 shadow-2xl animate-fadeIn">
        <div>
          <div className="inline-block cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" showTagline={false} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white glass-text-glow">
            Reset password
          </h1>
          <p className="mt-1 text-xs text-zinc-300">
            Enter your account email to receive your password reset token.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/20 border border-red-400/35 text-red-200 text-xs animate-fadeIn flex items-start gap-2.5"
          >
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 text-xs animate-fadeIn flex items-start gap-2.5"
          >
            <span className="font-medium leading-relaxed">{success}</span>
          </div>
        )}

        {!devToken ? (
          <form className="space-y-4" onSubmit={handleRequestToken} noValidate>
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold text-zinc-200 mb-1.5"
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
                className="glass-input w-full px-3.5 text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[10px] bg-[#16834A] hover:bg-[#15803D] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="block text-xs font-semibold text-zinc-200 mb-1.5"
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
                className="glass-input w-full px-3.5 text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[10px] bg-[#16834A] hover:bg-[#15803D] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>Set new password</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-2 text-sm text-zinc-300">
          <Link
            to="/login"
            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
