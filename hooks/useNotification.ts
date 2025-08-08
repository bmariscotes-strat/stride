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

// Extended props for lazy loading
export interface LazyNotificationProps extends NotificationProps {
  batchSize?: number; // How many notifications to load at once
}

export function useNotifications({
  userId,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
  batchSize = 10, // Load 10 more notifications each time
}: LazyNotificationProps) {
  const [notifications, setNotifications] = useState<
    NotificationWithRelations[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);

  console.log("[useNotifications] Initialized with:", {
    userId,
    limit,
    autoRefresh,
    refreshInterval,
    batchSize,
  });

  // Initial fetch notifications (using getAllNotifications)
  const fetchNotifications = useCallback(async () => {
    console.log("[useNotifications] Fetching all notifications...");
    try {
      setIsLoading(true);
      setError(null);

      const [notificationsResponse, count] = await Promise.all([
        getAllNotifications(userId!, batchSize), // This returns NotificationResponse
        getUnreadNotificationCount(userId!),
      ]);

      console.log("[useNotifications] Fetched initial data:", {
        notificationsResponse,
        count,
      });

      // Handle the response properly
      setNotifications(notificationsResponse.notifications);
      setUnreadCount(count);

      // If we got fewer notifications than batchSize, there might not be more
      setHasMoreNotifications(
        notificationsResponse.notifications.length === batchSize
      );
    } catch (err) {
      console.error("[useNotifications] Error fetching notifications:", err);
      setError("Failed to fetch notifications");
      setNotifications([]);
      setUnreadCount(0);
      setHasMoreNotifications(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, batchSize]);

  // Load more notifications for lazy loading (using getAllNotifications)
  const loadMoreNotifications = useCallback(async () => {
    if (isLoadingMore || !hasMoreNotifications || isLoading) {
      console.log("[useNotifications] Skip load more:", {
        isLoadingMore,
        hasMoreNotifications,
        isLoading,
      });
      return;
    }

    console.log("[useNotifications] Loading more notifications...");
    setIsLoadingMore(true);

    try {
      // Get all notifications (read + unread) starting from the current length (offset)
      const moreNotificationsResponse = await getAllNotifications(
        userId!,
        batchSize,
        notifications.length
      );

      console.log(
        "[useNotifications] Loaded more response:",
        moreNotificationsResponse
      );

      const moreNotifications = moreNotificationsResponse.notifications;

      console.log("[useNotifications] Loaded more notifications:", {
        count: moreNotifications.length,
        currentLength: notifications.length,
      });

      if (moreNotifications.length > 0) {
        setNotifications((prev) => [...prev, ...moreNotifications]);

        // If we got fewer notifications than requested, we've reached the end
        setHasMoreNotifications(moreNotifications.length === batchSize);
      } else {
        setHasMoreNotifications(false);
      }
    } catch (err) {
      console.error(
        "[useNotifications] Error loading more notifications:",
        err
      );
      setError("Failed to load more notifications");
      setHasMoreNotifications(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    userId,
    batchSize,
    notifications.length,
    isLoadingMore,
    hasMoreNotifications,
    isLoading,
  ]);

  // Mark single notification as read (keeps notification in list)
  const markAsRead = useCallback(
    async (notificationId: number) => {
      console.log(`[useNotifications] Marking as read: ${notificationId}`);
      try {
        const result = await markNotificationsAsRead([notificationId]);
        console.log("[useNotifications] Mark as read result:", result);

        if (result.success) {
          // Update the notification's read status in the list (don't remove it)
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification
            )
          );

          // Only decrease unread count if it was previously unread
          const wasUnread =
            notifications.find((n) => n.id === notificationId)?.isRead ===
            false;
          if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
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
    },
    [notifications]
  );

  // Mark all notifications as read (keeps all notifications in list)
  const markAllAsRead = useCallback(async () => {
    console.log("[useNotifications] Marking all notifications as read...");
    try {
      const result = await markAllNotificationsAsRead(userId!);
      console.log("[useNotifications] Mark all as read result:", result);

      if (result.success) {
        // Update all notifications to read status (don't remove any)
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

  // Refresh notifications (reset everything)
  const refresh = useCallback(() => {
    console.log("[useNotifications] Manual refresh triggered.");
    setNotifications([]);
    setHasMoreNotifications(true);
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
      refresh();
    }, refreshInterval);

    return () => {
      console.log("[useNotifications] Cleaning up auto-refresh interval.");
      clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMoreNotifications,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    loadMoreNotifications,
    refresh,
  };
}

// Hook for just getting unread count (unchanged)
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
