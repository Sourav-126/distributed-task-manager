import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Notification } from '@/utils/useNotifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (id: number) => void;
  permission: string;
  requestPermission: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  markAllAsRead,
  markAsRead,
  permission,
  requestPermission,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'comment_mention':
        return '📣';
      case 'reply_to_comment':
        return '↩️';
      case 'task_assigned':
        return '📥';
      case 'task_status_changed':
        return '⚡';
      case 'task_deleted':
        return '🗑️';
      case 'added_to_team':
        return '👥';
      case 'removed_from_team':
        return '🚪';
      case 'role_changed':
        return '🛡️';
      default:
        return '🔔';
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'comment_mention':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'task_assigned':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'task_status_changed':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'task_deleted':
      case 'removed_from_team':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed right-6 top-20 w-96 max-h-[500px] bg-white border border-app-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 animate-fadeIn"
      style={{
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 bg-gray-50 border-b border-app-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-sm text-app-text">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* OS notification permission call-to-action banner */}
      {permission !== 'granted' && (
        <button
          onClick={requestPermission}
          className="bg-primary/5 hover:bg-primary/10 border-b border-app-border px-4 py-2.5 text-left transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-base shrink-0">🔔</span>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-primary">Enable desktop notifications</p>
              <p className="text-[9px] text-gray-400 truncate">Never miss task updates or mentions</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-primary bg-white border border-primary/20 px-2 py-0.5 rounded-lg group-hover:bg-primary group-hover:text-white transition-all shrink-0">
            Enable
          </span>
        </button>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[200px]">
        {notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-3xl">📭</span>
            <p className="text-xs font-bold text-gray-500">Inbox is clean</p>
            <p className="text-[10px] text-gray-400 max-w-[200px]">
              You'll see real-time updates and task activity here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-3.5 transition-colors cursor-pointer hover:bg-gray-50 flex items-start space-x-3 ${
                !n.read ? 'bg-primary/5' : ''
              }`}
            >
              {/* Event Badge Icon */}
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm shrink-0 ${getEventBadgeClass(
                  n.type
                )}`}
              >
                {getEventIcon(n.type)}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-gray-900 truncate pr-2">
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-gray-600 leading-normal line-clamp-2">
                  {n.body}
                </p>
                <div className="flex items-center justify-between pt-1">
                  {n.link_url ? (
                    <Link
                      href={n.link_url}
                      className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      View task ↗
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-[9px] text-gray-400 font-medium">
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default NotificationPanel;
