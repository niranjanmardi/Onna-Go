import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Lock,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Music,
  MapPin,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { formatPaise } from '@/lib/currency';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Interactive Live Split Calculator Demo
  const [demoAmount, setDemoAmount] = useState<number>(3000);
  const [demoPeople, setDemoPeople] = useState<number>(4);

  const demoPerPerson = Math.floor((demoAmount * 100) / demoPeople);
  const demoRemainder = (demoAmount * 100) % demoPeople;

  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-indigo-500 selection:text-white">
      {/* --- Navbar --- */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Logo size="md" showTagline={false} showTamil={true} theme="dark" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-orange-500 hover:from-indigo-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative overflow-hidden pt-16 pb-24 px-6 max-w-7xl mx-auto text-center">
        {/* Ambient glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-orange-500/20 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Tamil Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-orange-400 mb-8 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>ஒண்ணா போ • The All-In-One Trip & Expense Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans'] leading-tight sm:leading-none max-w-4xl mx-auto">
          Ride Together. Vibe Together. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            Split Together.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Plan trips, organize rides, share experiences, and split expenses with your friends — all in one place.
        </p>

        {/* Clear Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-orange-500 hover:from-indigo-600 hover:to-orange-600 text-white text-base font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/trips/new')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 py-3.5 px-7 rounded-xl font-semibold transition-all bg-slate-800/60 text-white"
          >
            <Compass className="w-4 h-4 text-orange-400" />
            <span>Create a Trip</span>
          </button>

          <button
            onClick={scrollToFeatures}
            className="w-full sm:w-auto text-slate-400 hover:text-white py-3.5 px-5 rounded-xl font-medium transition-colors text-sm"
          >
            Explore Features
          </button>
        </div>

        {/* --- Interactive Live Split Calculator Demo --- */}
        <div className="mt-16 max-w-3xl mx-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl text-left">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-orange-400">Live Mathematical Precision Demo</span>
              <h3 className="text-lg font-bold text-white mt-0.5">Highway Fuel & Stay Split</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero-Sum Invariant</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Total Bill Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={demoAmount}
                onChange={(e) => setDemoAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Number of Friends / Riders
              </label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setDemoPeople(num)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                      demoPeople === num
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split Output Card */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Base Share per Person</p>
              <p className="text-2xl font-bold font-mono text-orange-400">
                {formatPaise(demoPerPerson)}
              </p>
            </div>
            {demoRemainder > 0 && (
              <div className="text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                ⚠️ Remainder: {demoRemainder} paise deterministically distributed +₹0.01 to the first {demoRemainder} friends. Reconciles to ₹{demoAmount}.00 exactly.
              </div>
            )}
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Reconciled</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {formatPaise(demoAmount * 100)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section id="features-section" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
            Everything You Need For Unforgettable Adventures
          </h2>
          <p className="text-slate-400 mt-3 text-base">
            From road trips and bike rides to weekend hangouts, ONNA-GO keeps everything transparent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Trips & Hangouts</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Create trips with custom currencies, set destinations, invite friends with 1-click codes, and group expenses by activity.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-orange-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">4 Precision Split Methods</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Equal, exact rupee amounts, percentage shares, and custom weights. Calculated strictly in integer paise with zero floating-point errors.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-amber-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Debt Simplification</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Automated min-cash-flow algorithm simplifies multi-party debts into the minimum number of direct transfers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-emerald-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Settlement Verification</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Track settlement status from initiated to verified. Only recipient-confirmed transfers update effective group balances.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Sanitized CSV & PDF</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Export comprehensive PDF summaries and CSV reports equipped with spreadsheet formula injection protection.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-rose-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Private & Secure</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Argon2id password hashing, private receipt access control, role-based authorization, and strict session management.
            </p>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-800 py-12 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-400 text-sm">
        <Logo size="sm" showTagline={true} showTamil={true} theme="dark" />
        <p className="text-slate-500 text-xs">
          ONNA-GO (ஒண்ணா போ) — Ride Together. Vibe Together. Split Together.
        </p>
      </footer>
    </div>
  );
};
