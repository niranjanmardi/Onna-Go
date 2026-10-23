import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Logo } from '@/components/brand/Logo';
import { api } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import {
  Lock,
  Mail,
  User as UserIcon,
  AtSign,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showConfirmation } = useFeedback();
  const navigate = useNavigate();

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('INR');

  // Username validation & availability state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    const cleanUname = username.trim().toLowerCase();
    if (!cleanUname) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const validRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!validRegex.test(cleanUname)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: '3–20 characters: letters, numbers, and underscores only.',
      });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, checking: true, message: 'Checking availability...' }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ username: string; available: boolean; message: string }>(
          `/auth/check-username?username=${encodeURIComponent(cleanUname)}`
        );
        setUsernameStatus({
          checking: false,
          available: res.available,
          message: res.message,
        });
      } catch {
        setUsernameStatus({
          checking: false,
          available: null,
          message: '',
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUname = username.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUname) {
      setError('Please choose a username.');
      return;
    }
    const validRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!validRegex.test(cleanUname)) {
      setError('Username must be 3–20 characters and contain only letters, numbers, or underscores.');
      return;
    }
    if (usernameStatus.available === false) {
      setError(usernameStatus.message || 'Please choose an available username.');
      return;
    }

    if (!cleanName) {
      setError('Please enter your display name.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      await register(cleanUname, cleanName, cleanEmail, password, defaultCurrency);
      showConfirmation({
        title: 'Account created successfully!',
        message: `Welcome to ONNA-GO, @${cleanUname}!`,
        sound: 'trip_success',
      });
      navigate('/dashboard');
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to create your account. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-[#171717] selection:bg-[#DDF5E5] selection:text-[#16834A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block cursor-pointer mb-2" onClick={() => navigate('/')}>
          <Logo size="lg" showTagline={true} theme="light" />
        </div>
        <h1 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
          Create Your Account
        </h1>
        <p className="mt-2 text-sm text-[#737373]">
          Good trips. Great friends. No awkward splits.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E8E8E5] py-7 px-5 sm:px-9 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#E11D48] mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* 1. Username Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737373]"
                >
                  Username
                </label>
                <span className="text-[11px] text-[#A3A3A3]">Permanent @handle</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <AtSign className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. rider_alex"
                  className={`w-full bg-[#FAFAF8] border rounded-xl pl-10 pr-10 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none transition-colors ${
                    usernameStatus.available === true
                      ? 'border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10'
                      : usernameStatus.available === false
                      ? 'border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10'
                      : 'border-[#E8E8E5] focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  {usernameStatus.checking && (
                    <Loader2 className="w-4 h-4 text-[#737373] animate-spin" />
                  )}
                  {!usernameStatus.checking && usernameStatus.available === true && (
                    <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                  )}
                  {!usernameStatus.checking && usernameStatus.available === false && (
                    <XCircle className="w-4 h-4 text-[#E11D48]" />
                  )}
                </div>
              </div>
              {usernameStatus.message && (
                <p
                  className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                    usernameStatus.available === true
                      ? 'text-[#16834A] font-medium'
                      : usernameStatus.available === false
                      ? 'text-[#E11D48]'
                      : 'text-[#737373]'
                  }`}
                >
                  {usernameStatus.message}
                </p>
              )}
            </div>

            {/* 2. Display Name Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737373]"
                >
                  Display Name
                </label>
                <span className="text-[11px] text-[#A3A3A3]">Public name</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Sharma"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

            {/* 3. Email Address Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

            {/* 4. Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-10 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3] hover:text-[#171717] transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 5. Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-10 py-2.5 text-[#171717] placeholder-[#A3A3A3] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A3A3A3] hover:text-[#171717] transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Currency selector (subtle) */}
            <div>
              <label
                htmlFor="defaultCurrency"
                className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5"
              >
                Preferred Currency
              </label>
              <select
                id="defaultCurrency"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
              >
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || usernameStatus.available === false}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#16834A] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-[#737373]">
            By continuing, you agree to ONNA-GO's commitment to zero paise discrepancies and fair group settlements.
          </p>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-[#737373]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#16834A] hover:text-[#136F3F] transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
