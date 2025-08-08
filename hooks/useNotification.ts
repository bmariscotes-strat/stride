// hooks/use-notifications.ts
import { useState, useEffect, useCallback } from "react";
import { NotificationWithRelations } from "@/types";
import {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotifications,
} from "@/lib/actions/notif-actions";

interface UseNotificationsOptions {
  userId: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useNotifications({
  userId,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<
    NotificationWithRelations[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [notificationsData, count] = await Promise.all([
        getUnreadNotifications(userId, limit),
        getUnreadNotificationCount(userId),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (err) {
      setError("Failed to fetch notifications");
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const result = await markNotificationsAsRead([notificationId]);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        setError(result.error || "Failed to mark as read");
      }
    } catch (err) {
      setError("Failed to mark notification as read");
      console.error("Error marking notification as read:", err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await markAllNotificationsAsRead(userId);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
      } else {
        setError(result.error || "Failed to mark all as read");
      }
    } catch (err) {
      setError("Failed to mark all notifications as read");
      console.error("Error marking all notifications as read:", err);
    }
  }, [userId]);

  // Remove notification
  const removeNotification = useCallback(
    async (notificationId: number) => {
      try {
        const result = await deleteNotifications([notificationId]);

        if (result.success) {
          const wasUnread =
            notifications.find((n) => n.id === notificationId)?.isRead ===
            false;

          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== notificationId)
          );

          if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        } else {
          setError(result.error || "Failed to remove notification");
        }
      } catch (err) {
        setError("Failed to remove notification");
        console.error("Error removing notification:", err);
      }
    },
    [notifications]
  );

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refresh,
  };
}

// Hook for just getting unread count (useful for badges)
export function useUnreadCount(userId: string, refreshInterval = 30000) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const unreadCount = await getUnreadNotificationCount(userId);
      setCount(unreadCount);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCount();

    const interval = setInterval(fetchCount, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchCount, refreshInterval]);

  return { count, isLoading, refresh: fetchCount };
}
