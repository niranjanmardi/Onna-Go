import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api-client';
import { NotificationItem } from '@/types';
import { formatDateTime } from '@/lib/currency';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/notifications/');
      setNotifications(data);
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
      if (linkUrl) navigate(linkUrl);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
            Notifications &amp; Alerts
          </h1>
          <p className="text-sm text-[#737373]">Trip updates, settlement requests, and expense alerts</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16834A] hover:bg-[#DDF5E5] rounded-lg transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E5] p-12 text-center text-sm text-[#737373] shadow-xs">
          No notifications yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E8E5] divide-y divide-[#F4F4F2] shadow-xs overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id, n.link_url)}
              className={`p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#FAFAF8] transition-colors ${
                !n.is_read ? 'bg-[#DDF5E5]/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    !n.is_read ? 'bg-[#16834A] ring-4 ring-[#DDF5E5]' : 'bg-[#E8E8E5]'
                  }`}
                />
                <div>
                  <h4 className="text-sm font-semibold text-[#171717]">{n.title}</h4>
                  <p className="text-xs text-[#737373] mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-[#A3A3A3] mt-1 block">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              </div>

              {n.link_url && (
                <ExternalLink className="w-3.5 h-3.5 text-[#A3A3A3] flex-shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
