import React, { useState, useEffect } from 'react';
import { Search, Users, Compass, UserCheck, MessageSquare, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlassModal, GlassButton } from '@/components/glass';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Friend, Trip } from '@/types';

export interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (friend: Friend) => void;
  onSelectTrip: (trip: Trip) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectFriend,
  onSelectTrip,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'trips'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.get<Friend[]>('/friends').catch(() => []),
      api.get<Trip[]>('/trips/?include_archived=false').catch(() => []),
    ])
      .then(([friendsData, tripsData]) => {
        if (!isMounted) return;
        setFriends(friendsData || []);
        setTrips(tripsData || []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredFriends = friends.filter(
    (f) =>
      f.display_name.toLowerCase().includes(cleanQuery) ||
      (f.username && f.username.toLowerCase().includes(cleanQuery))
  );

  const filteredTrips = trips.filter(
    (t) =>
      t.name.toLowerCase().includes(cleanQuery) ||
      (t.destination && t.destination.toLowerCase().includes(cleanQuery))
  );

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Message"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends or trip groups..."
            className="glass-input w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none placeholder:text-white/50"
            autoFocus
          />
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 glass-card rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'friends'
                ? 'bg-white/25 text-white shadow-xs border border-white/30'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Friends ({friends.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'trips'
                ? 'bg-white/25 text-white shadow-xs border border-white/30'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Trips ({trips.length})</span>
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-72 overflow-y-auto divide-y divide-white/10 -mx-1 px-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-white/70">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-400" />
              <p className="text-xs font-medium">Loading your circle...</p>
            </div>
          ) : activeTab === 'friends' ? (
            filteredFriends.length === 0 ? (
              <div className="py-8 text-center text-white/70">
                <p className="text-xs">No matching friends found.</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    onSelectFriend(friend);
                    onClose();
                  }}
                  className="w-full text-left py-3 px-3 flex items-center gap-3 hover:bg-white/15 rounded-xl transition-all cursor-pointer"
                >
                  <UserAvatar
                    name={friend.display_name}
                    avatarUrl={friend.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate drop-shadow-xs">
                      {friend.display_name}
                    </p>
                    <p className="text-xs text-[var(--theme-accent,#22C55E)] truncate">
                      @{friend.username || 'user'}
                    </p>
                  </div>
                  <MessageSquare className="w-4 h-4 text-white/50 shrink-0" />
                </button>
              ))
            )
          ) : filteredTrips.length === 0 ? (
            <div className="py-8 text-center text-white/70">
              <p className="text-xs">No matching trips found.</p>
            </div>
          ) : (
            filteredTrips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => {
                  onSelectTrip(trip);
                  onClose();
                }}
                className="w-full text-left py-3 px-3 flex items-center gap-3 hover:bg-white/15 rounded-xl transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shadow-xs shrink-0">
                  <Compass className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate drop-shadow-xs">
                    {trip.name}
                  </p>
                  <p className="text-xs text-white/70 truncate flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span>{trip.members_count || 1} members</span>
                  </p>
                </div>
                <MessageSquare className="w-4 h-4 text-white/50 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </GlassModal>
  );
};

