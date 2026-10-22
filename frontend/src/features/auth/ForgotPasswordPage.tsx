import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Logo } from '@/components/brand/Logo';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#171717]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block cursor-pointer mb-2" onClick={() => navigate('/')}>
          <Logo size="lg" showTagline={true} theme="light" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
          Reset Your Password
        </h2>
        <p className="mt-1 text-sm text-[#737373]">
          Enter your registered email address to receive password reset instructions.
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

          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#16834A] mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {!devToken ? (
            <form className="space-y-4" onSubmit={handleRequestToken}>
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                <span>{loading ? 'Sending...' : 'Request Password Reset'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleConfirmReset}>
              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                <span>{loading ? 'Updating...' : 'Set New Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-[#737373]">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-[#16834A] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
