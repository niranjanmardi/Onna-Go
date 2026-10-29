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
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-[#121212] dark:text-[#EDEDED] flex flex-col justify-between selection:bg-[#DDF5E5] selection:text-[#16834A]">
      {/* --- Minimal Top Bar --- */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md hairline-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
            <Logo size="sm" showTagline={false} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/download')}
              className="text-xs sm:text-sm font-medium text-[#16834A] dark:text-[#22C55E] hover:opacity-85 px-2 py-1.5 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android App</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-[#71717A] hover:text-[#121212] dark:text-[#9E9E9E] dark:hover:text-[#EDEDED] px-2 py-1.5 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-semibold bg-[#121212] hover:bg-[#27272A] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#121212] px-3.5 py-1.5 rounded-lg btn-press transition-colors cursor-pointer"
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
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#121212] dark:text-[#EDEDED] leading-tight">
            Share trip expenses with friends
          </h1>
          <p className="mt-3.5 text-base sm:text-lg text-[#71717A] dark:text-[#9E9E9E] leading-relaxed max-w-lg mx-auto">
            Track spending on group trips, calculate who owes what, and settle balances with fewer transfers.
          </p>
        </section>

        {/* Real Product Preview: Phone-style mockup of a trip's expense list */}
        <section className="px-4 pb-12">
          <div className="w-full max-w-[360px] mx-auto bg-white dark:bg-[#121212] rounded-[24px] hairline shadow-xs p-4 sm:p-5">
            {/* Phone speaker notch */}
            <div className="w-12 h-1 bg-[#E4E4E7] dark:bg-[#2A2A2A] rounded-full mx-auto mb-4" />

            {/* Trip Summary Header */}
            <div className="flex items-center justify-between pb-3 hairline-b">
              <div>
                <p className="text-xs text-[#71717A] dark:text-[#9E9E9E]">Western Ghats Road Trip</p>
                <h2 className="text-sm font-semibold text-[#121212] dark:text-[#EDEDED] mt-0.5">
                  4 members
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#71717A] dark:text-[#9E9E9E] block">Total spent</span>
                <span className="text-sm font-semibold font-mono text-[#121212] dark:text-[#EDEDED] tabular-nums">
                  ₹18,450
                </span>
              </div>
            </div>

            {/* Balance Status */}
            <div className="py-2 px-3 my-3 rounded-lg bg-[#EBF7EE] dark:bg-[#22C55E]/10 flex items-center justify-between text-xs">
              <span className="text-[#16834A] dark:text-[#22C55E] font-medium">Your balance</span>
              <span className="text-[#16834A] dark:text-[#22C55E] font-semibold font-mono tabular-nums">
                +₹1,420 to receive
              </span>
            </div>

            {/* Feed Rows (Avatar, Name & description, Amount) */}
            <div className="divide-y divide-[#E4E4E7] dark:divide-[#222222]">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#F5F5F4] dark:bg-[#1F1F1F] text-[#121212] dark:text-[#EDEDED] flex items-center justify-center text-xs font-semibold shrink-0">
                    RS
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#121212] dark:text-[#EDEDED] truncate">
                      Highway fuel &amp; tolls
                    </p>
                    <p className="text-xs text-[#71717A] dark:text-[#9E9E9E] truncate">
                      Paid by Rahul • 4 people
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold font-mono text-[#121212] dark:text-[#EDEDED] tabular-nums shrink-0 ml-3">
                  ₹3,200
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#F5F5F4] dark:bg-[#1F1F1F] text-[#121212] dark:text-[#EDEDED] flex items-center justify-center text-xs font-semibold shrink-0">
                    PP
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#121212] dark:text-[#EDEDED] truncate">
                      Homestay booking
                    </p>
                    <p className="text-xs text-[#71717A] dark:text-[#9E9E9E] truncate">
                      Paid by Priya • 4 people
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold font-mono text-[#121212] dark:text-[#EDEDED] tabular-nums shrink-0 ml-3">
                  ₹9,400
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#16834A]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center text-xs font-semibold shrink-0">
                    You
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#121212] dark:text-[#EDEDED] truncate">
                      Dinner &amp; trail snacks
                    </p>
                    <p className="text-xs text-[#71717A] dark:text-[#9E9E9E] truncate">
                      Paid by You • 4 people
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold font-mono text-[#121212] dark:text-[#EDEDED] tabular-nums shrink-0 ml-3">
                  ₹5,850
                </span>
              </div>
            </div>

            {/* Settle Prompt Bar */}
            <div className="mt-3 pt-3 hairline-t flex items-center justify-between text-xs text-[#71717A] dark:text-[#9E9E9E]">
              <span>Debt simplification</span>
              <span className="font-medium text-[#121212] dark:text-[#EDEDED]">
                2 transfers to settle group
              </span>
            </div>
          </div>
        </section>

        {/* --- 3 Simple Feature Rows (Icon + One Line of Text, No Boxes, No Shadows) --- */}
        <section className="py-8 px-4 sm:px-6 max-w-sm sm:max-w-md mx-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4 text-[#16834A] dark:text-[#22C55E] shrink-0" />
              <span className="text-sm text-[#121212] dark:text-[#EDEDED]">
                Split equally, by exact amounts, or percentage shares
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-4 h-4 text-[#16834A] dark:text-[#22C55E] shrink-0" />
              <span className="text-sm text-[#121212] dark:text-[#EDEDED]">
                Settle group balances in the fewest direct transfers
              </span>
            </div>
            <div className="flex items-center gap-3">
              <WifiOff className="w-4 h-4 text-[#16834A] dark:text-[#22C55E] shrink-0" />
              <span className="text-sm text-[#121212] dark:text-[#EDEDED]">
                Log expenses offline and sync automatically when connected
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* --- Simple Footer --- */}
      <footer className="hairline-t py-6 px-4 sm:px-6 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A] dark:text-[#9E9E9E]">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" showTagline={false} />
          <span>© 2026 ONNA-GO</span>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/download')}
            className="hover:text-[#121212] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
          >
            Download APK
          </button>
          <button
            onClick={() => navigate('/login')}
            className="hover:text-[#121212] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="hover:text-[#121212] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
          >
            Get started
          </button>
        </div>
      </footer>
    </div>
  );
};

