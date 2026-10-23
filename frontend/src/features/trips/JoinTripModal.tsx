import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Trip } from '@/types';

import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { recordMeaningfulInteraction } from '@/components/pwa/InstallPrompt';

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
  const { showConfirmation } = useFeedback();
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
      showConfirmation({
        title: 'Joined Trip Successfully!',
        message: `You are now a member of ${trip.name}.`,
        sound: 'trip_success',
      });
      recordMeaningfulInteraction('join_trip');
      onTripJoined(trip);
      onClose();
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Invalid or expired invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-xl max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Join Ride / Trip
              </h3>
              <p className="text-xs text-[#737373]">Enter the code shared by your friend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Invite Code (6-8 characters)
            </label>
            <input
              type="text"
              required
              maxLength={12}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. LADAKH9"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest uppercase font-bold text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
            />
          </div>

          <p className="text-xs text-[#737373] text-center">
            You will be added as a member and can view all expenses, balances, and itinerary activities.
          </p>

          <div className="pt-3 border-t border-[#E8E8E5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#F4F4F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Joining...' : 'Join Trip'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
