// hooks/useNotification.ts - Ultra-optimized version
import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationWithRelations, NotificationProps } from "@/types";
import {
  getAllNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotifications,
  // New optimized methods
  getUnreadNotificationsSince,
  hasNewNotificationsSince,
  getUnreadCountWithTimestamp,
} from "@/lib/actions/notifications";

export interface LazyNotificationProps extends NotificationProps {
  batchSize?: number;
}

export function useNotifications({
  userId,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
  batchSize = 10,
}: LazyNotificationProps) {
  const [notifications, setNotifications] = useState<
    NotificationWithRelations[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);

  // Track timestamps for optimized polling
  const lastPollTimestamp = useRef<Date | null>(null);
  const mostRecentNotificationTimestamp = useRef<Date | null>(null);
  const isInitialLoad = useRef(true);

  // Initial fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [notificationsResponse, countData] = await Promise.all([
        getAllNotifications(userId!, batchSize),
        getUnreadCountWithTimestamp(userId!),
      ]);

      setNotifications(notificationsResponse.notifications);
      setUnreadCount(countData.count);

      // Track timestamps
      if (notificationsResponse.notifications.length > 0) {
        mostRecentNotificationTimestamp.current = new Date(
          notificationsResponse.notifications[0].createdAt
        );
      }
      lastPollTimestamp.current = new Date();

      setHasMoreNotifications(
        notificationsResponse.notifications.length === batchSize
      );

      isInitialLoad.current = false;
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

  // Ultra-optimized polling - minimal database hits
  const fetchNewNotifications = useCallback(async () => {
    if (isInitialLoad.current || !lastPollTimestamp.current) return;

    try {
      setError(null);

      // First, do a very lightweight check if there are any new notifications
      const hasNew = await hasNewNotificationsSince(
        userId!,
        lastPollTimestamp.current
      );

      if (!hasNew) {
        // No new notifications, update poll timestamp and return
        lastPollTimestamp.current = new Date();
        return;
      }

      // There are new notifications, fetch them
      const newNotificationsResponse = await getUnreadNotificationsSince(
        userId!,
        lastPollTimestamp.current,
        50 // Get more to ensure we don't miss any
      );

      if (newNotificationsResponse.notifications.length > 0) {
        // Add new notifications to the beginning and remove duplicates
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newNotifications =
            newNotificationsResponse.notifications.filter(
              (n) => !existingIds.has(n.id)
            );

          return [...newNotifications, ...prev];
        });

        // Update unread count
        const currentCountData = await getUnreadCountWithTimestamp(userId!);
        setUnreadCount(currentCountData.count);

        // Update most recent timestamp
        mostRecentNotificationTimestamp.current = new Date(
          newNotificationsResponse.notifications[0].createdAt
        );
      }

      // Update poll timestamp
      lastPollTimestamp.current = new Date();
    } catch (err) {
      console.error("[useNotifications] Error in optimized polling:", err);
      // Fallback to simple count check on error
      try {
        const currentCount = await getUnreadNotificationCount(userId!);
        if (currentCount !== unreadCount) {
          setUnreadCount(currentCount);
        }
      } catch (fallbackErr) {
        console.error(
          "[useNotifications] Fallback polling also failed:",
          fallbackErr
        );
      }
    }
  }, [userId, unreadCount]);

  // Load more notifications (unchanged but optimized)
  const loadMoreNotifications = useCallback(async () => {
    if (isLoadingMore || !hasMoreNotifications || isLoading) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const moreNotificationsResponse = await getAllNotifications(
        userId!,
        batchSize,
        notifications.length
      );
      const moreNotifications = moreNotificationsResponse.notifications;

      if (moreNotifications.length > 0) {
        setNotifications((prev) => [...prev, ...moreNotifications]);
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

  // Optimistic mark as read
  const markAsRead = useCallback(
    async (notificationId: number) => {
      // Optimistic update first
      const notification = notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.isRead;

      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        const result = await markNotificationsAsRead([notificationId]);

        if (!result.success) {
          // Revert optimistic update on failure
          if (wasUnread) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notificationId ? { ...n, isRead: false } : n
              )
            );
            setUnreadCount((prev) => prev + 1);
          }
          setError(result.error || "Failed to mark as read");
        }
      } catch (err) {
        // Revert optimistic update on error
        if (wasUnread) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: false } : n
            )
          );
          setUnreadCount((prev) => prev + 1);
        }
        console.error(
          "[useNotifications] Error marking notification as read:",
          err
        );
        setError("Failed to mark notification as read");
      }
    },
    [notifications]
  );

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);

    try {
      const result = await markAllNotificationsAsRead(userId!);

      if (!result.success) {
        // Revert on failure
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        setError(result.error || "Failed to mark all as read");
      }
    } catch (err) {
      // Revert on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      console.error(
        "[useNotifications] Error marking all notifications as read:",
        err
      );
      setError("Failed to mark all notifications as read");
    }
  }, [userId, notifications, unreadCount]);

  // Remove notification with optimistic update
  const removeNotification = useCallback(
    async (notificationId: number) => {
      const notification = notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.isRead;

      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        const result = await deleteNotifications([notificationId]);

        if (!result.success) {
          // Revert on failure
          if (notification) {
            setNotifications((prev) => [notification, ...prev]);
            if (wasUnread) {
              setUnreadCount((prev) => prev + 1);
            }
          }
          setError(result.error || "Failed to remove notification");
        }
      } catch (err) {
        // Revert on error
        if (notification) {
          setNotifications((prev) => [notification, ...prev]);
          if (wasUnread) {
            setUnreadCount((prev) => prev + 1);
          }
        }
        console.error("[useNotifications] Error removing notification:", err);
        setError("Failed to remove notification");
      }
    },
    [notifications]
  );

  // Full refresh - use sparingly
  const refresh = useCallback(() => {
    setNotifications([]);
    setHasMoreNotifications(true);
    lastPollTimestamp.current = null;
    mostRecentNotificationTimestamp.current = null;
    isInitialLoad.current = true;
    fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Ultra-optimized auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNewNotifications();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, fetchNewNotifications]);

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
    fetchNewNotifications,
  };
}

// Simplified unread count hook
export function useUnreadCount(userId: string, refreshInterval = 30000) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const unreadCount = await getUnreadNotificationCount(userId);
      setCount(unreadCount);
    } catch (err) {
      console.error("[useUnreadCount] Error fetching unread count:", err);
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
