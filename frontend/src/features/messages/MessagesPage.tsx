import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  SquarePen,
  Compass,
  MessageCircle,
  Users,
  AlertCircle,
  Loader2,
  Send,
  MessageSquare,
} from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { ConversationItem, Friend, Trip } from '@/types';
import { GlassButton } from '@/components/glass';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ActiveConversationView } from './ActiveConversationView';
import { NewConversationModal } from './NewConversationModal';

function formatRelativeConversationTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return 'now';
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { playClick } = useFeedback();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTripId = searchParams.get('tripId');
  const queryFriendId = searchParams.get('friendId');

  // Conversation List State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'direct' | 'trip'>('all');

  // Active Selection State
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [activeTripId, setActiveTripId] = useState<string | null>(queryTripId || null);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);

  // New Conversation Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Fetch conversations list
  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.get<ConversationItem[]>('/chat/conversations');
      setConversations(data || []);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Unable to load conversations.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Periodic poll for inbox conversations to update unread counts and previews
  useEffect(() => {
    const timer = setInterval(() => {
      fetchConversations(true);
    }, 6000);

    return () => clearInterval(timer);
  }, [fetchConversations]);

  // Handle URL changes & query params
  useEffect(() => {
    if (conversationId) {
      setActiveConvId(conversationId);
      setActiveTripId(null);
      setActiveFriend(null);
    } else if (queryTripId) {
      setActiveTripId(queryTripId);
      setActiveConvId(null);
      setActiveFriend(null);
    } else if (queryFriendId) {
      // Look up friend
      api.get<any>(`/friends/profile/${queryFriendId}`)
        .then((f) => {
          setActiveFriend(f);
          setActiveConvId(null);
          setActiveTripId(null);
        })
        .catch(() => {
          setActiveConvId(null);
        });
    }
  }, [conversationId, queryTripId, queryFriendId]);

  // Synchronize mobile bottom nav suppression when active conversation is present
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const hasActive = Boolean(activeConvId || activeTripId || activeFriend);
    if (isMobile && hasActive) {
      window.dispatchEvent(new CustomEvent('onnago_toggle_bottom_nav', { detail: { hide: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('onnago_toggle_bottom_nav', { detail: { hide: false } }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('onnago_toggle_bottom_nav', { detail: { hide: false } }));
    };
  }, [activeConvId, activeTripId, activeFriend]);

  // Select conversation from list
  const handleSelectConversation = (conv: ConversationItem) => {
    playClick();
    setActiveConvId(conv.id);
    setActiveTripId(null);
    setActiveFriend(null);
    navigate(`/messages/${conv.id}`);
  };

  // Start direct conversation from modal
  const handleSelectFriendFromModal = async (friend: Friend) => {
    playClick();
    try {
      const res = await api.post<{ id: string }>('/chat/conversations/direct', {
        friend_id: friend.id,
      });
      fetchConversations(true);
      setActiveConvId(res.id);
      setActiveTripId(null);
      setActiveFriend(null);
      navigate(`/messages/${res.id}`);
    } catch {
      setActiveFriend(friend);
      setActiveTripId(null);
      setActiveConvId(null);
      navigate(`/messages?friendId=${friend.id}`);
    }
  };

  // Start trip conversation from modal
  const handleSelectTripFromModal = async (trip: Trip) => {
    playClick();
    try {
      const res = await api.get<{ id: string }>(`/chat/trips/${trip.id}/conversation`);
      fetchConversations(true);
      setActiveConvId(res.id);
      setActiveTripId(null);
      setActiveFriend(null);
      navigate(`/messages/${res.id}`);
    } catch {
      setActiveTripId(trip.id);
      setActiveConvId(null);
      setActiveFriend(null);
      navigate(`/messages?tripId=${trip.id}`);
    }
  };

  const handleBackToInbox = () => {
    playClick();
    setActiveConvId(null);
    setActiveTripId(null);
    setActiveFriend(null);
    navigate('/messages');
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      // Category filter
      if (categoryFilter === 'direct' && c.type !== 'DIRECT') return false;
      if (categoryFilter === 'trip' && c.type !== 'TRIP_GROUP') return false;

      // Text search
      if (!q) return true;
      const titleMatch = c.title?.toLowerCase().includes(q);
      const previewMatch = c.last_message_preview?.toLowerCase().includes(q);
      const otherMatch = c.other_member?.display_name.toLowerCase().includes(q);
      return Boolean(titleMatch || previewMatch || otherMatch);
    });
  }, [conversations, searchQuery, categoryFilter]);

  const hasActiveConversation = Boolean(activeConvId || activeTripId || activeFriend);

  return (
    <div className="flex-1 w-full h-full min-h-0 flex overflow-hidden bg-transparent select-none">
      {/* =========================================================================
          LEFT PANEL: Messages Inbox List
          - Visible on desktop always
          - On mobile: visible when NO conversation is selected
         ========================================================================= */}
      <aside
        className={`${
          hasActiveConversation ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 h-full min-h-0 glass-nav border-r border-white/20 shrink-0 z-10 transition-all`}
      >
        {/* Header: Title, Authenticated user username, New Message button */}
        <div className="p-4 border-b border-white/20 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-xs flex items-center gap-2">
              <span>Messages</span>
            </h1>
            <p className="text-xs text-[var(--theme-accent,#22C55E)] font-semibold truncate mt-0.5">
              @{user?.username || 'traveler'}
            </p>
          </div>

          <button
            onClick={() => {
              playClick();
              setIsNewModalOpen(true);
            }}
            title="New message"
            aria-label="New message"
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/30 shadow-xs"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b border-white/15 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="glass-input w-full pl-10 pr-3.5 py-2 text-xs rounded-xl focus:outline-none placeholder:text-white/50"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 mt-2.5">
            <button
              onClick={() => {
                playClick();
                setCategoryFilter('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white/25 text-white shadow-xs border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                playClick();
                setCategoryFilter('direct');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'direct'
                  ? 'bg-white/25 text-white shadow-xs border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => {
                playClick();
                setCategoryFilter('trip');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'trip'
                  ? 'bg-white/25 text-white shadow-xs border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Trips
            </button>
          </div>
        </div>

        {/* Conversation List Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/10 p-2 space-y-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-white/70">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-400" />
              <p className="text-xs font-medium">Loading conversations...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex flex-col items-center gap-2 text-center my-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>{error}</span>
              <GlassButton size="sm" variant="secondary" onClick={() => fetchConversations()}>
                Retry
              </GlassButton>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-16 text-center text-white/70 p-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 text-white/60">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">No messages yet</p>
              <p className="text-xs text-white/65 mt-1 max-w-xs mx-auto">
                Connect with friends or coordinate with fellow travelers in your active trips.
              </p>
              <GlassButton
                size="sm"
                variant="primary"
                className="mt-4"
                icon={<SquarePen className="w-3.5 h-3.5" />}
                onClick={() => setIsNewModalOpen(true)}
              >
                Start Chat
              </GlassButton>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConvId === conv.id;
              const isGroup = conv.type === 'TRIP_GROUP';
              const hasUnread = conv.unread_count > 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/25 border border-white/35 shadow-md backdrop-blur-md'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {/* Avatar with type badge */}
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/40 text-blue-200 flex items-center justify-center shadow-xs">
                        <Compass className="w-5 h-5 text-blue-300" />
                      </div>
                    ) : (
                      <UserAvatar
                        name={conv.title || conv.other_member?.display_name}
                        avatarUrl={conv.other_member?.avatar_url}
                        size="lg"
                      />
                    )}

                    {/* Group indicator badge or unread dot */}
                    {isGroup ? (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 border border-white/40 flex items-center justify-center text-[9px] text-white font-bold">
                        <Users className="w-2.5 h-2.5" />
                      </span>
                    ) : hasUnread ? (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-black/40" />
                    ) : null}
                  </div>

                  {/* Conversation Title & Last message preview */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-sm truncate drop-shadow-xs ${
                          hasUnread ? 'font-extrabold text-white' : 'font-semibold text-white/95'
                        }`}
                      >
                        {conv.title || (isGroup ? 'Trip Group' : 'Direct Message')}
                      </p>
                      <span className="text-[10px] text-white/60 shrink-0 tabular-nums">
                        {formatRelativeConversationTime(conv.last_message_at || conv.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          hasUnread
                            ? 'font-bold text-white/95'
                            : 'font-medium text-white/70'
                        }`}
                      >
                        {conv.last_message_preview || 'No messages yet'}
                      </p>

                      {hasUnread && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-blue-500 text-[10px] font-extrabold text-white shadow-xs">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT PANEL: Active Conversation View / Empty State
          - Visible on desktop always
          - On mobile: visible ONLY when a conversation is active
         ========================================================================= */}
      <section
        className={`${
          hasActiveConversation ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full min-h-0 overflow-hidden relative`}
      >
        {hasActiveConversation ? (
          <ActiveConversationView
            conversationId={activeConvId}
            tripId={activeTripId}
            friendId={activeFriend?.id}
            friendName={activeFriend?.display_name}
            friendAvatar={activeFriend?.avatar_url}
            friendUsername={activeFriend?.username}
            onBack={handleBackToInbox}
            showBackButton={true}
            onUnreadCountChange={() => fetchConversations(true)}
          />
        ) : (
          /* Instagram DM Desktop Placeholder Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-24 h-24 rounded-full glass-panel border border-white/25 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-2xl">
              <MessageCircle className="w-12 h-12 text-white/75" />
            </div>

            <h2 className="text-2xl font-extrabold text-white drop-shadow-sm tracking-tight">
              Your Messages
            </h2>

            <p className="text-sm text-white/75 mt-2 max-w-sm leading-relaxed font-medium">
              Send direct messages to friends or coordinate expenses, routes, and plans with your trip groups.
            </p>

            <GlassButton
              variant="primary"
              size="md"
              className="mt-6 px-6 font-bold shadow-lg"
              icon={<Send className="w-4 h-4" />}
              onClick={() => setIsNewModalOpen(true)}
            >
              Send message
            </GlassButton>
          </div>
        )}
      </section>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSelectFriend={handleSelectFriendFromModal}
        onSelectTrip={handleSelectTripFromModal}
      />
    </div>
  );
};
