import React, { useState } from 'react';
import { ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Trip } from '@/types';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { recordMeaningfulInteraction } from '@/components/pwa/InstallPrompt';
import { GlassModal, GlassButton } from '@/components/glass';

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
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Ride / Trip"
      subtitle="Enter the code shared by your friend"
      size="sm"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
            Invite Code (6-8 characters)
          </label>
          <input
            type="text"
            required
            maxLength={12}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. LADAKH9"
            className="glass-input w-full px-4 py-3 text-center text-lg font-mono tracking-widest uppercase font-bold"
          />
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 text-center font-medium">
          You will be added as a member and can view all expenses, balances, and itinerary activities.
        </p>

        <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-end gap-3">
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading || !inviteCode.trim()}
            className="gap-1.5"
          >
            <span>{loading ? 'Joining...' : 'Join Trip'}</span>
            <ArrowRight className="w-4 h-4" />
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
