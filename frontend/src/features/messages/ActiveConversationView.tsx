import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  ArrowLeft,
  Compass,
  Users,
  RefreshCw,
  AlertCircle,
  Loader2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getAvatarUrl } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { playSound } from '@/lib/sounds';
import { ChatMessageItem } from '@/types';
import { GlassButton } from '@/components/glass';
import { UserAvatar } from '@/components/common/UserAvatar';

export interface ActiveConversationViewProps {
  conversationId?: string | null;
  tripId?: string | null;
  friendId?: string | null;
  friendName?: string | null;
  friendAvatar?: string | null;
  friendUsername?: string | null;
  tripName?: string | null;
  memberCount?: number;
  onBack?: () => void;
  onUnreadCountChange?: (count: number) => void;
  pollIntervalMs?: number;
  showBackButton?: boolean;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const ActiveConversationView: React.FC<ActiveConversationViewProps> = ({
  conversationId: initialConvId,
  tripId,
  friendId,
  friendName,
  friendAvatar,
  friendUsername,
  tripName,
  memberCount,
  onBack,
  onUnreadCountChange,
  pollIntervalMs = 3500,
  showBackButton = true,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId || null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [activeTitle, setActiveTitle] = useState<string>(tripName || friendName || '');
  const [activeSubtitle, setActiveSubtitle] = useState<string>(
    friendUsername
      ? `@${friendUsername}`
      : memberCount
      ? `${memberCount} trip members`
      : 'Direct message'
  );
  const [activeAvatar, setActiveAvatar] = useState<string | null>(friendAvatar || null);
  const [isTripGroup, setIsTripGroup] = useState<boolean>(Boolean(tripId));
  const [activeTripId, setActiveTripId] = useState<string | null>(tripId || null);

  // Composer
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadDoneRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback((smooth = true) => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Initialize or fetch conversation
  useEffect(() => {
    let isMounted = true;

    const initConversation = async () => {
      setLoading(true);
      setError(null);

      try {
        let convId = initialConvId;

        // 1. Direct conversation via friendId
        if (!convId && friendId) {
          const directRes = await api.post<{ id: string; title?: string }>('/chat/conversations/direct', {
            friend_id: friendId,
          });
          convId = directRes.id;
          if (isMounted) {
            setIsTripGroup(false);
            if (friendName) setActiveTitle(friendName);
            if (friendAvatar) setActiveAvatar(friendAvatar);
            setActiveSubtitle(friendUsername ? `@${friendUsername}` : 'Direct message');
          }
        }
        // 2. Trip group conversation via tripId
        else if (!convId && tripId) {
          const tripRes = await api.get<{
            id: string;
            title?: string;
            trip_id?: string;
            unread_count?: number;
          }>(`/chat/trips/${tripId}/conversation`);
          convId = tripRes.id;
          if (isMounted) {
            setIsTripGroup(true);
            setActiveTripId(tripId);
            setActiveTitle(tripRes.title || tripName || 'Trip Group');
            setActiveSubtitle(memberCount ? `${memberCount} trip members` : 'Trip Group Chat');
            if (onUnreadCountChange && typeof tripRes.unread_count === 'number') {
              onUnreadCountChange(tripRes.unread_count);
            }
          }
        }
        // 3. Existing conversation by ID
        else if (convId) {
          // Fetch conversation details to populate header
          try {
            const allConvs = await api.get<any[]>('/chat/conversations');
            const match = allConvs.find((c) => c.id === convId);
            if (match && isMounted) {
              const isGroup = match.type === 'TRIP_GROUP';
              setIsTripGroup(isGroup);
              setActiveTripId(match.trip_id || null);
              setActiveTitle(match.title || (isGroup ? 'Trip Chat' : 'Direct Message'));
              setActiveAvatar(match.other_member?.avatar_url || null);
              setActiveSubtitle(
                isGroup
                  ? 'Trip Group Chat'
                  : match.other_member?.display_name || 'Direct message'
              );
            }
          } catch {
            // Ignore if metadata lookup fails
          }
        }

        if (!isMounted) return;

        if (convId) {
          setActiveConvId(convId);
          const msgs = await api.get<ChatMessageItem[]>(
            `/chat/conversations/${convId}/messages`
          );
          if (!isMounted) return;

          const loadedMsgs = msgs || [];
          setMessages(loadedMsgs);
          knownMessageIdsRef.current = new Set(loadedMsgs.map((m) => m.id));
          initialLoadDoneRef.current = true;

          // Mark conversation as read
          api.post(`/chat/conversations/${convId}/read`, {}).catch(() => {});
          if (onUnreadCountChange) onUnreadCountChange(0);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Failed to load chat conversation:', err);
        const msg = String(err?.message || '');
        if (msg.includes('405') || msg.includes('Method Not Allowed')) {
          setError('Messaging service is temporarily updating. Please try again shortly.');
        } else if (msg.includes('Network') || msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
          setError('Unable to connect to chat. Please check your internet connection.');
        } else {
          setError(err?.message || 'Unable to connect to chat. Please check your connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 80);
        }
      }
    };

    initConversation();

    return () => {
      isMounted = false;
      initialLoadDoneRef.current = false;
      knownMessageIdsRef.current.clear();
    };
  }, [initialConvId, tripId, friendId, reloadCounter]);

  // Polling for incoming messages
  useEffect(() => {
    if (!activeConvId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const pollMessages = async () => {
      try {
        const latestMsgs = await api.get<ChatMessageItem[]>(
          `/chat/conversations/${activeConvId}/messages`
        );
        if (!latestMsgs) return;

        setMessages((prev) => {
          let hasNewFromOthers = false;
          const currentMap = new Map(prev.map((m) => [m.id, m]));

          for (const msg of latestMsgs) {
            if (!currentMap.has(msg.id)) {
              currentMap.set(msg.id, msg);
              if (
                initialLoadDoneRef.current &&
                !knownMessageIdsRef.current.has(msg.id) &&
                msg.sender_id !== user?.id
              ) {
                hasNewFromOthers = true;
              }
              knownMessageIdsRef.current.add(msg.id);
            }
          }

          if (hasNewFromOthers) {
            playSound('notification');
            api.post(`/chat/conversations/${activeConvId}/read`, {}).catch(() => {});
          }

          return Array.from(currentMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      } catch {
        // Silent poll error
      }
    };

    pollTimerRef.current = setInterval(pollMessages, pollIntervalMs);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeConvId, user?.id, pollIntervalMs]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeConvId || sending) return;

    setSending(true);
    setSendFailed(false);

    // Optimistic UI message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: user?.id || '',
      sender: {
        id: user?.id || '',
        display_name: user?.full_name || 'You',
        avatar_url: user?.avatar_url,
      },
      message_type: 'TEXT',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const realMsg = await api.post<ChatMessageItem>(
        `/chat/conversations/${activeConvId}/messages`,
        { content: text }
      );
      knownMessageIdsRef.current.add(realMsg.id);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? realMsg : m)));
      playSound('click');
    } catch (err: any) {
      // Revert optimistic message and preserve text for retry
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      setSendFailed(true);
      playSound('error');
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom(true), 60);
    }
  };

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-0 bg-transparent overflow-hidden">
      {/* --- Top Conversation Header (Instagram DM Style) --- */}
      <header className="glass-nav h-14 sm:h-16 px-3.5 sm:px-4 flex items-center justify-between border-b border-white/20 bg-black/25 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              aria-label="Back to inbox"
              className="p-2 -ml-1 text-white/80 hover:text-white hover:bg-white/15 active:scale-95 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Conversation Avatar with Initial Fallback */}
          <div className="relative shrink-0">
            {isTripGroup ? (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-400/40 text-emerald-200 flex items-center justify-center shadow-md">
                <Compass className="w-5 h-5 text-emerald-300" />
              </div>
            ) : (
              <UserAvatar
                name={activeTitle}
                avatarUrl={activeAvatar}
                size="md"
                shape="rounded-2xl"
                className="ring-2 ring-white/30"
              />
            )}
            {/* Direct online or group indicator dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black/40 ${
                isTripGroup ? 'bg-teal-400' : 'bg-emerald-400'
              }`}
            />
          </div>

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate drop-shadow-xs flex items-center gap-1.5">
              <span>{activeTitle || 'Conversation'}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-white/70 font-medium truncate flex items-center gap-1">
              {isTripGroup ? (
                <>
                  <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{activeSubtitle || 'Trip Group Chat'}</span>
                </>
              ) : (
                <span className="truncate">{activeSubtitle || 'Direct message'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Action: View Trip Details if group chat */}
        {isTripGroup && activeTripId && (
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/trips/${activeTripId}`)}
            className="text-xs text-emerald-200 hover:text-white shrink-0"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Trip Details</span>
          </GlassButton>
        )}
      </header>

      {/* --- Error Banner --- */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-red-500/20 border border-red-500/35 text-red-200 text-xs flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={() => setReloadCounter((c) => c + 1)}
            className="text-xs underline font-bold hover:text-white cursor-pointer ml-2 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* --- Message Feed Area (Fills all vertical space above composer) --- */}
      <div
        className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 min-h-0 divide-y-0 scroll-smooth overscroll-contain"
        role="log"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-white/70">
            <Loader2 className="w-7 h-7 animate-spin mb-3 text-emerald-400" />
            <p className="text-xs font-semibold">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-white/75">
            <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-3 shadow-lg">
              <MessageSquare className="w-7 h-7 text-white/60" />
            </div>
            <h3 className="text-base font-bold text-white drop-shadow-xs">
              {isTripGroup ? 'Trip Group Chat' : 'Start the Conversation'}
            </h3>
            <p className="text-xs text-white/70 mt-1 max-w-xs leading-relaxed">
              {isTripGroup
                ? 'Coordinate meeting spots, share ride updates, or ask trip members questions.'
                : `Send a friendly greeting or coordinate your upcoming plans with ${activeTitle || 'your friend'}.`}
            </p>
          </div>
        ) : (
          (() => {
            let lastDate = '';
            return messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const senderName = isMe ? 'You' : msg.sender?.display_name || 'Member';
              const dateGroup = formatDateSeparator(msg.created_at);
              const showDateGroup = dateGroup !== lastDate;
              if (showDateGroup) lastDate = dateGroup;

              return (
                <React.Fragment key={msg.id}>
                  {/* Date Separator Pill */}
                  {showDateGroup && (
                    <div className="flex justify-center my-3 select-none">
                      <span className="px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white/85 bg-black/40 border border-white/20 backdrop-blur-xl shadow-xs">
                        {dateGroup}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 group`}
                  >
                    {/* Sender display name for other members in group conversations */}
                    {!isMe && isTripGroup && (
                      <span className="text-[11px] font-bold text-emerald-300 dark:text-emerald-400 mb-0.5 px-2.5">
                        {senderName}
                      </span>
                    )}

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] md:max-w-[65%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium shadow-md transition-all ${
                        isMe
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs border border-emerald-400/40 shadow-emerald-950/20'
                          : 'bg-white/20 dark:bg-white/10 text-white border border-white/25 dark:border-white/15 rounded-tl-xs backdrop-blur-xl'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
                        {msg.content}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-white/60 mt-0.5 px-2 tabular-nums font-mono">
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                </React.Fragment>
              );
            });
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Failure Retry Notification --- */}
      {sendFailed && (
        <div className="mx-4 mb-2 p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/35 text-amber-200 text-xs flex items-center justify-between shadow-md shrink-0">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Failed to send message. Tap Retry.</span>
          </span>
          <button
            type="button"
            onClick={handleSendMessage}
            className="flex items-center gap-1 text-[11px] font-bold text-white underline cursor-pointer hover:opacity-80 shrink-0 ml-2"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* --- Instagram DM Composer Bar (Anchored at bottom above safe area / keyboard) --- */}
      <footer className="glass-nav border-t border-white/20 p-2.5 sm:p-3 shrink-0 bg-black/30 backdrop-blur-2xl pb-[calc(0.6rem+env(safe-area-inset-bottom,8px))]">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 max-w-4xl mx-auto w-full"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isTripGroup ? 'Message trip group...' : `Message ${activeTitle || 'friend'}...`}
              disabled={sending || loading}
              className="glass-input w-full h-11 pl-4 pr-4 rounded-full text-xs sm:text-sm focus:outline-none placeholder:text-white/50 border border-white/30 bg-white/15 backdrop-blur-md shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || sending || loading}
            aria-label="Send message"
            className="w-11 h-11 rounded-full bg-[var(--theme-accent,#22C55E)] hover:brightness-110 active:scale-95 text-[#0A0A0A] font-bold flex items-center justify-center shrink-0 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
            ) : (
              <Send className="w-4 h-4 ml-0.5 stroke-[2.5]" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
};
