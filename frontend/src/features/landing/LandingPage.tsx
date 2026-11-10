import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  ArrowRightLeft,
  WifiOff,
  Smartphone,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300 relative z-10">
      {/* --- Frosted Top Bar --- */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
            <Logo size="sm" showTagline={false} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/download')}
              className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android App</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-zinc-200 hover:text-white px-3 py-1.5 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-bold bg-[#16834A] hover:bg-[#15803D] text-white px-4 py-1.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1">
        {/* Short, plain headline and one supporting line */}
        <section className="pt-12 sm:pt-16 pb-8 px-4 sm:px-6 max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight glass-text-glow">
            Share trip expenses with friends
          </h1>
          <p className="mt-3.5 text-base sm:text-lg text-zinc-200 leading-relaxed max-w-lg mx-auto">
            Track spending on group trips, calculate who owes what, and settle balances with fewer transfers.
          </p>
        </section>

        {/* Real Product Preview: Phone-style mockup of a trip's expense list */}
        <section className="px-4 pb-12">
          <div className="w-full max-w-[360px] mx-auto glass-panel border border-white/25 shadow-2xl p-5 sm:p-6">
            {/* Phone speaker notch */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Trip Summary Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <p className="text-xs text-zinc-300">Western Ghats Road Trip</p>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  4 members
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-zinc-300 block">Total spent</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  ₹18,450
                </span>
              </div>
            </div>

            {/* Balance Status */}
            <div className="py-2 px-3 my-3 rounded-xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-semibold">Your balance</span>
              <span className="text-emerald-300 font-bold tabular-nums">
                +₹1,420 to receive
              </span>
            </div>

            {/* Feed Rows (Avatar, Name & description, Amount) */}
            <div className="divide-y divide-white/10">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    RS
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      Highway fuel &amp; tolls
                    </p>
                    <p className="text-xs text-zinc-300 truncate">
                      Paid by Rahul • 4 people
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-white tabular-nums shrink-0 ml-3">
                  ₹3,200
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    PP
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      Homestay booking
                    </p>
                    <p className="text-xs text-zinc-300 truncate">
                      Paid by Priya • 4 people
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-white tabular-nums shrink-0 ml-3">
                  ₹9,400
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center text-xs font-bold shrink-0">
                    You
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      Dinner &amp; trail snacks
                    </p>
                    <p className="text-xs text-zinc-300 truncate">
                      Paid by You • 4 people
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-white tabular-nums shrink-0 ml-3">
                  ₹5,850
                </span>
              </div>
            </div>

            {/* Settle Prompt Bar */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-300">
              <span>Debt simplification</span>
              <span className="font-bold text-white">
                2 transfers to settle group
              </span>
            </div>
          </div>
        </section>

        {/* --- 3 Simple Feature Rows --- */}
        <section className="py-8 px-4 sm:px-6 max-w-sm sm:max-w-md mx-auto">
          <div className="space-y-3">
            <div className="glass-card p-3.5 flex items-center gap-3 border border-white/20">
              <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-white">
                Split equally, by exact amounts, or percentage shares
              </span>
            </div>
            <div className="glass-card p-3.5 flex items-center gap-3 border border-white/20">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-white">
                Settle group balances in the fewest direct transfers
              </span>
            </div>
            <div className="glass-card p-3.5 flex items-center gap-3 border border-white/20">
              <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-white">
                Log expenses offline and sync automatically when connected
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* --- Frosted Footer --- */}
      <footer className="border-t border-white/15 py-6 px-4 sm:px-6 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-300">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" showTagline={false} />
          <span>© 2026 ONNA-GO</span>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/download')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Download APK
          </button>
          <button
            onClick={() => navigate('/login')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="hover:text-white transition-colors cursor-pointer font-bold text-emerald-400"
          >
            Get started
          </button>
        </div>
      </footer>
    </div>
  );
};

