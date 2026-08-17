import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from '@/utils/toast';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from '@/store/apiSlice';

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number;
  type: string;
  title: string;
  body: string;
  link_url: string;
  task_id: string;
  read: boolean;
  created_at: string;
}

export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // RTK Query Hooks
  const { data, refetch } = useGetNotificationsQuery(undefined, { skip: !token });
  const [markAllNotificationsAsRead] = useMarkAllNotificationsAsReadMutation();
  const [markNotificationAsRead] = useMarkNotificationAsReadMutation();

  // Update local state when RTK Query returns initial list
  useEffect(() => {
    if (data) {
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unread_count || 0));
    }
  }, [data]);

  // Request browser OS notification permissions ONLY when authenticated.
  // We defer by 1 second to ensure the token is truly from a logged-in session
  // and never fire this on login/signup pages.
  useEffect(() => {
    if (!token) return; // no token → user is not logged in, skip completely

    // Extra safety: check that the token is actually stored (not a stale render)
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!storedToken) return;

    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) return;
    if (window.Notification.permission !== 'default') return; // already decided

    // Delay request slightly so that auth pages that briefly render Layout
    // don't accidentally trigger the prompt before the user has actually logged in.
    const timerId = window.setTimeout(() => {
      // Re-check token still present after the delay (user didn't log out)
      const stillLoggedIn = !!localStorage.getItem('access_token');
      if (stillLoggedIn && window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [token]);

  // Show OS level system notification
  const triggerOSNotification = useCallback((title: string, body: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico', // fallback icon
        });
      } catch (e) {
        console.error('Error triggering OS Notification:', e);
      }
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    if (!token) return;

    // Setup Server-Sent Events stream connection relatively through proxy rewrite matching current host/tunnel
    const currentHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    const streamUrl = `${protocol}//${currentHost}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const n: Notification = JSON.parse(event.data);
        if (n.type === 'connected') return;

        // Add to notification list state
        setNotifications((prev) => [n, ...prev].slice(0, 50));
        setUnreadCount((prev) => prev + 1);

        // Trigger rich browser toast & OS Notification
        toast.info(n.title + ': ' + n.body);
        triggerOSNotification(n.title, n.body);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    es.onerror = (err) => {
      // Normal event stream cycle. EventSource automatically reconnects in the background.
      console.debug('SSE connection closed. Reconnecting...');
    };

    return () => {
      es.close();
    };
  }, [token, triggerOSNotification]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsAsRead().unwrap();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark notifications as read');
    }
  }, [token, markAllNotificationsAsRead]);

  const [permission, setPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      setPermission(window.Notification.permission);
    }
  }, [token]);

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      const p = await window.Notification.requestPermission();
      setPermission(p);
      if (p === 'granted') {
        toast.success('Desktop notifications enabled!');
      } else {
        toast.error('Notification permission denied');
      }
    } else {
      toast.error('Desktop notifications not supported in this browser');
    }
  }, []);

  // Mark specific notification as read
  const markAsRead = useCallback(async (id: number) => {
    if (!token) return;
    try {
      await markNotificationAsRead(id).unwrap();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, [token, markNotificationAsRead]);

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAllAsRead,
    markAsRead,
    permission,
    requestPermission,
    refetch,
  };
}
