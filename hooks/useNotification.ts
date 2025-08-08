// hooks/useNotification.ts
import { useState, useEffect, useCallback } from "react";
import { NotificationWithRelations, NotificationProps } from "@/types";
import {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotifications,
} from "@/lib/actions/notifications";

export function useNotifications({
  userId,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
}: NotificationProps) {
  const [notifications, setNotifications] = useState<
    NotificationWithRelations[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("[useNotifications] Initialized with:", {
    userId,
    limit,
    autoRefresh,
    refreshInterval,
  });

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    console.log("[useNotifications] Fetching notifications...");
    try {
      setIsLoading(true);
      setError(null);

      const [notificationsData, count] = await Promise.all([
        getUnreadNotifications(userId, limit),
        getUnreadNotificationCount(userId!),
      ]);

      console.log("[useNotifications] Fetched data:", {
        notificationsData,
        count,
      });

      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (err) {
      console.error("[useNotifications] Error fetching notifications:", err);
      setError("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    console.log(`[useNotifications] Marking as read: ${notificationId}`);
    try {
      const result = await markNotificationsAsRead([notificationId]);
      console.log("[useNotifications] Mark as read result:", result);

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
      console.error(
        "[useNotifications] Error marking notification as read:",
        err
      );
      setError("Failed to mark notification as read");
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    console.log("[useNotifications] Marking all notifications as read...");
    try {
      const result = await markAllNotificationsAsRead(userId!);
      console.log("[useNotifications] Mark all as read result:", result);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
      } else {
        setError(result.error || "Failed to mark all as read");
      }
    } catch (err) {
      console.error(
        "[useNotifications] Error marking all notifications as read:",
        err
      );
      setError("Failed to mark all notifications as read");
    }
  }, [userId]);

  // Remove notification
  const removeNotification = useCallback(
    async (notificationId: number) => {
      console.log(
        `[useNotifications] Removing notification: ${notificationId}`
      );
      try {
        const result = await deleteNotifications([notificationId]);
        console.log("[useNotifications] Remove notification result:", result);

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
        console.error("[useNotifications] Error removing notification:", err);
        setError("Failed to remove notification");
      }
    },
    [notifications]
  );

  // Refresh notifications
  const refresh = useCallback(() => {
    console.log("[useNotifications] Manual refresh triggered.");
    fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    console.log("[useNotifications] Initial fetch on mount.");
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    console.log(
      `[useNotifications] Auto-refresh enabled: every ${refreshInterval}ms`
    );

    const interval = setInterval(() => {
      console.log("[useNotifications] Auto-refresh tick.");
      fetchNotifications();
    }, refreshInterval);

    return () => {
      console.log("[useNotifications] Cleaning up auto-refresh interval.");
      clearInterval(interval);
    };
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

  console.log("[useUnreadCount] Initialized with:", {
    userId,
    refreshInterval,
  });

  const fetchCount = useCallback(async () => {
    console.log("[useUnreadCount] Fetching unread count...");
    try {
      const unreadCount = await getUnreadNotificationCount(userId);
      console.log("[useUnreadCount] Unread count fetched:", unreadCount);
      setCount(unreadCount);
    } catch (err) {
      console.error("[useUnreadCount] Error fetching unread count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    console.log("[useUnreadCount] Initial fetch on mount.");
    fetchCount();

    const interval = setInterval(() => {
      console.log("[useUnreadCount] Auto-refresh tick.");
      fetchCount();
    }, refreshInterval);

    return () => {
      console.log("[useUnreadCount] Cleaning up auto-refresh interval.");
      clearInterval(interval);
    };
  }, [fetchCount, refreshInterval]);

  return { count, isLoading, refresh: fetchCount };
}
