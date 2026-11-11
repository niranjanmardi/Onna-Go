import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Calendar, Coins, ArrowRight, AlertCircle, Users, Check, Loader2 } from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { Trip, Friend } from '@/types';
import { rupeesToPaise } from '@/lib/currency';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { GlassModal, GlassButton } from '@/components/glass';

import { LocationSearchInput, LocationData } from '@/components/location/LocationSearchInput';
import { recordMeaningfulInteraction } from '@/components/pwa/InstallPrompt';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: Trip) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationData, setLocationData] = useState<LocationData>({ destination: '' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [budgetRupees, setBudgetRupees] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showConfirmation } = useFeedback();

  // Friends selection state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingFriends(true);
      api.get<Friend[]>('/friends')
        .then((data) => setFriends(data))
        .catch(() => setFriends([]))
        .finally(() => setLoadingFriends(false));
    } else {
      setSelectedFriendIds([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const budgetPaise = budgetRupees ? rupeesToPaise(budgetRupees) : null;
      const trip = await api.post<Trip>('/trips/', {
        name: name.trim(),
        description: description ? description.trim() : null,
        destination: locationData.destination ? locationData.destination.trim() : null,
        destination_address: locationData.destination_address || null,
        destination_lat: locationData.destination_lat || null,
        destination_lng: locationData.destination_lng || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        currency,
        budget_paise: budgetPaise,
      });

      // Send invitations to selected friends
      if (selectedFriendIds.length > 0) {
        try {
          await api.post(`/trips/${trip.id}/invite`, {
            friend_ids: selectedFriendIds,
          });
        } catch {
          // Trip was created, non-blocking invitation error
        }
      }

      showConfirmation({
        title: 'Trip created successfully!',
        message: `${trip.name} has been created.`,
        sound: 'trip_success',
      });
      recordMeaningfulInteraction('create_trip');
      onTripCreated(trip);
      onClose();
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to create trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Start a New Trip"
      subtitle="Create journey and invite friends with ONNA-GO"
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
            Trip Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Western Ghats Monsoon Ride, Goa 2026"
            className="glass-input w-full text-sm"
          />
        </div>

        {/* Destination Search & OSM Confirmation */}
        <LocationSearchInput
          value={locationData}
          onChange={setLocationData}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="glass-input w-full text-sm [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="INR">INR (₹) — Indian Rupee</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Estimated Budget (Optional)
            </label>
            <input
              type="number"
              min="0"
              value={budgetRupees}
              onChange={(e) => setBudgetRupees(e.target.value)}
              placeholder="e.g. 25000"
              className="glass-input w-full text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass-input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="glass-input w-full text-sm"
            />
          </div>
        </div>

        {/* Friends Selection Section */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Invite Friends (Optional)
            </label>
            <span className="text-[11px] text-zinc-400 font-medium">
              {selectedFriendIds.length} selected
            </span>
          </div>

          {loadingFriends ? (
            <div className="p-3 text-center text-xs text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />
              Loading friends...
            </div>
          ) : friends.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/10">
              No friends added yet. You can invite friends later from the trip page or share the invite code.
            </p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-black/5 dark:border-white/10 rounded-xl p-2 bg-black/5 dark:bg-white/5">
              {friends.map((friend) => {
                const isSelected = selectedFriendIds.includes(friend.id);
                const avatarSrc = getAvatarUrl(friend.avatar_url);

                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#16834A]/15 dark:bg-[#22C55E]/20 text-[#16834A] dark:text-[#4ADE80] font-semibold'
                        : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={friend.display_name}
                          className="w-6 h-6 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center font-bold text-[10px]">
                          {friend.display_name[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium truncate">
                        {friend.display_name}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate">
                        @{friend.username}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#16834A] dark:bg-[#22C55E] border-[#16834A] dark:border-[#22C55E] text-white dark:text-[#0B0B0C]'
                          : 'border-zinc-400 dark:border-zinc-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
            Description or Route Notes
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Trip guidelines, checkpoints, stay arrangements..."
            className="glass-input w-full text-sm resize-none"
          />
        </div>

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
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{loading ? 'Creating...' : 'Create Trip'}</span>
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
