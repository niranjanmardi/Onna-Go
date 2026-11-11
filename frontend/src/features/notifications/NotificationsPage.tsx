import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api-client';
import { NotificationItem } from '@/types';
import { formatDateTime } from '@/lib/currency';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '@/context/FeedbackContext';
import { GlassPrimary, GlassSecondary, GlassInteractive, GlassButton } from '@/components/glass';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshUnreadCount, playClick } = useFeedback();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/notifications/');
      setNotifications(data);
      refreshUnreadCount();
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      refreshUnreadCount();
      playClick();
    } catch {
      // Ignore
    }
  };

  const markRead = async (id: string, linkUrl?: string | null) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      refreshUnreadCount();
      if (linkUrl) navigate(linkUrl);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white drop-shadow-xs">
            Notifications &amp; Alerts
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium mt-1">
            Trip updates, settlement requests, and expense alerts
          </p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            className="gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
            <span>Mark all as read</span>
          </GlassButton>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-[#16834A] dark:border-t-[#22C55E] rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <GlassSecondary className="p-12 text-center text-sm text-zinc-600 dark:text-zinc-300 font-medium">
          No notifications yet.
        </GlassSecondary>
      ) : (
        <GlassSecondary className="divide-y divide-black/5 dark:divide-white/10 overflow-hidden p-2">
          {notifications.map((n) => (
            <GlassInteractive
              key={n.id}
              onClick={() => markRead(n.id, n.link_url)}
              className={`p-4 flex items-start justify-between gap-4 cursor-pointer ${
                !n.is_read ? 'bg-[#16834A]/10 dark:bg-[#22C55E]/10' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    !n.is_read
                      ? 'bg-[#16834A] dark:bg-[#22C55E] ring-4 ring-emerald-400/30'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                />
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{n.title}</h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 font-medium">{n.message}</p>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block font-mono">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              </div>

              {n.link_url && (
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-1" />
              )}
            </GlassInteractive>
          ))}
        </GlassSecondary>
      )}
    </div>
  );
};
