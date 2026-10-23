import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'onnago_pwa_dismissed';
const MEANINGFUL_ACTION_KEY = 'onnago_meaningful_actions';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function recordMeaningfulInteraction(actionName?: string) {
  try {
    const current = parseInt(localStorage.getItem(MEANINGFUL_ACTION_KEY) || '0', 10);
    localStorage.setItem(MEANINGFUL_ACTION_KEY, String(current + 1));
    window.dispatchEvent(new CustomEvent('onnago:interaction', { detail: { action: actionName, count: current + 1 } }));
  } catch {}
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if running standalone already
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      return; // Already installed, do not show any prompt
    }

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    // Check if it's Safari (not Chrome or Firefox on iOS, which cannot install PWAs directly)
    const isIOSSafari = isIOSDevice && /safari/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
    setIsIOS(isIOSSafari);

    // 3. Helper to determine if prompt is allowed
    const canShowPrompt = () => {
      try {
        const dismissedTime = localStorage.getItem(DISMISS_KEY);
        if (dismissedTime) {
          const elapsed = Date.now() - parseInt(dismissedTime, 10);
          if (elapsed < DISMISS_COOLDOWN_MS) {
            return false;
          }
        }
        // Meaningful interaction check: User must have performed at least 1 meaningful action
        const actionCount = parseInt(localStorage.getItem(MEANINGFUL_ACTION_KEY) || '0', 10);
        return actionCount >= 1;
      } catch {
        return false;
      }
    };

    // 4. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (canShowPrompt()) {
        setShowPrompt(true);
      }
    };

    // 5. Listen for appinstalled
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setShowIOSGuide(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
    };

    // 6. Listen for meaningful interactions triggered anywhere in the app
    const handleInteraction = () => {
      if (!isStandalone && canShowPrompt()) {
        if (deferredPrompt || isIOSSafari) {
          setShowPrompt(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('onnago:interaction', handleInteraction);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('onnago:interaction', handleInteraction);
    };
  }, [deferredPrompt, isStandalone]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      } else {
        handleDismiss();
      }
    } catch {
      handleDismiss();
    }
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Floating Non-Intrusive Install Banner */}
      <aside
        aria-label="Install ONNA-GO application"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="bg-white dark:bg-[#141414] border border-[#E8E8E5] dark:border-[#262626] rounded-2xl p-4 shadow-xl dark:shadow-2xl flex items-start gap-3.5">
          {/* App Icon */}
          <div className="w-11 h-11 rounded-xl bg-[#171717] dark:bg-[#22C55E]/15 flex items-center justify-center shrink-0 border border-black/5 dark:border-[#22C55E]/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            </svg>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#EDEDED] truncate">
                Install ONNA-GO
              </h3>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[#8A8A85] hover:text-[#171717] dark:hover:text-[#EDEDED] p-1 -mr-1 rounded-lg transition-colors"
                aria-label="Dismiss install banner for 14 days"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A1A1A1] mt-0.5 line-clamp-2">
              Fast road-trip access, reliable offline tracking on highways, and instant split calculations.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0A0A0A] text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                {isIOS ? (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>How to Install</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Install App</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-[#737373] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-xl transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* iOS Safari Instructional Modal Sheet */}
      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-[#141414] border border-[#E8E8E5] dark:border-[#262626] rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5] dark:border-[#262626]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#16834A] dark:text-[#22C55E]" />
                <h3 id="ios-install-title" className="text-sm font-bold text-[#171717] dark:text-[#EDEDED]">
                  Add ONNA-GO to Home Screen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-[#8A8A85] hover:text-[#171717] dark:hover:text-[#EDEDED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-xs text-[#525252] dark:text-[#D4D4D4]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Tap the <strong className="text-[#171717] dark:text-[#EDEDED]">Share button</strong>{' '}
                  <Share2 className="inline w-3.5 h-3.5 text-[#007AFF] mx-0.5" /> in Safari’s navigation bar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Scroll down the share sheet and tap{' '}
                  <strong className="text-[#171717] dark:text-[#EDEDED]">Add to Home Screen</strong>{' '}
                  <PlusSquare className="inline w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E] mx-0.5" />.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Tap <strong className="text-[#171717] dark:text-[#EDEDED]">Add</strong> in the top-right corner to finish.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
              className="mt-5 w-full py-2 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0A0A0A] font-semibold text-xs rounded-xl transition-colors shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
