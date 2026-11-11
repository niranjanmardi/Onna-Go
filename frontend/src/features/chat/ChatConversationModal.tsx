import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, Compass, AlertCircle, RefreshCw, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getAvatarUrl } from '@/lib/api-client';
import { GlassModal, GlassButton } from '@/components/glass';
import { useAuth } from '@/features/auth/AuthContext';
import { playSound } from '@/lib/sounds';

export interface ChatMessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
  message_type: string;
  content: string;
  media_url?: string | null;
  created_at: string;
}

export interface ChatConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string | null;
  tripName?: string | null;
  memberCount?: number;
  friend?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    username?: string | null;
  } | null;
  conversationId?: string | null;
  title?: string;
  onUnreadCountChange?: (count: number) => void;
  pollIntervalMs?: number;
}

export const ChatConversationModal: React.FC<ChatConversationModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripName,
  memberCount,
  friend,
  conversationId: initialConvId,
  title,
  onUnreadCountChange,
  pollIntervalMs = 3500,
}) => {
  const { user } = useAuth();
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch {
    // May be rendered in an isolated test environment without a Router
  }
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId || null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadDoneRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Fetch or create conversation
  useEffect(() => {
    if (!isOpen) {
      initialLoadDoneRef.current = false;
      knownMessageIdsRef.current.clear();
      setActiveConvId(null);
      setMessages([]);
      setError(null);
      setSendFailed(false);
      return;
    }

    let isMounted = true;

    const initConversation = async () => {
      setLoading(true);
      setError(null);
      try {
        let convId = initialConvId;

        // 1. If tripId provided, get or create canonical trip group conversation
        if (!convId && tripId) {
          const res = await api.get<{ id: string; unread_count?: number }>(
            `/chat/trips/${tripId}/conversation`
          );
          convId = res.id;
          if (onUnreadCountChange && typeof res.unread_count === 'number') {
            onUnreadCountChange(res.unread_count);
          }
        }
        // 2. If friend provided, get or create direct 1-on-1 conversation
        else if (!convId && friend?.id) {
          const convRes = await api.post<{ id: string }>('/chat/conversations/direct', {
            friend_id: friend.id,
          });
          convId = convRes.id;
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
        setError(err.message || 'Unable to connect to chat. Please check your connection.');
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(scrollToBottom, 80);
        }
      }
    };

    initConversation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialConvId, tripId, friend?.id]);

  // Polling for incoming messages while modal is open
  useEffect(() => {
    if (!isOpen || !activeConvId) {
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
        // Silent poll error to avoid interrupting user typing
      }
    };

    pollTimerRef.current = setInterval(pollMessages, pollIntervalMs);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, activeConvId, user?.id, pollIntervalMs]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? realMsg : m))
      );
      playSound('click');
    } catch (err: any) {
      // Revert optimistic message and preserve text for retry
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      setSendFailed(true);
      playSound('error');
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 60);
    }
  };

  const isTripChat = Boolean(tripId);
  const displayName =
    tripName ||
    title ||
    friend?.display_name ||
    (friend?.username ? `@${friend.username}` : isTripChat ? 'Trip Chat' : 'Chat');

  const avatarSrc = friend?.avatar_url ? getAvatarUrl(friend.avatar_url) : null;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          {isTripChat ? (
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5 text-blue-400" />
            </div>
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-white/40 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white truncate drop-shadow-xs">
              {displayName}
            </h3>
            <p className="text-[11px] sm:text-xs text-white/70 font-medium truncate flex items-center gap-1.5">
              {isTripChat ? (
                <>
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>
                    {memberCount ? `${memberCount} trip members` : 'Trip Group Chat'} • Active
                  </span>
                </>
              ) : friend?.username ? (
                `@${friend.username}`
              ) : (
                'Direct message'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              const dest = tripId
                ? `/messages?tripId=${tripId}`
                : friend
                ? `/messages?friendId=${friend.id}`
                : activeConvId
                ? `/messages/${activeConvId}`
                : '/messages';
              if (navigate) {
                navigate(dest);
              } else if (typeof window !== 'undefined') {
                window.location.href = dest;
              }
            }}
            title="Open full-screen messages"
            className="ml-auto p-1.5 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs"
          >
            <span className="hidden sm:inline text-[11px] font-medium">Full Screen</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      }
      maxWidth="md"
      className="max-h-[85vh] flex flex-col p-4 sm:p-5"
    >
      {/* Error state */}
      {error && (
        <div className="mb-3 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setActiveConvId(null)}
            className="text-xs underline hover:text-white cursor-pointer ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div
        className="flex-1 overflow-y-auto space-y-3 py-3 px-1 min-h-[280px] max-h-[380px] divide-y-0 scroll-smooth"
        role="log"
        aria-live="polite"
      >
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center text-white/70">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-400" />
            <p className="text-xs font-medium">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-white/75">
            <MessageSquare className="w-8 h-8 mb-2 text-white/50" />
            <p className="text-sm font-bold text-white">
              {isTripChat ? 'Start the Trip Chat' : 'Start the conversation'}
            </p>
            <p className="text-xs text-white/65 mt-1 max-w-xs">
              {isTripChat
                ? 'Coordinate meeting spots, share ride updates, or ask trip members questions.'
                : 'Send a greeting or coordinate ride details.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const senderName = isMe ? 'You' : msg.sender?.display_name || 'Member';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5`}
              >
                {/* Sender label for other members in group chat */}
                {!isMe && isTripChat && (
                  <span className="text-[11px] font-bold text-blue-300 dark:text-blue-400 mb-0.5 px-2">
                    {senderName}
                  </span>
                )}

                <div
                  className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium shadow-md transition-all ${
                    isMe
                      ? 'bg-blue-600 dark:bg-blue-600 text-white rounded-tr-xs border border-blue-400/30'
                      : 'bg-white/15 dark:bg-white/10 text-white border border-white/25 dark:border-white/15 rounded-tl-xs backdrop-blur-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                </div>
                <span className="text-[10px] text-white/60 mt-0.5 px-1.5 tabular-nums">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Failure retry banner */}
      {sendFailed && (
        <div className="mt-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed to deliver message. Tap Send to retry.
          </span>
          <button
            type="button"
            onClick={handleSendMessage}
            className="flex items-center gap-1 text-[11px] font-bold text-white underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Message Composer Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="pt-3 border-t border-white/15 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isTripChat ? 'Message trip members...' : `Message ${displayName}...`}
          className="glass-input flex-1 h-11 text-xs sm:text-sm rounded-xl px-3.5 focus:outline-none"
          disabled={sending || loading}
        />
        <GlassButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputText.trim() || sending || loading}
          loading={sending}
          className="h-11 px-4 shrink-0 rounded-xl"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </GlassButton>
      </form>
    </GlassModal>
  );
};
