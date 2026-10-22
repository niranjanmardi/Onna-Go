import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Trip } from '@/types';

interface JoinTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripJoined: (trip: Trip) => void;
}

export const JoinTripModal: React.FC<JoinTripModalProps> = ({
  isOpen,
  onClose,
  onTripJoined,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trip = await api.post<Trip>('/trips/join', {
        invite_code: inviteCode.trim().toUpperCase(),
      });
      onTripJoined(trip);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Join Ride / Trip
              </h3>
              <p className="text-xs text-slate-500">Enter the invitation code shared by your friend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              8-Character Invitation Code
            </label>
            <input
              type="text"
              required
              maxLength={12}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. 9B4F1A2C"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-center tracking-widest font-mono font-bold text-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white uppercase"
            />
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-amber-800 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>Once you join, you will be able to view group expenses, add bills, and settle balances in real-time.</span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm py-2.5 px-6 rounded-xl shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Joining...' : 'Join Group'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
