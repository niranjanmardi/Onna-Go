import React, { useEffect, useRef, useState } from 'react';
import { BlueTick } from '@/components/common/BlueTick';
import { formatPaise } from '@/lib/currency';
import { playSound } from '@/lib/sounds';
import { X, Check, Users, Tag, CreditCard } from 'lucide-react';

export interface ExpenseCelebrationDetails {
  id?: string;
  description: string;
  amountPaise: number;
  currency?: string;
  category?: string;
  payerName?: string;
  participantCount?: number;
  isOffline?: boolean;
}

export interface ExpenseCelebrationModalProps {
  isOpen: boolean;
  expense: ExpenseCelebrationDetails | null;
  onClose: () => void;
  autoDismissMs?: number; // Defaults to 3000ms, set to 0 for manual close only
}

export const ExpenseCelebrationModal: React.FC<ExpenseCelebrationModalProps> = ({
  isOpen,
  expense,
  onClose,
  autoDismissMs = 3000,
}) => {
  const [progress, setProgress] = useState(100);
  const soundPlayedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Audio effect triggered once per distinct expense operation
  useEffect(() => {
    if (!isOpen || !expense) return;

    const opKey = expense.id || `${expense.description}_${expense.amountPaise}`;
    if (soundPlayedRef.current !== opKey) {
      soundPlayedRef.current = opKey;
      playSound('expense_success');
    }
  }, [isOpen, expense]);

  // Auto-dismiss countdown timer
  useEffect(() => {
    if (!isOpen || !expense || autoDismissMs <= 0) return;

    setProgress(100);
    const startTime = Date.now();
    const intervalMs = 25;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / autoDismissMs) * 100);
      setProgress(remainingPct);

      if (remainingPct <= 0) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      onClose();
    }, autoDismissMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, expense, autoDismissMs, onClose]);

  if (!isOpen || !expense) return null;

  const formattedAmount = formatPaise(expense.amountPaise, expense.currency || 'INR');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      aria-describedby="celebration-amount"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Centered Liquid Glass Modal Card */}
      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-8 border border-white/30 dark:border-white/15 bg-white/20 dark:bg-black/45 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Specular Inner Highlight Overlay */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.45)',
          }}
          aria-hidden="true"
        />

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close celebration"
          className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient Glow & Animated Blue Verification Tick */}
        <div className="relative flex items-center justify-center mt-2 mb-5">
          <div
            className="absolute -inset-4 rounded-full bg-blue-500/25 dark:bg-blue-400/30 blur-2xl animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
          <BlueTick size="2xl" color="blue" animate={true} />
        </div>

        {/* Success Status Headline */}
        <h2
          id="celebration-title"
          className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm"
        >
          {expense.isOffline ? 'Expense Saved Offline' : 'Expense Recorded!'}
        </h2>
        <p className="text-xs sm:text-sm text-white/80 font-medium mt-1">
          {expense.isOffline
            ? 'Queued securely. Will sync automatically when connected.'
            : 'Payment recorded and split shares updated.'}
        </p>

        {/* Confirmed Amount Display */}
        <div className="my-5 py-3.5 px-6 rounded-2xl w-full bg-white/15 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-inner flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            Total Amount
          </span>
          <span
            id="celebration-amount"
            className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-white mt-0.5 drop-shadow-sm"
          >
            {formattedAmount}
          </span>
          <p className="text-sm font-semibold text-white/90 mt-1 max-w-[260px] truncate">
            {expense.description}
          </p>
        </div>

        {/* Metadata Details Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-white/80 font-medium">
          {expense.category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15">
              <Tag className="w-3 h-3 text-blue-300" />
              {expense.category}
            </span>
          )}
          {expense.payerName && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15">
              <CreditCard className="w-3 h-3 text-emerald-300" />
              Paid by {expense.payerName}
            </span>
          )}
          {typeof expense.participantCount === 'number' && expense.participantCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15">
              <Users className="w-3 h-3 text-amber-300" />
              {expense.participantCount} member{expense.participantCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-sm tracking-wide text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] border border-blue-400/40 shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>Done</span>
        </button>

        {/* Auto-Dismiss Progress Indicator Bar */}
        {autoDismissMs > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 transition-all ease-linear"
              style={{
                width: `${progress}%`,
                transitionDuration: '25ms',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
