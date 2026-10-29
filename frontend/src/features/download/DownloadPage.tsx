import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Sun,
  Moon,
  Users,
  Receipt,
  Scale,
  RefreshCw,
  FileSpreadsheet,
  Zap,
  Info,
  X,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useOptionalTheme } from '@/context/ThemeContext';
import { useAuth } from '@/features/auth/AuthContext';
import { ANDROID_APK_CONFIG } from '@/config/apk-config';

export const DownloadPage: React.FC = () => {
  const navigate = useNavigate();
  const themeCtx = useOptionalTheme();
  const { user } = useAuth();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  // Determine web app destination
  const webAppDestination = user ? '/dashboard' : '/login';

  // Absolute download URL for copying or direct links
  const fullDownloadUrl = ANDROID_APK_CONFIG.downloadUrl.startsWith('http')
    ? ANDROID_APK_CONFIG.downloadUrl
    : `${window.location.origin}${ANDROID_APK_CONFIG.downloadUrl}`;

  // SEO Title & Meta tags
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Download ONNA-GO for Android — Official APK';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const handleDownloadClick = () => {
    setDownloadTriggered(true);
    setIsDownloadModalOpen(true);

    // Trigger download via anchor element
    const link = document.createElement('a');
    link.href = ANDROID_APK_CONFIG.downloadUrl;
    link.download = ANDROID_APK_CONFIG.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullDownloadUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const toggleTheme = () => {
    if (!themeCtx) return;
    const nextTheme = themeCtx.resolvedTheme === 'dark' ? 'light' : 'dark';
    themeCtx.setTheme(nextTheme);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] dark:bg-[#0B0B0C] text-[#18181B] dark:text-[#F5F5F7] selection:bg-[#16834A]/20 selection:text-[#16834A] dark:selection:text-[#22C55E] flex flex-col justify-between transition-colors duration-200">
      {/* ========================================================================= */}
      {/* --- TOP NAVIGATION BAR --- */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/85 dark:bg-[#141416]/85 backdrop-blur-md border-b border-[#E4E4E7] dark:border-[#2A2A2E]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer transition-opacity hover:opacity-90"
            title="ONNA-GO Home"
          >
            <Logo size="sm" showTagline={false} />
          </div>

          {/* Quick links & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick anchors on larger screens */}
            <nav className="hidden md:flex items-center gap-5 mr-3 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
              <a href="#features" className="hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors">
                Features
              </a>
              <a href="#installation" className="hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors">
                Install Guide
              </a>
              <a href="#specs" className="hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors">
                Technical Specs
              </a>
            </nav>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${themeCtx?.resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#1B1B1E] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
            >
              {themeCtx?.resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#F5F5F7]" />
              ) : (
                <Moon className="w-4 h-4 text-[#18181B]" />
              )}
            </button>

            {/* Continue to Web App button */}
            <button
              onClick={() => navigate(webAppDestination)}
              className="text-xs sm:text-sm font-medium px-3 sm:px-3.5 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#1B1B1E] text-[#18181B] dark:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#242428] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
              <span>Web App</span>
              <ArrowRight className="w-3 h-3 text-[#71717A] dark:text-[#A1A1AA]" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* --- HERO SECTION --- */}
      {/* ========================================================================= */}
      <main className="flex-1">
        <section className="pt-10 sm:pt-16 pb-14 px-4 sm:px-6 max-w-5xl mx-auto">
          {/* Release Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#141416] text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#16834A] dark:bg-[#22C55E] animate-pulse" />
              <span>Android {ANDROID_APK_CONFIG.version} (Official Release)</span>
              <span className="text-[#A1A1AA] dark:text-[#71717A]">•</span>
              <span className="font-mono tabular-nums">{ANDROID_APK_CONFIG.apkSizeFormatted}</span>
            </div>
          </div>

          {/* Headlines & Tagline */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#18181B] dark:text-[#F5F5F7] leading-[1.15]">
              Every Trip. Every Expense. <br />
              <span className="text-[#16834A] dark:text-[#22C55E]">One Simple App.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[#71717A] dark:text-[#A1A1AA] leading-relaxed max-w-xl mx-auto">
              Travel together, track shared expenses, and settle up effortlessly.
            </p>

            <p className="mt-1.5 text-xs sm:text-sm font-medium tracking-tight text-[#16834A] dark:text-[#22C55E]">
              {ANDROID_APK_CONFIG.tagline}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
              {/* Primary Download CTA */}
              <button
                onClick={handleDownloadClick}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#0B0B0C] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="w-5 h-5 stroke-[2.2]" />
                <span>Download for Android</span>
                <span className="text-xs opacity-90 font-mono tabular-nums bg-white/20 dark:bg-black/15 px-1.5 py-0.5 rounded">
                  {ANDROID_APK_CONFIG.apkSizeFormatted}
                </span>
              </button>

              {/* Secondary Web App CTA */}
              <button
                onClick={() => navigate(webAppDestination)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#141416] hover:bg-[#F0F0F2] dark:hover:bg-[#1E1E22] text-[#18181B] dark:text-[#F5F5F7] font-medium text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Continue to Web App</span>
                <ArrowRight className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
              </button>
            </div>

            {/* Verification subtext */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
              <span>Direct APK release • Android 7.0 or higher required</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* --- PHONE MOCKUP (Showing Real ONNA-GO Dashboard UI) --- */}
          {/* ========================================================================= */}
          <div className="mt-12 sm:mt-16 flex justify-center">
            <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
              {/* Outer Phone Frame */}
              <div className="relative rounded-[36px] bg-[#18181B] dark:bg-[#1C1C1F] p-3 shadow-xl border border-[#E4E4E7] dark:border-[#2A2A2E]">
                {/* Phone Notch & Speaker cutout */}
                <div className="relative z-10 flex items-center justify-center mb-2.5 pt-0.5">
                  <div className="w-12 h-1 bg-[#2E2E32] dark:bg-[#2C2C30] rounded-full" />
                </div>

                {/* Inner Screen */}
                <div className="rounded-[28px] overflow-hidden bg-white dark:bg-[#121214] text-[#18181B] dark:text-[#F5F5F7] border border-[#E4E4E7] dark:border-[#26262A] select-none text-left">
                  {/* Android Status Bar */}
                  <div className="px-5 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono font-medium text-[#71717A] dark:text-[#A1A1AA]">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">5G</span>
                      <span className="text-[10px]">98%</span>
                    </div>
                  </div>

                  {/* App Bar */}
                  <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#26262A] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] block">Active Trip</span>
                      <h3 className="text-sm font-semibold tracking-tight">Western Ghats Road Trip</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block">Total spent</span>
                      <span className="text-xs font-semibold font-mono tabular-nums text-[#18181B] dark:text-[#F5F5F7]">
                        ₹18,450
                      </span>
                    </div>
                  </div>

                  {/* Real Balance Status Card */}
                  <div className="p-4">
                    <div className="p-3 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 border border-[#16834A]/20 dark:border-[#22C55E]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-[#16834A] dark:text-[#22C55E] font-medium block">
                          Your balance
                        </span>
                        <span className="text-sm font-bold font-mono text-[#16834A] dark:text-[#22C55E] tabular-nums">
                          +₹1,420 to receive
                        </span>
                      </div>
                      <span className="text-[11px] font-medium bg-white dark:bg-[#141416] px-2 py-1 rounded-md text-[#16834A] dark:text-[#22C55E] border border-[#16834A]/20 dark:border-[#22C55E]/20">
                        In Credit
                      </span>
                    </div>

                    {/* Expense List Feed */}
                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA]">
                        <span>Recent Trip Expenses</span>
                        <span className="font-mono tabular-nums text-[11px]">4 members</span>
                      </div>

                      {/* Row 1 */}
                      <div className="p-2.5 rounded-xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#161619] flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#202024] flex items-center justify-center text-[11px] font-semibold text-[#18181B] dark:text-[#F5F5F7] border border-[#E4E4E7] dark:border-[#2E2E32] shrink-0">
                            RS
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">Highway fuel & tolls</p>
                            <p className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] truncate">Paid by Rahul • 4 people</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold font-mono tabular-nums shrink-0 ml-2">₹3,200</span>
                      </div>

                      {/* Row 2 */}
                      <div className="p-2.5 rounded-xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#161619] flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#202024] flex items-center justify-center text-[11px] font-semibold text-[#18181B] dark:text-[#F5F5F7] border border-[#E4E4E7] dark:border-[#2E2E32] shrink-0">
                            PP
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">Homestay booking</p>
                            <p className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] truncate">Paid by Priya • 4 people</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold font-mono tabular-nums shrink-0 ml-2">₹9,400</span>
                      </div>

                      {/* Row 3 */}
                      <div className="p-2.5 rounded-xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#161619] flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#16834A]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center text-[11px] font-semibold shrink-0">
                            You
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">Dinner & trail snacks</p>
                            <p className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] truncate">Paid by You • 4 people</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold font-mono tabular-nums shrink-0 ml-2">₹5,850</span>
                      </div>
                    </div>

                    {/* Settle summary bar */}
                    <div className="mt-3.5 pt-3 border-t border-[#E4E4E7] dark:border-[#26262A] flex items-center justify-between text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-[#16834A] dark:text-[#22C55E]" />
                        <span>Debt Simplification</span>
                      </span>
                      <span className="font-medium text-[#18181B] dark:text-[#F5F5F7]">2 transfers to settle</span>
                    </div>
                  </div>

                  {/* Android bottom nav bar */}
                  <div className="h-12 border-t border-[#E4E4E7] dark:border-[#26262A] bg-[#FFFFFF] dark:bg-[#141416] px-6 flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA]">
                    <div className="flex flex-col items-center text-[#16834A] dark:text-[#22C55E]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16834A] dark:bg-[#22C55E] mb-0.5" />
                      <span className="text-[10px] font-medium">Dashboard</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px]">Trips</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px]">Friends</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px]">Profile</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom pill caption */}
              <div className="mt-3 text-center">
                <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                  Actual ONNA-GO Android UI • Native Capacitor Runtime
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION: CORE FEATURES SHOWCASE --- */}
        {/* ========================================================================= */}
        <section id="features" className="py-16 px-4 sm:px-6 border-t border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#121214]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#16834A] dark:text-[#22C55E] mb-2">
                Engineered for Group Travel
              </h2>
              <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181B] dark:text-[#F5F5F7]">
                Everything you need to travel together without financial friction.
              </p>
            </div>

            {/* Feature Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#18181B] transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-1.5">
                  Group Expense Tracking
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  Log road trip fuel, accommodation, meals, and tickets in seconds. Assign who paid and who participated.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#18181B] transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center mb-4">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-1.5">
                  Automatic Expense Splitting
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  Split equally across all members, allocate exact currency amounts, or split by custom percentage shares.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#18181B] transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center mb-4">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-1.5">
                  Clear Member Balances
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  Instant visibility into who is in credit and who owes money. Tabular figures ensure mathematical accuracy.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#18181B] transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-1.5">
                  Debt Simplification
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  Smart graph algorithms collapse circular debts into the minimum number of direct peer-to-peer transfers.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#18181B] transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-1.5">
                  Trip Expense History & Export
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  Review complete chronological records of every trip. Export complete CSV audit spreadsheets whenever needed.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-5 sm:p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-[#F7F7F8] dark:bg-[#18181B] transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center mb-4">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-1.5">
                  Web &amp; Android Sync
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  Use the Android app on the road, then check balances on your desktop browser. Your account syncs in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION: 3-STEP INSTALLATION GUIDE --- */}
        {/* ========================================================================= */}
        <section id="installation" className="py-16 px-4 sm:px-6 border-t border-[#E4E4E7] dark:border-[#2A2A2E]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#16834A] dark:text-[#22C55E] mb-2">
                Simple Setup
              </h2>
              <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181B] dark:text-[#F5F5F7]">
                How to install ONNA-GO on your Android device.
              </p>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA]">
                Installing takes under 60 seconds with 3 straightforward steps.
              </p>
            </div>

            {/* 3 Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-white dark:bg-[#141416] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#16834A] dark:text-[#22C55E] bg-[#16834A]/10 dark:bg-[#22C55E]/15 px-2.5 py-1 rounded-md">
                      STEP 01
                    </span>
                    <Download className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-2">
                    Download the APK
                  </h3>
                  <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                    Tap the <strong>Download for Android</strong> button to save <code className="font-mono text-xs bg-[#F0F0F2] dark:bg-[#242428] px-1 py-0.5 rounded">{ANDROID_APK_CONFIG.fileName}</code> ({ANDROID_APK_CONFIG.apkSizeFormatted}) to your device.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-white dark:bg-[#141416] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#16834A] dark:text-[#22C55E] bg-[#16834A]/10 dark:bg-[#22C55E]/15 px-2.5 py-1 rounded-md">
                      STEP 02
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-2">
                    Allow Unknown Source
                  </h3>
                  <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                    If Android asks to allow installs from your browser (e.g. Chrome), tap <strong>Settings</strong> and switch on <strong>Allow from this source</strong>. If Chrome shows a warning, tap <strong>Download anyway</strong>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-white dark:bg-[#141416] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#16834A] dark:text-[#22C55E] bg-[#16834A]/10 dark:bg-[#22C55E]/15 px-2.5 py-1 rounded-md">
                      STEP 03
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-2">
                    Install &amp; Sign In
                  </h3>
                  <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                    Tap the completed notification or open your Downloads folder. Tap <strong>Install</strong>, open ONNA-GO, and log in to your existing account. All your trips will sync instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Transparency Callout */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] bg-white/70 dark:bg-[#141416]/70 backdrop-blur-xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                <strong className="text-[#18181B] dark:text-[#F5F5F7] block mb-1">
                  Security Transparency &amp; Android System Warnings
                </strong>
                When installing any APK file downloaded outside the Google Play Store, Android displays a standard security notice (such as <em>&quot;File might be harmful&quot;</em> or <em>&quot;Install unknown apps&quot;</em>). ONNA-GO is a secure, standalone open-package build compiled directly from our source repository. Always verify that you are downloading from the official ONNA-GO website (<strong>onna-go.onrender.com</strong>).
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* --- SECTION: TECHNICAL SPECIFICATIONS --- */}
        {/* ========================================================================= */}
        <section id="specs" className="py-16 px-4 sm:px-6 border-t border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#121214]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#16834A] dark:text-[#22C55E] mb-2">
                Verified Build Details
              </h2>
              <p className="text-2xl font-semibold tracking-tight text-[#18181B] dark:text-[#F5F5F7]">
                Technical Specifications
              </p>
            </div>

            {/* Specs Table */}
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] overflow-hidden bg-[#F7F7F8] dark:bg-[#141416]">
              <div className="divide-y divide-[#E4E4E7] dark:divide-[#26262A]">
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Application Name</span>
                  <span className="font-medium text-[#18181B] dark:text-[#F5F5F7]">{ANDROID_APK_CONFIG.appName}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Package ID</span>
                  <span className="font-mono text-xs text-[#18181B] dark:text-[#F5F5F7]">{ANDROID_APK_CONFIG.packageId}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Version</span>
                  <span className="font-mono text-xs tabular-nums text-[#18181B] dark:text-[#F5F5F7]">
                    v{ANDROID_APK_CONFIG.version} (Build {ANDROID_APK_CONFIG.versionCode})
                  </span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Package File Size</span>
                  <span className="font-mono text-xs tabular-nums text-[#18181B] dark:text-[#F5F5F7]">
                    {ANDROID_APK_CONFIG.apkSizeFormatted} ({ANDROID_APK_CONFIG.apkSizeBytes.toLocaleString()} bytes)
                  </span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Minimum Android Version</span>
                  <span className="text-xs sm:text-sm text-[#18181B] dark:text-[#F5F5F7]">{ANDROID_APK_CONFIG.minAndroidVersion}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Target Android SDK</span>
                  <span className="text-xs sm:text-sm text-[#18181B] dark:text-[#F5F5F7]">{ANDROID_APK_CONFIG.targetAndroidVersion}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Supported Architecture</span>
                  <span className="text-xs sm:text-sm text-[#18181B] dark:text-[#F5F5F7]">{ANDROID_APK_CONFIG.architecture}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Technology Stack</span>
                  <span className="text-xs sm:text-sm text-[#18181B] dark:text-[#F5F5F7]">{ANDROID_APK_CONFIG.framework}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#71717A] dark:text-[#A1A1AA]">Direct Download URL</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-[320px] text-[#71717A] dark:text-[#A1A1AA]">
                      {ANDROID_APK_CONFIG.downloadUrl}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      title="Copy URL"
                      className="p-1 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#2A2A2E] text-[#71717A] dark:text-[#A1A1AA] cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Download Card */}
            <div className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-[#16834A]/5 to-[#16834A]/15 dark:from-[#22C55E]/10 dark:to-[#22C55E]/5 border border-[#16834A]/20 dark:border-[#22C55E]/20 text-center">
              <h3 className="text-lg font-semibold text-[#18181B] dark:text-[#F5F5F7] mb-2">
                Ready to take ONNA-GO on your next road trip?
              </h3>
              <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-md mx-auto mb-5">
                Download the lightweight APK directly to your phone and start managing your group expenses seamlessly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleDownloadClick}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#0B0B0C] font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK ({ANDROID_APK_CONFIG.apkSizeFormatted})</span>
                </button>
                <button
                  onClick={() => navigate(webAppDestination)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#E4E4E7] dark:border-[#2A2A2E] bg-white dark:bg-[#141416] hover:bg-[#F0F0F2] dark:hover:bg-[#1E1E22] text-[#18181B] dark:text-[#F5F5F7] font-medium text-sm transition-all cursor-pointer"
                >
                  Open Web Dashboard
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* --- DOWNLOAD CONFIRMATION MODAL --- */}
      {/* ========================================================================= */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#141416] text-[#18181B] dark:text-[#F5F5F7] rounded-2xl border border-[#E4E4E7] dark:border-[#26262A] shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7] dark:border-[#26262A]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#16834A]/10 dark:bg-[#22C55E]/15 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Download Initiated</h3>
                  <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                    {ANDROID_APK_CONFIG.fileName} • {ANDROID_APK_CONFIG.apkSizeFormatted}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#18181B] dark:hover:text-[#F5F5F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-[#71717A] dark:text-[#A1A1AA]">
                Your browser should start downloading the APK automatically. Here is what to do next:
              </p>

              <div className="space-y-2.5 p-3.5 rounded-xl bg-[#F7F7F8] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#26262A]">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0B0B0C] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <span className="text-xs">
                    Look for <strong>{ANDROID_APK_CONFIG.fileName}</strong> in your phone notifications or Downloads folder.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0B0B0C] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <span className="text-xs">
                    If Android prompts <em>&quot;File might be harmful&quot;</em>, tap <strong>Download anyway</strong>. If asked for <em>&quot;Install unknown apps&quot;</em> permission, enable it.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0B0B0C] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <span className="text-xs">
                    Tap the file to install ONNA-GO, launch it, and log in to your account.
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Link Copy Button */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E4E4E7] dark:border-[#26262A] bg-white dark:bg-[#161619] text-xs">
              <span className="font-mono text-[11px] truncate max-w-[240px] text-[#71717A] dark:text-[#A1A1AA]">
                {fullDownloadUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded bg-[#E4E4E7] dark:bg-[#26262A] hover:bg-[#D4D4D8] dark:hover:bg-[#323238] font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-[#16834A] dark:text-[#22C55E]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <a
                href={ANDROID_APK_CONFIG.downloadUrl}
                download={ANDROID_APK_CONFIG.fileName}
                className="px-3.5 py-2 rounded-xl border border-[#E4E4E7] dark:border-[#26262A] text-xs font-medium hover:bg-[#F0F0F2] dark:hover:bg-[#242428] transition-colors"
              >
                Retry Download
              </a>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0B0B0C] text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- FOOTER --- */}
      {/* ========================================================================= */}
      <footer className="border-t border-[#E4E4E7] dark:border-[#2A2A2E] py-6 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A] dark:text-[#A1A1AA]">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" showTagline={false} />
          <span>© 2026 ONNA-GO</span>
          <span>•</span>
          <span className="text-[#16834A] dark:text-[#22C55E] font-medium">Ride Together. Vibe Together. Split Together.</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => navigate(webAppDestination)}
            className="hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Web App
          </button>
          <button
            onClick={() => navigate('/login')}
            className="hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </footer>
    </div>
  );
};
