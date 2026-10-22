import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => Promise<void>;
  onError: (errorMsg: string) => void;
  disabled?: boolean;
  text?: 'signin' | 'signup' | 'continue';
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (momentCallback?: (moment: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  text = 'continue',
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isConfigured = Boolean(
    clientId &&
    clientId !== 'your-google-client-id.apps.googleusercontent.com' &&
    !clientId.includes('your-google-client-id')
  );

  useEffect(() => {
    if (!isConfigured) return;

    const initGSI = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (response.credential) {
              setLoading(true);
              try {
                await onSuccess(response.credential);
              } catch (err: any) {
                onError(err.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            } else {
              onError('No credentials received from Google.');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGSI();
          clearInterval(timer);
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [clientId, isConfigured, onSuccess, onError]);

  const handleClick = () => {
    if (disabled || loading) return;

    if (!isConfigured) {
      setShowConfigModal(true);
      return;
    }

    if (window.google?.accounts?.id) {
      setLoading(true);
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setLoading(false);
        }
      });
    } else {
      onError('Google Identity Services script is still loading. Please retry in a few seconds.');
    }
  };

  const buttonLabels = {
    continue: 'Continue with Google',
    signin: 'Sign in with Google',
    signup: 'Sign up with Google',
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label="Continue with Google"
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#FAFAF8] text-[#171717] font-medium text-sm py-2.5 px-4 rounded-xl border border-[#E8E8E5] shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>{buttonLabels[text]}</span>
      </button>

      {/* Helpful Provider Configuration Modal if env vars are missing */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 max-w-md w-full shadow-xl space-y-4 relative">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#171717] p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#171717]">
                Google Sign-In Configuration
              </h3>
              <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                Official Google OAuth is architected and ready on both frontend and backend. To complete activation for your domain:
              </p>
            </div>

            <div className="space-y-2 text-xs bg-[#FAFAF8] p-3.5 rounded-xl border border-[#E8E8E5] text-[#171717] font-mono leading-relaxed">
              <p className="font-semibold text-[#16834A]">1. Obtain OAuth Client ID from Google Cloud Console:</p>
              <p className="text-[11px] text-[#737373]">APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client ID (Web Application)</p>
              <p className="font-semibold text-[#16834A] pt-1">2. Add to frontend/.env:</p>
              <p className="text-[11px] select-all bg-white p-1 rounded border border-[#E8E8E5]">VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</p>
              <p className="font-semibold text-[#16834A] pt-1">3. Add to backend/.env:</p>
              <p className="text-[11px] select-all bg-white p-1 rounded border border-[#E8E8E5]">GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
