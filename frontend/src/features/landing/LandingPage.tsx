import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Lock,
  ChevronRight,
  TrendingDown,
  Sparkles,
  MapPin,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] selection:bg-[#DDF5E5] selection:text-[#16834A]">
      {/* --- Minimal Navigation Bar --- */}
      <header className="sticky top-0 z-50 bg-[#FAFAF8]/85 backdrop-blur-md border-b border-[#E8E8E5] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Logo size="md" showTagline={false} showTamil={true} tamilClassName="hidden sm:inline-flex" theme="light" />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#737373]">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#171717] transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#171717] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('calculator-demo')}
              className="hover:text-[#171717] transition-colors"
            >
              Split Demo
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-[#171717] hover:text-[#16834A] px-2.5 sm:px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-xs sm:text-sm font-semibold bg-[#171717] hover:bg-[#262626] text-white px-3.5 sm:px-4 py-2 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.06)] active:scale-[0.98] whitespace-nowrap"
            >
              Plan a Trip
            </button>
          </div>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        {/* Subtle Tamil Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDF5E5] border border-[#C6ECCF] text-xs font-semibold text-[#16834A] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16834A]" />
          <span>ஒண்ணா போ • The All-In-One Travel &amp; Expense Hub</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#171717] leading-[1.08] max-w-4xl mx-auto font-['Plus_Jakarta_Sans']">
          Good trips. Great friends. <br className="hidden sm:inline" />
          <span className="text-[#16834A]">No awkward splits.</span>
        </h1>

        {/* Supporting Copy */}
        <p className="mt-6 text-lg sm:text-xl text-[#737373] max-w-2xl mx-auto font-normal leading-relaxed">
          Plan trips, organize rides, track shared expenses, and settle balances with friends in one calm, transparent place.
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-base font-semibold py-3.5 px-7 rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Plan a Trip</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToSection('how-it-works')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E5] text-base font-semibold py-3.5 px-6 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <span>Explore How It Works</span>
          </button>
        </div>
      </section>

      {/* --- Refined Product Preview Composition --- */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="bg-white border border-[#E8E8E5] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Mock Browser/Window Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#E8E8E5]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#E8E8E5]" />
                <div className="w-3 h-3 rounded-full bg-[#E8E8E5]" />
                <div className="w-3 h-3 rounded-full bg-[#E8E8E5]" />
              </div>
              <span className="text-xs font-semibold text-[#737373] font-mono ml-2">
                onna-go.app/trips/western-ghats
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DDF5E5] text-[#16834A] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero-Sum Verified</span>
            </div>
          </div>

          {/* Trip Header Preview */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#737373] mb-1">
                <span>📍 Western Ghats Monsoon Ride</span>
                <span>•</span>
                <span>4 Riders</span>
              </div>
              <h3 className="text-2xl font-bold text-[#171717] tracking-tight">
                Chikmagalur to Ooty Expedition
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">Total Pool</span>
              <span className="text-2xl font-bold font-mono text-[#171717] tabular-nums">
                ₹24,800.00
              </span>
            </div>
          </div>

          {/* Cards Grid Inside Preview */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Balance Pill 1 */}
            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs text-[#737373] block mb-1">Alice Sharma (Paid Stay &amp; Fuel)</span>
              <span className="text-lg font-bold font-mono text-[#16834A] tabular-nums">
                +₹6,200.00
              </span>
              <span className="text-[11px] text-[#16834A] block mt-0.5 font-medium">To receive from group</span>
            </div>

            {/* Balance Pill 2 */}
            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs text-[#737373] block mb-1">Bob Verma (Fuel Share)</span>
              <span className="text-lg font-bold font-mono text-[#B45309] tabular-nums">
                -₹2,100.00
              </span>
              <span className="text-[11px] text-[#B45309] block mt-0.5 font-medium">Owes to Alice via UPI</span>
            </div>

            {/* Balance Pill 3 */}
            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <span className="text-xs text-[#737373] block mb-1">Settlement Efficiency</span>
              <span className="text-lg font-bold font-mono text-[#171717]">
                2 Transfers
              </span>
              <span className="text-[11px] text-[#737373] block mt-0.5">Optimized down from 6 debts</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- 3-Step "How It Works" Section --- */}
      <section id="how-it-works" className="py-20 px-6 max-w-5xl mx-auto border-t border-[#E8E8E5]">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
            How ONNA-GO Works
          </h2>
          <p className="text-[#737373] mt-2 text-base">
            Simple, transparent group spending in three effortless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] relative shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-sm mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-[#171717]">Create trip &amp; invite</h3>
            <p className="mt-2 text-sm text-[#737373] leading-relaxed">
              Start a road trip or weekend hangout in seconds. Share an instant 6-character code with your friends to join on web or mobile.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] relative shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#16834A] text-white flex items-center justify-center font-bold text-sm mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-[#171717]">Record rides &amp; stays</h3>
            <p className="mt-2 text-sm text-[#737373] leading-relaxed">
              Log highway fuel, stays, and food as you go. Split equally, by exact rupees, percentage, or custom weights with zero paise discrepancy.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] relative shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-sm mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-[#171717]">Settle with one tap</h3>
            <p className="mt-2 text-sm text-[#737373] leading-relaxed">
              Our automated min-cash-flow algorithm simplifies debts into the minimum number of payments. Pay via UPI and confirm with two taps.
            </p>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="py-20 px-6 max-w-5xl mx-auto border-t border-[#E8E8E5]">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
            Designed for Travelers. Engineered for Trust.
          </h2>
          <p className="text-[#737373] mt-2 text-base">
            Everything your travel group needs to stay organized without the awkward balance disputes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#171717]">Trip Planning &amp; Itineraries</h3>
            <p className="mt-1.5 text-sm text-[#737373] leading-relaxed">
              Organize multiple rides and sub-activities under a single trip. Set destination coordinates, currencies, and budget targets.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#171717]">4 Precision Split Engines</h3>
            <p className="mt-1.5 text-sm text-[#737373] leading-relaxed">
              Equal splits with deterministic remainder distribution, exact rupee shares, percentages, and custom weights. Calculated in integer minor units.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center mb-4">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#171717]">Debt Simplification</h3>
            <p className="mt-1.5 text-sm text-[#737373] leading-relaxed">
              Greedy bipartite min-cash-flow algorithm turns complex webs of mutual debts into the smallest set of direct payments.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-2xl bg-white border border-[#E8E8E5] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#171717]">Verified Settlement Tracking</h3>
            <p className="mt-1.5 text-sm text-[#737373] leading-relaxed">
              Payments are recorded with UPI transaction IDs and confirmed by the recipient before balances are updated. Full audit integrity.
            </p>
          </div>
        </div>
      </section>

      {/* --- Interactive Live Split Calculator Demo --- */}
      <section id="calculator-demo" className="py-20 px-6 max-w-5xl mx-auto border-t border-[#E8E8E5]">
        <div className="bg-white border border-[#E8E8E5] rounded-2xl p-6 sm:p-10 shadow-sm max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-6 border-b border-[#E8E8E5]">
            <div>
              <span className="text-xs font-semibold text-[#16834A] uppercase tracking-wider">
                Live Precision Calculator
              </span>
              <h3 className="text-xl font-bold text-[#171717] mt-0.5">
                Test Integer-Paise Mathematical Accuracy
              </h3>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#DDF5E5] text-[#16834A] text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>∑ Net = 0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="text-xs font-semibold text-[#737373] uppercase tracking-wider block mb-2">
                Total Bill Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={demoAmount}
                onChange={(e) => setDemoAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-4 py-2.5 text-[#171717] font-mono text-lg tabular-nums focus:outline-none focus:border-[#16834A] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#737373] uppercase tracking-wider block mb-2">
                Number of Friends / Riders
              </label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setDemoPeople(num)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      demoPeople === num
                        ? 'bg-[#171717] text-white shadow-xs'
                        : 'bg-[#FAFAF8] text-[#737373] hover:text-[#171717] border border-[#E8E8E5]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split Output Card */}
          <div className="mt-6 p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#737373]">Base Share per Person</p>
              <p className="text-2xl font-bold font-mono text-[#171717] tabular-nums">
                {formatPaise(demoPerPerson)}
              </p>
            </div>
            {demoRemainder > 0 && (
              <div className="text-xs text-[#B45309] bg-[#FEF3C7] px-3 py-2 rounded-lg border border-[#FDE68A] max-w-sm">
                Deterministic Remainder: +₹0.01 assigned to the first {demoRemainder} friend(s). Total reconciles to exactly ₹{demoAmount}.00.
              </div>
            )}
            <div className="text-right">
              <span className="text-xs text-[#737373] block">Total Reconciled</span>
              <span className="text-xl font-bold text-[#16834A] font-mono tabular-nums">
                {formatPaise(demoAmount * 100)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- Closing CTA Banner --- */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center border-t border-[#E8E8E5]">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#171717] tracking-tight font-['Plus_Jakarta_Sans']">
          Ready for your next journey?
        </h2>
        <p className="text-[#737373] mt-3 max-w-md mx-auto text-base">
          Create your trip in seconds. Invite friends with one code. Settle up with confidence.
        </p>
        <div className="mt-8">
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-base font-semibold py-3.5 px-8 rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* --- Minimal Footer --- */}
      <footer className="border-t border-[#E8E8E5] py-12 px-6 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-[#737373] text-sm">
        <Logo size="sm" showTagline={true} showTamil={true} theme="light" />
        <p className="text-xs text-[#737373]">
          ONNA-GO (ஒண்ணா போ) — Plan Together. Spend Smarter. Settle Fairly.
        </p>
      </footer>
    </div>
  );
};
