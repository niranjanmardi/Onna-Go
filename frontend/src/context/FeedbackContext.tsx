import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { BlueTick } from '@/components/common/BlueTick';
import { playSound, areSoundsEnabled, setSoundsEnabled, SoundType } from '@/lib/sounds';
import { api } from '@/lib/api-client';
import { NotificationItem } from '@/types';
import { X } from 'lucide-react';

export interface ConfirmationOptions {
  title: string;
  message?: string;
  sound?: SoundType;
}

interface FeedbackContextValue {
  showConfirmation: (options: ConfirmationOptions | string, sound?: SoundType) => void;
  playClick: () => void;
  soundsEnabled: boolean;
  setSoundsEnabled: (enabled: boolean) => void;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmation, setConfirmation] = useState<{ id: string; title: string; message?: string } | null>(null);
  const [soundsEnabled, setSoundsState] = useState<boolean>(areSoundsEnabled());
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const isFirstPoll = useRef<boolean>(true);

  // Sync sound preference changes across components
  useEffect(() => {
    const handlePrefChange = () => {
      setSoundsState(areSoundsEnabled());
    };
    window.addEventListener('onnago_sound_preference_changed', handlePrefChange);
    return () => {
      window.removeEventListener('onnago_sound_preference_changed', handlePrefChange);
    };
  }, []);

  const handleSetSoundsEnabled = useCallback((enabled: boolean) => {
    setSoundsEnabled(enabled);
    setSoundsState(enabled);
  }, []);

  const playClick = useCallback(() => {
    playSound('click');
  }, []);

  const showConfirmation = useCallback(
    (options: ConfirmationOptions | string, soundOverride?: SoundType) => {
      const opts: ConfirmationOptions =
        typeof options === 'string'
          ? { title: options, sound: soundOverride || 'trip_success' }
          : options;

      // Play sound if requested
      if (opts.sound) {
        playSound(opts.sound);
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      const id = `${Date.now()}_${Math.random()}`;
      setConfirmation({ id, title: opts.title, message: opts.message });

      timerRef.current = window.setTimeout(() => {
        setConfirmation((prev) => (prev?.id === id ? null : prev));
      }, 3400);
    },
    []
  );

  // Notification Polling (every 30 seconds for logged-in sessions)
  const refreshUnreadCount = useCallback(async () => {
    try {
      const notifs = await api.get<NotificationItem[]>('/notifications/');
      if (!Array.isArray(notifs)) return;

      const unread = notifs.filter((n) => !n.is_read);
      setUnreadCount(unread.length);

      // Check for genuinely new incoming notifications
      if (isFirstPoll.current) {
        notifs.forEach((n) => knownNotificationIds.current.add(n.id));
        isFirstPoll.current = false;
      } else {
        const newUnread = unread.filter((n) => !knownNotificationIds.current.has(n.id));
        if (newUnread.length > 0) {
          // Play subtle notification tone
          playSound('notification');
          newUnread.forEach((n) => knownNotificationIds.current.add(n.id));
        }
      }
    } catch {
      // Ignore background notification fetch errors
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 30000);
    return () => window.clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <FeedbackContext.Provider
      value={{
        showConfirmation,
        playClick,
        soundsEnabled,
        setSoundsEnabled: handleSetSoundsEnabled,
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}

      {/* Premium Blue Tick Floating Confirmation Toast */}
      {confirmation && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-sm sm:max-w-md w-[calc(100%-2rem)] px-4 py-3 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E8E8E5] shadow-[0_12px_36px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 animate-fadeIn transition-all select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <BlueTick size="md" animate={true} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#171717] tracking-tight truncate">
                {confirmation.title}
              </p>
              {confirmation.message && (
                <p className="text-xs text-[#737373] mt-0.5 line-clamp-1">
                  {confirmation.message}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="p-1 text-[#A3A3A3] hover:text-[#171717] rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Dismiss confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextValue => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
