import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Logo } from '@/components/brand/Logo';
import { api } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showConfirmation } = useFeedback();
  const navigate = useNavigate();

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    let isCurrent = true;
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
        if (isCurrent) {
          setUsernameStatus({
            checking: false,
            available: res.available,
            message: res.message,
          });
        }
      } catch {
        if (isCurrent) {
          setUsernameStatus({
            checking: false,
            available: null,
            message: '',
          });
        }
      }
    }, 400);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUname = username.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Please enter your name.');
      return;
    }

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

    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register(cleanUname, cleanName, cleanEmail, password, 'INR');
      showConfirmation({
        title: 'Account created',
        message: `Welcome, @${cleanUname}!`,
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
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center px-4 sm:px-6 py-10 relative z-10">
      <div className="w-full max-w-[400px] glass-panel p-7 sm:p-8 space-y-5 border border-white/25 shadow-2xl animate-fadeIn">
        <div>
          <div className="inline-block cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" showTagline={false} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white glass-text-glow">
            Create account
          </h1>
          <p className="mt-1 text-xs text-zinc-300">
            Join ONNA-GO to split expenses with friends on every trip.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/20 border border-red-400/35 text-red-200 text-xs animate-fadeIn flex items-start gap-2.5"
          >
            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {/* 1. Name Field */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold text-zinc-200 mb-1.5"
            >
              Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="glass-input w-full px-3.5 text-sm"
            />
          </div>

          {/* 2. Username Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-zinc-200 mb-1.5"
            >
              Username
            </label>
            <div className="relative">
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
                placeholder="Username"
                className={`glass-input w-full pl-3.5 pr-11 text-sm ${
                  usernameStatus.available === true
                    ? 'border-emerald-400 focus:ring-emerald-400/30'
                    : usernameStatus.available === false
                    ? 'border-red-400 focus:ring-red-400/30'
                    : ''
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {usernameStatus.checking && (
                  <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                )}
                {!usernameStatus.checking && usernameStatus.available === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {!usernameStatus.checking && usernameStatus.available === false && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
            {usernameStatus.message && (
              <p
                className={`text-xs mt-1.5 font-medium ${
                  usernameStatus.available === true
                    ? 'text-emerald-300'
                    : usernameStatus.available === false
                    ? 'text-red-300'
                    : 'text-zinc-300'
                }`}
              >
                {usernameStatus.message}
              </p>
            )}
          </div>

          {/* 3. Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-zinc-200 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="glass-input w-full px-3.5 text-sm"
            />
          </div>

          {/* 4. Password Field */}
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ chars)"
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
            {/* Password rules shown ONLY while typing */}
            {password.length > 0 && (
              <p
                className={`text-xs mt-1.5 font-medium ${
                  password.length >= 8
                    ? 'text-emerald-300'
                    : 'text-red-300'
                }`}
              >
                {password.length >= 8 ? 'At least 8 characters' : 'Must be at least 8 characters'}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || usernameStatus.available === false}
              className="w-full h-12 rounded-[10px] bg-[#16834A] hover:bg-[#15803D] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>Create account</span>
            </button>
          </div>
        </form>

        <div className="text-center pt-2 text-sm text-zinc-300">
          Have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
