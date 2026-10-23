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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

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
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 4500);
  };

  // Fetch Friends
  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await api.get<Friend[]>('/friends');
      setFriends(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load friends.');
    } finally {
      setLoadingFriends(false);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await api.get<FriendRequestsData>('/friends/requests');
      setRequests(data);
    } catch (err: any) {
      // Graceful fallback
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  // Search User
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = searchQuery.trim();
    if (!cleanQ) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await api.get<FriendSearchItem[]>(
        `/friends/search?q=${encodeURIComponent(cleanQ)}`
      );
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No user found matching that username or UID.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Send Friend Request
  const handleSendRequest = async (item: FriendSearchItem) => {
    setActionInProgressId(item.id);
    setActionError(null);
    try {
      const res = await api.post<{ message: string; status: string }>('/friends/request', {
        username_or_uid: item.username || item.id,
      });
      showConfirmation({
        title: res.status === 'ACCEPTED' ? 'You are now friends!' : 'Friend request sent',
        message: res.message,
        sound: res.status === 'ACCEPTED' ? 'trip_success' : 'notification',
      });

      // Refresh search results & requests
      if (searchResults) {
        setSearchResults(
          searchResults.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  relationship_status: res.status === 'ACCEPTED' ? 'friends' : 'pending_outgoing',
                }
              : r
          )
        );
      }
      fetchFriends();
      fetchRequests();
    } catch (err: any) {
      playSound('error');
      showError(err.message || 'Failed to send friend request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Accept Friend Request
  const handleAcceptRequest = async (requestId: string) => {
    setActionInProgressId(requestId);
    setActionError(null);
    try {
      const res = await api.post<{ message: string }>(`/friends/requests/${requestId}/accept`);
      showConfirmation({
        title: 'Friend request accepted!',
        message: res.message,
        sound: 'trip_success',
      });
      fetchFriends();
      fetchRequests();
      if (searchResults) {
        setSearchResults(
          searchResults.map((r) =>
            r.request_id === requestId ? { ...r, relationship_status: 'friends' } : r
          )
        );
      }
    } catch (err: any) {
      playSound('error');
      showError(err.message || 'Failed to accept friend request.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Decline Friend Request
  const handleDeclineRequest = async (requestId: string) => {
    setActionInProgressId(requestId);
    setActionError(null);
    try {
      const res = await api.post<{ message: string }>(`/friends/requests/${requestId}/decline`);
      showSuccess(res.message);
      fetchRequests();
      if (searchResults) {
        setSearchResults(
          searchResults.map((r) =>
            r.request_id === requestId ? { ...r, relationship_status: 'none' } : r
          )
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
    setActionError(null);
    try {
      const res = await api.delete<{ message: string }>(`/friends/requests/${requestId}`);
      showSuccess(res.message);
      fetchRequests();
      if (searchResults) {
        setSearchResults(
          searchResults.map((r) =>
            r.request_id === requestId ? { ...r, relationship_status: 'none' } : r
          )
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
    setActionError(null);
    try {
      await api.delete(`/friends/${unfriendTarget.id}`);
      showSuccess(`Removed ${unfriendTarget.display_name} from friends.`);
      setFriends(friends.filter((f) => f.id !== unfriendTarget.id));
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
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 selection:bg-[#DDF5E5] selection:text-[#16834A]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
            Friends &amp; Connections
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            Build your permanent travel circle and invite trusted friends to trips.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('find')}
          className="inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Find Friends</span>
        </button>
      </div>

      {/* Inline Feedback Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
          <Check className="w-4 h-4 text-[#16834A]" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-[#E11D48]" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E8E8E5] flex gap-2">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors -mb-px cursor-pointer ${
            activeTab === 'friends'
              ? 'border-[#16834A] text-[#16834A]'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Friends</span>
          {friends.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717]">
              {friends.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('find')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors -mb-px cursor-pointer ${
            activeTab === 'find'
              ? 'border-[#16834A] text-[#16834A]'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Find Friends</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors -mb-px cursor-pointer ${
            activeTab === 'requests'
              ? 'border-[#16834A] text-[#16834A]'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Requests</span>
          {requests.incoming.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#16834A] text-white font-bold">
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
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
              <input
                type="text"
                value={friendsFilter}
                onChange={(e) => setFriendsFilter(e.target.value)}
                placeholder="Filter by name, @username, or city..."
                className="w-full bg-white border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
              />
            </div>
          )}

          {loadingFriends ? (
            <div className="p-12 text-center text-[#737373]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#16834A]" />
              <p className="text-sm">Loading your friends circle...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-10 text-center space-y-4">
              <div className="w-12 h-12 bg-[#DDF5E5] text-[#16834A] rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#171717]">
                {friendsFilter ? 'No friends match your filter' : 'No friends added yet'}
              </h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto leading-relaxed">
                Connect with travel buddies by username or UID to easily invite them to trips and split ride expenses without awkward calculations.
              </p>
              {!friendsFilter && (
                <button
                  onClick={() => setActiveTab('find')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Find &amp; Add Friends</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => {
                const avatarSrc = getAvatarUrl(friend.avatar_url);
                return (
                  <div
                    key={friend.id}
                    className="bg-white rounded-2xl border border-[#E8E8E5] p-5 shadow-xs space-y-3.5 hover:border-[#16834A]/40 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={friend.display_name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E8E8E5]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-sm">
                            {friend.display_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#171717] truncate">
                            {friend.display_name}
                          </p>
                          <p className="text-xs text-[#16834A] font-semibold truncate">
                            @{friend.username || 'user'}
                          </p>
                          {friend.city && (
                            <p className="text-[11px] text-[#737373] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-[#A3A3A3]" />
                              <span>{friend.city}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {friend.bio && (
                        <p className="text-xs text-[#737373] line-clamp-2 leading-relaxed">
                          {friend.bio}
                        </p>
                      )}

                      {/* UID with copy button */}
                      <div className="pt-2 border-t border-[#F4F4F2] flex items-center justify-between text-[11px] text-[#737373]">
                        <span className="font-mono">
                          UID: {friend.id.slice(0, 8)}...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUid(friend.id)}
                          className="hover:text-[#171717] flex items-center gap-1 font-medium cursor-pointer"
                        >
                          {copiedUid === friend.id ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-[#16834A]" />
                              <span className="text-[#16834A]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[#F4F4F2] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenProfile({
                            ...friend,
                            relationship_status: 'friends',
                          })
                        }
                        className="py-1.5 px-2.5 bg-white hover:bg-[#FAFAF8] text-[#171717] text-xs font-semibold rounded-lg border border-[#E8E8E5] transition-colors cursor-pointer"
                      >
                        Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/trips/new')}
                        className="flex-1 py-1.5 px-2 bg-[#FAFAF8] hover:bg-[#F4F4F2] text-[#171717] text-xs font-semibold rounded-lg border border-[#E8E8E5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#16834A]" />
                        <span>Plan Trip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnfriendTarget(friend)}
                        title="Remove Friend"
                        aria-label="Remove friend"
                        className="p-1.5 text-[#A3A3A3] hover:text-[#E11D48] hover:bg-[#FFE4E6]/50 rounded-lg transition-colors cursor-pointer"
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
          {/* Search Card */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Search for Travelers</h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Find friends by unique @username, display name, or registered email. (Email is used for matching only and is never revealed in search responses).
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. rider_alex, Alex Turner, or alex@example.com"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Search Feedback / Results */}
          {searchError && (
            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-center text-xs text-[#737373]">
              {searchError}
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Search Results ({searchResults.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map((item) => {
                  const avatarSrc = getAvatarUrl(item.avatar_url);
                  const isBusy = Boolean(actionInProgressId === item.id || (item.request_id && actionInProgressId === item.request_id));

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-[#E8E8E5] p-5 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={item.display_name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E8E8E5] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {item.display_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#171717] truncate">
                            {item.display_name}
                          </p>
                          <p className="text-xs text-[#16834A] font-semibold truncate">
                            @{item.username || 'user'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(item)}
                            className="text-[11px] text-[#16834A] hover:underline font-semibold mt-0.5 block text-left cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>

                      {/* State-specific button */}
                      <div className="flex-shrink-0">
                        {item.relationship_status === 'self' && (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAFAF8] text-[#737373] border border-[#E8E8E5]">
                            You
                          </span>
                        )}

                        {item.relationship_status === 'friends' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF]">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </span>
                        )}

                        {item.relationship_status === 'pending_outgoing' && (
                          <button
                            type="button"
                            onClick={() => item.request_id && handleCancelRequest(item.request_id)}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#E11D48] hover:bg-[#FFE4E6]/50 border border-[#FDA4AF] transition-colors"
                          >
                            {isBusy ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        )}

                        {item.relationship_status === 'pending_incoming' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => item.request_id && handleAcceptRequest(item.request_id)}
                              disabled={isBusy}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#16834A] hover:bg-[#136F3F] text-white shadow-2xs transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => item.request_id && handleDeclineRequest(item.request_id)}
                              disabled={isBusy}
                              className="p-1.5 text-[#737373] hover:text-[#E11D48] rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {item.relationship_status === 'none' && (
                          <button
                            type="button"
                            onClick={() => handleSendRequest(item)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            <span>Add Friend</span>
                          </button>
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
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F2]">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Incoming Requests</h2>
                <p className="text-xs text-[#737373] mt-0.5">
                  Riders and friends asking to connect with you
                </p>
              </div>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#171717] border border-[#E8E8E5]">
                {requests.incoming.length}
              </span>
            </div>

            {loadingRequests ? (
              <div className="p-6 text-center text-[#737373]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#16834A]" />
              </div>
            ) : requests.incoming.length === 0 ? (
              <p className="text-xs text-[#737373] text-center py-6">
                No incoming friend requests at this time.
              </p>
            ) : (
              <div className="divide-y divide-[#F4F4F2]">
                {requests.incoming.map((req) => {
                  const avatarSrc = getAvatarUrl(req.requester_avatar);
                  const isBusy = actionInProgressId === req.id;

                  return (
                    <div key={req.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={req.requester_name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E8E8E5]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                            {req.requester_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#171717] truncate">
                            {req.requester_name}
                          </p>
                          <p className="text-xs text-[#16834A] truncate">
                            @{req.requester_username || 'user'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        >
                          {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineRequest(req.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 bg-white hover:bg-[#F4F4F2] text-[#737373] text-xs font-medium rounded-lg border border-[#E8E8E5] transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F2]">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Pending Outgoing Requests</h2>
                <p className="text-xs text-[#737373] mt-0.5">
                  Requests you sent awaiting response
                </p>
              </div>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#171717] border border-[#E8E8E5]">
                {requests.outgoing.length}
              </span>
            </div>

            {requests.outgoing.length === 0 ? (
              <p className="text-xs text-[#737373] text-center py-6">
                No pending outgoing requests.
              </p>
            ) : (
              <div className="divide-y divide-[#F4F4F2]">
                {requests.outgoing.map((req) => {
                  const avatarSrc = getAvatarUrl(req.addressee_avatar);
                  const isBusy = actionInProgressId === req.id;

                  return (
                    <div key={req.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={req.addressee_name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E8E8E5]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                            {req.addressee_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#171717] truncate">
                            {req.addressee_name}
                          </p>
                          <p className="text-xs text-[#16834A] truncate">
                            @{req.addressee_username || 'user'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs text-[#E11D48] hover:bg-[#FFE4E6]/50 border border-[#FDA4AF] rounded-lg font-medium transition-colors"
                      >
                        {isBusy ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unfriend Modal Confirmation */}
      {unfriendTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 max-w-sm w-full shadow-xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-[#171717]">
              Remove Friend?
            </h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#171717]">{unfriendTarget.display_name}</strong> (@{unfriendTarget.username}) from your friends circle? Past trip records will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUnfriendTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-[#737373] hover:text-[#171717] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnfriend}
                disabled={isUnfriending}
                className="px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
              >
                {isUnfriending ? 'Removing...' : 'Remove Friend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scaleUp relative">
            <button
              onClick={() => setViewingProfile(null)}
              className="absolute top-4 right-4 p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-3 pt-2">
              {viewingProfile.avatar_url ? (
                <img
                  src={getAvatarUrl(viewingProfile.avatar_url) || ''}
                  alt={viewingProfile.display_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#E8E8E5] mx-auto"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#171717] text-white flex items-center justify-center font-bold text-lg mx-auto">
                  {viewingProfile.display_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-[#171717]">
                  {viewingProfile.display_name}
                </h3>
                <p className="text-xs text-[#16834A] font-semibold">
                  @{viewingProfile.username || 'user'}
                </p>
                {viewingProfile.city && (
                  <p className="text-[11px] text-[#737373] flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#A3A3A3]" />
                    <span>{viewingProfile.city}</span>
                  </p>
                )}
              </div>

              {viewingProfile.bio && (
                <p className="text-xs text-[#737373] bg-[#FAFAF8] p-3 rounded-xl border border-[#E8E8E5] text-left">
                  {viewingProfile.bio}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#737373] pt-2 border-t border-[#E8E8E5]">
                <span>Status</span>
                <span
                  className={`font-semibold capitalize px-2 py-0.5 rounded-md ${
                    viewingProfile.relationship_status === 'friends'
                      ? 'bg-[#DDF5E5] text-[#16834A]'
                      : viewingProfile.relationship_status === 'pending_outgoing'
                      ? 'bg-[#FEF3C7] text-[#B45309]'
                      : viewingProfile.relationship_status === 'pending_incoming'
                      ? 'bg-[#EFF6FF] text-[#1E40AF]'
                      : 'bg-[#FAFAF8] text-[#737373]'
                  }`}
                >
                  {viewingProfile.relationship_status === 'pending_outgoing'
                    ? 'Request Sent'
                    : viewingProfile.relationship_status === 'pending_incoming'
                    ? 'Incoming Request'
                    : viewingProfile.relationship_status}
                </span>
              </div>
            </div>

            {/* Contextual Profile Actions */}
            <div className="pt-2">
              {viewingProfile.relationship_status === 'none' && (
                <button
                  type="button"
                  onClick={() => {
                    handleSendRequest(viewingProfile);
                    setViewingProfile(null);
                  }}
                  className="w-full py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Send Friend Request</span>
                </button>
              )}

              {viewingProfile.relationship_status === 'pending_outgoing' && (
                <button
                  type="button"
                  onClick={() => {
                    if (viewingProfile.request_id) handleCancelRequest(viewingProfile.request_id);
                    setViewingProfile(null);
                  }}
                  className="w-full py-2.5 bg-white hover:bg-[#FFE4E6]/50 text-[#E11D48] border border-[#FDA4AF] text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel Outgoing Request
                </button>
              )}

              {viewingProfile.relationship_status === 'pending_incoming' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (viewingProfile.request_id) handleAcceptRequest(viewingProfile.request_id);
                      setViewingProfile(null);
                    }}
                    className="py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (viewingProfile.request_id) handleDeclineRequest(viewingProfile.request_id);
                      setViewingProfile(null);
                    }}
                    className="py-2.5 bg-white text-[#737373] border border-[#E8E8E5] text-xs font-semibold rounded-xl hover:bg-[#FAFAF8] cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              )}

              {viewingProfile.relationship_status === 'friends' && (
                <button
                  type="button"
                  onClick={() => {
                    setUnfriendTarget(viewingProfile as any);
                    setViewingProfile(null);
                  }}
                  className="w-full py-2 text-xs text-[#E11D48] hover:bg-[#FFE4E6]/50 border border-[#FDA4AF] rounded-xl font-semibold cursor-pointer"
                >
                  Remove from Friends
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
