import React, { useState, useEffect } from 'react';
import { X, Compass, MapPin, Calendar, Coins, ArrowRight, AlertCircle, Users, Check, Loader2 } from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { Trip, Friend } from '@/types';
import { rupeesToPaise } from '@/lib/currency';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-xl max-w-lg w-full p-5 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Start a New Trip
              </h3>
              <p className="text-xs text-[#737373]">Create journey and invite friends with ONNA-GO</p>
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
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Trip Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Western Ghats Monsoon Ride, Goa 2026"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
            />
          </div>

          {/* Destination Search & OSM Confirmation */}
          <LocationSearchInput
            value={locationData}
            onChange={setLocationData}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Estimated Budget (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={budgetRupees}
                onChange={(e) => setBudgetRupees(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] transition-colors"
              />
            </div>
          </div>

          {/* Friends Selection Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Invite Friends (Optional)
              </label>
              <span className="text-[11px] text-[#A3A3A3]">
                {selectedFriendIds.length} selected
              </span>
            </div>

            {loadingFriends ? (
              <div className="p-3 text-center text-xs text-[#737373]">
                <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />
                Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-[#737373] bg-[#FAFAF8] p-3 rounded-xl border border-[#E8E8E5]">
                No friends added yet. You can invite friends later from the trip page or share the invite code.
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-[#E8E8E5] rounded-xl p-2 bg-[#FAFAF8]">
                {friends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.id);
                  const avatarSrc = getAvatarUrl(friend.avatar_url);

                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#DDF5E5] text-[#16834A]'
                          : 'bg-white hover:bg-[#F4F4F2] text-[#171717]'
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
                          <div className="w-6 h-6 rounded-md bg-[#171717] text-white flex items-center justify-center font-bold text-[10px]">
                            {friend.display_name[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium truncate">
                          {friend.display_name}
                        </span>
                        <span className="text-[11px] text-[#737373] truncate">
                          @{friend.username}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#16834A] border-[#16834A] text-white'
                            : 'border-[#E8E8E5] bg-white'
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Estimated Total Budget ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={budgetRupees}
              onChange={(e) => setBudgetRupees(e.target.value)}
              placeholder="e.g. 50000 (optional)"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm font-mono tabular-nums focus:outline-none focus:border-[#16834A] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Description or Route Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Trip guidelines, checkpoints, stay arrangements..."
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] transition-colors resize-none"
            />
          </div>

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
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Creating...' : 'Create Trip'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
