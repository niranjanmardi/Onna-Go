import React, { useState, useEffect } from 'react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { Friend, FriendSearchItem, FriendRequestsData } from '@/types';
import {
  Users,
  Search,
  UserPlus,
  Clock,
  Check,
  X,
  AlertCircle,
  Copy,
  CheckCheck,
  MapPin,
  Trash2,
  Compass,
  ArrowRight,
  Loader2,
  UserCheck,
  ShieldCheck,
  AtSign,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { GlassPrimary, GlassSecondary, GlassInteractive, GlassModal, GlassInput, GlassButton } from '@/components/glass';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ChatConversationModal } from '@/features/chat/ChatConversationModal';

export const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useFeedback();
  const [activeTab, setActiveTab] = useState<'friends' | 'find' | 'requests'>('friends');

  // Friends List State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [friendsFilter, setFriendsFilter] = useState('');

  // Find Friends State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendSearchItem[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Requests State
  const [requests, setRequests] = useState<FriendRequestsData>({ incoming: [], outgoing: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Action feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Unfriend modal confirmation
  const [unfriendTarget, setUnfriendTarget] = useState<Friend | null>(null);
  const [isUnfriending, setIsUnfriending] = useState(false);

  // Copied UID tracking
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Profile Modal State
  const [viewingProfile, setViewingProfile] = useState<FriendSearchItem | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Active Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

  const handleOpenProfile = async (item: {
    id: string;
    username?: string | null;
    display_name: string;
    avatar_url?: string | null;
    city?: string | null;
    bio?: string | null;
    created_at?: string | null;
    relationship_status?: any;
    request_id?: string | null;
  }) => {
    setLoadingProfile(true);
    setViewingProfile({
      id: item.id,
      username: item.username,
      display_name: item.display_name,
      avatar_url: item.avatar_url,
      city: item.city,
      bio: item.bio,
      created_at: item.created_at,
      relationship_status: item.relationship_status || 'none',
      request_id: item.request_id,
    });
    try {
      const data = await api.get<FriendSearchItem>(`/friends/profile/${item.id}`);
      setViewingProfile(data);
    } catch {
      // Keep optimistic item
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2500);
  };

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setActionError(null);
    playSound('trip_success');
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setActionSuccess(null);
    playSound('error');
    setTimeout(() => setActionError(null), 4000);
  };

  // Fetch Friends
  const fetchFriends = async () => {
    try {
      setLoadingFriends(true);
      const data = await api.get<Friend[]>('/friends');
      setFriends(data || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load friends.');
    } finally {
      setLoadingFriends(false);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await api.get<FriendRequestsData>('/friends/requests');
      setRequests(data || { incoming: [], outgoing: [] });
    } catch (err: any) {
      showError(err.message || 'Failed to load friend requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab]);

  // Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const data = await api.get<FriendSearchItem[]>(
        `/friends/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        setSearchError('No matching users found.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Send Friend Request
  const handleSendRequest = async (item: FriendSearchItem) => {
    setActionInProgressId(item.id);
    try {
      const res = await api.post<{ message: string; status: string; id?: string }>('/friends/request', {
        friend_id: item.id,
        username_or_uid: item.username || item.id,
      });

      if (res.status === 'ACCEPTED') {
        showSuccess(`You and ${item.display_name} are now friends!`);
        fetchFriends();
      } else {
        showSuccess(res.message || 'Friend request sent!');
      }

      setSearchResults((prev) =>
        prev
          ? prev.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    relationship_status: res.status === 'ACCEPTED' ? 'friends' : 'pending_outgoing',
                    request_id: res.id || p.request_id || item.id,
                  }
                : p
            )
          : null
      );
      if (viewingProfile && viewingProfile.id === item.id) {
        setViewingProfile((prev) =>
          prev
            ? {
                ...prev,
                relationship_status: res.status === 'ACCEPTED' ? 'friends' : 'pending_outgoing',
                request_id: res.id || prev.request_id || item.id,
              }
            : null
        );
      }
      fetchRequests();
    } catch (err: any) {
      showError(err.message || 'Failed to send friend request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Accept Request
  const handleAcceptRequest = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      const res = await api.post<{ message: string }>(`/friends/requests/${requestId}/accept`);
      showSuccess(res.message || 'Friend request accepted!');
      setRequests((prev) => ({
        ...prev,
        incoming: prev.incoming.filter((r) => r.id !== requestId && r.requester_id !== requestId),
      }));
      fetchFriends();
      if (searchResults) {
        setSearchResults((prev) =>
          prev
            ? prev.map((p) =>
                p.request_id === requestId || p.id === requestId
                  ? { ...p, relationship_status: 'friends' }
                  : p
              )
            : null
        );
      }
      if (viewingProfile && (viewingProfile.request_id === requestId || viewingProfile.id === requestId)) {
        setViewingProfile((prev) =>
          prev ? { ...prev, relationship_status: 'friends' } : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to accept friend request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Decline Request
  const handleDeclineRequest = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      const res = await api.post<{ message: string }>(`/friends/requests/${requestId}/decline`);
      showSuccess(res.message || 'Friend request declined.');
      setRequests((prev) => ({
        ...prev,
        incoming: prev.incoming.filter((r) => r.id !== requestId && r.requester_id !== requestId),
      }));
      if (searchResults) {
        setSearchResults((prev) =>
          prev
            ? prev.map((p) =>
                p.request_id === requestId || p.id === requestId
                  ? { ...p, relationship_status: 'none', request_id: null }
                  : p
              )
            : null
        );
      }
      if (viewingProfile && (viewingProfile.request_id === requestId || viewingProfile.id === requestId)) {
        setViewingProfile((prev) =>
          prev ? { ...prev, relationship_status: 'none', request_id: null } : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to decline friend request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Cancel Outgoing Request
  const handleCancelRequest = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      const res = await api.delete<{ message: string }>(`/friends/requests/${requestId}/cancel`);
      showSuccess(res.message || 'Friend request cancelled.');
      setRequests((prev) => ({
        ...prev,
        outgoing: prev.outgoing.filter((r) => r.id !== requestId && r.addressee_id !== requestId),
      }));
      if (searchResults) {
        setSearchResults((prev) =>
          prev
            ? prev.map((p) =>
                p.request_id === requestId || p.id === requestId
                  ? { ...p, relationship_status: 'none', request_id: null }
                  : p
              )
            : null
        );
      }
      if (viewingProfile && (viewingProfile.request_id === requestId || viewingProfile.id === requestId)) {
        setViewingProfile((prev) =>
          prev ? { ...prev, relationship_status: 'none', request_id: null } : null
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to cancel request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Unfriend
  const handleConfirmUnfriend = async () => {
    if (!unfriendTarget) return;
    setIsUnfriending(true);
    try {
      await api.delete(`/friends/${unfriendTarget.id}`);
      showSuccess(`Removed ${unfriendTarget.display_name} from friends.`);
      setFriends((prev) => prev.filter((f) => f.id !== unfriendTarget.id));
      setUnfriendTarget(null);
    } catch (err: any) {
      showError(err.message || 'Failed to remove friend.');
    } finally {
      setIsUnfriending(false);
    }
  };

  const filteredFriends = friends.filter((f) => {
    const q = friendsFilter.toLowerCase();
    return (
      f.display_name.toLowerCase().includes(q) ||
      (f.username && f.username.toLowerCase().includes(q)) ||
      (f.city && f.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Friends &amp; Connections
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-medium mt-1">
            Build your travel circle, coordinate rides &amp; chat with group members.
          </p>
        </div>

        <GlassButton
          variant="primary"
          size="sm"
          icon={<UserPlus className="w-4 h-4 stroke-[2.5]" />}
          onClick={() => setActiveTab('find')}
        >
          Find Friends
        </GlassButton>
      </div>

      {/* Inline Feedback Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn backdrop-blur-md">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/35 text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn backdrop-blur-md">
          <AlertCircle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation Tabs (Liquid Glass Pill Bar) */}
      <div className="glass-card rounded-2xl p-1.5 flex gap-1.5 shadow-md">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'friends'
              ? 'bg-white/25 text-white shadow-sm border border-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Friends</span>
          {friends.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)]">
              {friends.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('find')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'find'
              ? 'bg-white/25 text-white shadow-sm border border-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Find Friends</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-white/25 text-white shadow-sm border border-white/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Requests</span>
          {requests.incoming.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
              {requests.incoming.length}
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 1: MY FRIENDS --- */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {/* Search bar inside friends */}
          {friends.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={friendsFilter}
                onChange={(e) => setFriendsFilter(e.target.value)}
                placeholder="Filter by name, @username, or city..."
                className="glass-input w-full pl-10 pr-4 text-xs sm:text-sm"
              />
            </div>
          )}

          {loadingFriends ? (
            <div className="p-12 text-center text-white/70">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--theme-accent,#22C55E)]" />
              <p className="text-sm">Loading your friends circle...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <GlassSecondary className="p-10 text-center space-y-4 rounded-3xl">
              <div className="w-12 h-12 bg-white/20 border border-white/30 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white drop-shadow-xs">
                {friendsFilter ? 'No friends match your filter' : 'No friends added yet'}
              </h3>
              <p className="text-xs text-white/75 max-w-sm mx-auto leading-relaxed">
                Connect with travel buddies by username or UID to easily invite them to trips and split ride expenses without awkward calculations.
              </p>
              {!friendsFilter && (
                <GlassButton
                  variant="primary"
                  onClick={() => setActiveTab('find')}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Find &amp; Add Friends
                </GlassButton>
              )}
            </GlassSecondary>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => {
                const avatarSrc = getAvatarUrl(friend.avatar_url);
                return (
                  <div
                    key={friend.id}
                    className="glass-card rounded-2xl p-5 shadow-md space-y-3.5 hover:bg-white/20 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={friend.display_name}
                          avatarUrl={friend.avatar_url}
                          size="lg"
                          shape="rounded-xl"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate drop-shadow-xs">
                            {friend.display_name}
                          </p>
                          <p className="text-xs text-[var(--theme-accent,#22C55E)] font-semibold truncate">
                            @{friend.username || 'user'}
                          </p>
                          {friend.city && (
                            <p className="text-[11px] text-white/70 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-white/50" />
                              <span>{friend.city}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {friend.bio && (
                        <p className="text-xs text-white/75 line-clamp-2 leading-relaxed">
                          {friend.bio}
                        </p>
                      )}

                      {/* UID with copy button */}
                      <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
                        <span className="font-mono text-white/60">
                          UID: {friend.id.slice(0, 8)}...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUid(friend.id)}
                          className="hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                        >
                          {copiedUid === friend.id ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-emerald-300" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-white/60" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions: Chat & Profile */}
                    <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/messages?friendId=${friend.id}`)}
                        className="flex-1 py-1 px-2.5 text-xs"
                      >
                        Chat
                      </GlassButton>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenProfile({
                            ...friend,
                            relationship_status: 'friends',
                          })
                        }
                        className="py-1.5 px-3 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl border border-white/25 transition-all cursor-pointer"
                      >
                        Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnfriendTarget(friend)}
                        title="Remove Friend"
                        aria-label="Remove friend"
                        className="p-2 text-white/50 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: FIND FRIENDS --- */}
      {activeTab === 'find' && (
        <div className="space-y-6">
          <GlassPrimary
            title="Search for Travelers"
            subtitle="Find friends by unique @username, display name, or registered email."
          >
            <form onSubmit={handleSearch} className="flex gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. rider_alex, Alex Turner, or alex@example.com"
                  className="glass-input w-full pl-10 pr-4 text-xs sm:text-sm"
                />
              </div>
              <GlassButton
                type="submit"
                variant="primary"
                disabled={isSearching}
                loading={isSearching}
                icon={<Search className="w-4 h-4" />}
              >
                Search
              </GlassButton>
            </form>
          </GlassPrimary>

          {/* Search Feedback / Results */}
          {searchError && (
            <div className="p-4 rounded-2xl glass-card text-center text-xs text-white/70">
              {searchError}
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/80 px-1">
                Search Results ({searchResults.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map((item) => {
                  const avatarSrc = getAvatarUrl(item.avatar_url);
                  const isBusy = Boolean(
                    actionInProgressId === item.id ||
                      (item.request_id && actionInProgressId === item.request_id)
                  );

                  return (
                    <div
                      key={item.id}
                      className="glass-card rounded-2xl p-5 shadow-md flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <UserAvatar
                          name={item.display_name}
                          avatarUrl={item.avatar_url}
                          size="lg"
                          shape="rounded-xl"
                          className="shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate drop-shadow-xs">
                            {item.display_name}
                          </p>
                          <p className="text-xs text-[var(--theme-accent,#22C55E)] font-semibold truncate">
                            @{item.username || 'user'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(item)}
                            className="text-[11px] text-white/80 hover:text-white underline font-semibold mt-0.5 block text-left cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>

                      {/* State-specific button */}
                      <div className="flex-shrink-0">
                        {item.relationship_status === 'self' && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 text-white/80 border border-white/25">
                            You
                          </span>
                        )}

                        {item.relationship_status === 'friends' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/25 text-emerald-200 border border-emerald-500/40">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </span>
                        )}

                        {item.relationship_status === 'pending_outgoing' && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(item.request_id || item.id)}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/20 border border-rose-500/40 transition-all cursor-pointer"
                          >
                            {isBusy ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}

                        {item.relationship_status === 'pending_incoming' && (
                          <div className="flex items-center gap-1.5">
                            <GlassButton
                              size="sm"
                              variant="primary"
                              onClick={() => handleAcceptRequest(item.request_id || item.id)}
                              disabled={isBusy}
                              loading={isBusy}
                            >
                              Accept
                            </GlassButton>
                            <button
                              type="button"
                              onClick={() => handleDeclineRequest(item.request_id || item.id)}
                              disabled={isBusy}
                              className="p-2 text-white/60 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {item.relationship_status === 'none' && (
                          <GlassButton
                            size="sm"
                            variant="primary"
                            onClick={() => handleSendRequest(item)}
                            disabled={isBusy}
                            loading={isBusy}
                            icon={<UserPlus className="w-3.5 h-3.5" />}
                          >
                            Add
                          </GlassButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: REQUESTS --- */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <GlassPrimary
            title="Incoming Requests"
            subtitle="Riders and friends asking to connect with you"
            action={
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {requests.incoming.length}
              </span>
            }
          >
            {loadingRequests ? (
              <div className="p-6 text-center text-white/70">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--theme-accent,#22C55E)]" />
              </div>
            ) : requests.incoming.length === 0 ? (
              <p className="text-xs text-white/70 text-center py-6">
                No incoming friend requests at this time.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {requests.incoming.map((req) => {
                  const avatarSrc = getAvatarUrl(req.requester_avatar);
                  const isBusy = actionInProgressId === req.id;

                  return (
                    <div key={req.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={req.requester_name}
                          avatarUrl={req.requester_avatar}
                          size="md"
                          shape="rounded-xl"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-xs">
                            {req.requester_name}
                          </p>
                          <p className="text-xs text-[var(--theme-accent,#22C55E)] truncate">
                            @{req.requester_username || 'user'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <GlassButton
                          size="sm"
                          variant="primary"
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={isBusy}
                          loading={isBusy}
                        >
                          Accept
                        </GlassButton>
                        <button
                          type="button"
                          onClick={() => handleDeclineRequest(req.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white/80 text-xs font-medium rounded-xl border border-white/25 transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassPrimary>

          {/* Outgoing Requests */}
          <GlassSecondary className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div>
                <h2 className="text-base font-bold text-white drop-shadow-xs">Outgoing Requests</h2>
                <p className="text-xs text-white/70 mt-0.5">
                  Pending invitations you have sent
                </p>
              </div>
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/25">
                {requests.outgoing.length}
              </span>
            </div>

            {requests.outgoing.length === 0 ? (
              <p className="text-xs text-white/70 text-center py-4">
                No pending outgoing requests.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {requests.outgoing.map((req) => {
                  const avatarSrc = getAvatarUrl(req.addressee_avatar);
                  const isBusy = actionInProgressId === req.id;

                  return (
                    <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          name={req.addressee_name}
                          avatarUrl={req.addressee_avatar}
                          size="sm"
                          shape="rounded-xl"
                        />
                        <p className="text-sm font-semibold text-white truncate drop-shadow-xs">
                          {req.addressee_name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 border border-rose-500/40 rounded-xl font-medium transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassSecondary>
        </div>
      )}

      {/* --- Profile Preview Modal (GlassModal) --- */}
      <GlassModal
        isOpen={Boolean(viewingProfile)}
        onClose={() => setViewingProfile(null)}
        title="Traveler Profile"
        maxWidth="sm"
      >
        {viewingProfile && (
          <div className="text-center space-y-4 pt-1">
            <UserAvatar
              name={viewingProfile.display_name}
              avatarUrl={viewingProfile.avatar_url}
              size="xl"
              shape="rounded-2xl"
              className="mx-auto shadow-md"
            />

            <div>
              <h3 className="text-lg font-bold text-white drop-shadow-xs">
                {viewingProfile.display_name}
              </h3>
              <p className="text-xs text-[var(--theme-accent,#22C55E)] font-semibold">
                @{viewingProfile.username || 'user'}
              </p>
              {viewingProfile.city && (
                <p className="text-[11px] text-white/70 flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-white/50" />
                  <span>{viewingProfile.city}</span>
                </p>
              )}
            </div>

            {viewingProfile.bio && (
              <p className="text-xs text-white/80 glass-secondary p-3 rounded-xl border border-white/20 text-left">
                {viewingProfile.bio}
              </p>
            )}

            {/* Contextual Actions */}
            <div className="pt-2">
              {viewingProfile.relationship_status === 'none' && (
                <GlassButton
                  fullWidth
                  variant="primary"
                  onClick={() => {
                    handleSendRequest(viewingProfile);
                    setViewingProfile(null);
                  }}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Send Friend Request
                </GlassButton>
              )}

              {viewingProfile.relationship_status === 'pending_outgoing' && (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelRequest(viewingProfile.request_id || viewingProfile.id);
                    setViewingProfile(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/20 border border-rose-500/40 transition-all cursor-pointer"
                >
                  Cancel Friend Request
                </button>
              )}

              {viewingProfile.relationship_status === 'pending_incoming' && (
                <div className="flex gap-2">
                  <GlassButton
                    fullWidth
                    variant="primary"
                    onClick={() => {
                      handleAcceptRequest(viewingProfile.request_id || viewingProfile.id);
                      setViewingProfile(null);
                    }}
                  >
                    Accept Request
                  </GlassButton>
                  <GlassButton
                    fullWidth
                    variant="secondary"
                    onClick={() => {
                      handleDeclineRequest(viewingProfile.request_id || viewingProfile.id);
                      setViewingProfile(null);
                    }}
                  >
                    Decline
                  </GlassButton>
                </div>
              )}

              {viewingProfile.relationship_status === 'friends' && (
                <GlassButton
                  fullWidth
                  variant="secondary"
                  icon={<MessageSquare className="w-4 h-4" />}
                  onClick={() => {
                    const targetId = viewingProfile.id;
                    setViewingProfile(null);
                    navigate(`/messages?friendId=${targetId}`);
                  }}
                >
                  Start Chat
                </GlassButton>
              )}
            </div>
          </div>
        )}
      </GlassModal>

      {/* --- Unfriend Confirmation Modal (GlassModal) --- */}
      <GlassModal
        isOpen={Boolean(unfriendTarget)}
        onClose={() => setUnfriendTarget(null)}
        title="Remove Friend"
        maxWidth="sm"
      >
        {unfriendTarget && (
          <div className="space-y-4">
            <p className="text-sm text-white/85 leading-relaxed">
              Are you sure you want to remove <strong className="text-white font-bold">{unfriendTarget.display_name}</strong> from your travel circle?
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setUnfriendTarget(null)}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                loading={isUnfriending}
                onClick={handleConfirmUnfriend}
              >
                Remove
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>

      {/* --- Integrated Direct Chat Modal --- */}
      <ChatConversationModal
        isOpen={Boolean(activeChatFriend)}
        onClose={() => setActiveChatFriend(null)}
        friend={activeChatFriend}
      />
    </div>
  );
};
