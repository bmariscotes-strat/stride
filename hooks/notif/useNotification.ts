// hooks/useNotification.ts - Updated with WebSocket integration
import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationWithRelations, NotificationProps } from "@/types";
import { getAllNotifications } from "@/lib/actions/notifications";
import { useNotificationSocket } from "@/hooks/notif/useNotificationSocket";

// Extended props for WebSocket integration
export interface LazyNotificationProps extends NotificationProps {
  batchSize?: number; // How many notifications to load at once
  useWebSocket?: boolean; // Enable WebSocket functionality
}

export function useNotifications({
  userId,
  limit = 20,
  autoRefresh = false,
  refreshInterval = 30000,
  batchSize = 10,
  useWebSocket = true,
}: LazyNotificationProps) {
  const [notifications, setNotifications] = useState<
    NotificationWithRelations[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);

  const initialFetchDone = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket integration
  const {
    isConnected: socketConnected,
    error: socketError,
    markAsRead: socketMarkAsRead,
    markAllAsRead: socketMarkAllAsRead,
    removeNotification: socketRemoveNotification,
    onNotificationReceived,
    onNotificationUpdated,
    onNotificationDeleted,
    onBulkRead,
    onUnreadCountUpdated,
  } = useNotificationSocket({
    userId,
    enabled: useWebSocket,
    autoConnect: useWebSocket,
  });

  // Initial fetch notifications
  const fetchNotifications = useCallback(
    async (resetState = false) => {
      try {
        if (resetState) {
          setIsLoading(true);
        }
        setError(null);

        const notificationsResponse = await getAllNotifications(
          userId!,
          batchSize
        );

        setNotifications(notificationsResponse.notifications);
        setUnreadCount(notificationsResponse.unreadCount);
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
        initialFetchDone.current = true;
      }
    },
    [userId, batchSize]
  );

  // Load more notifications for lazy loading
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

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        if (useWebSocket && socketConnected) {
          // Use WebSocket for real-time update
          socketMarkAsRead(notificationId);
        } else {
          // Fallback to API call
          const { markNotificationsAsRead } = await import(
            "@/lib/actions/notifications"
          );
          const result = await markNotificationsAsRead([notificationId]);

          if (result.success) {
            setNotifications((prev) =>
              prev.map((notification) =>
                notification.id === notificationId
                  ? { ...notification, isRead: true }
                  : notification
              )
            );

            const wasUnread =
              notifications.find((n) => n.id === notificationId)?.isRead ===
              false;
            if (wasUnread) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          } else {
            setError(result.error || "Failed to mark as read");
          }
        }
      } catch (err) {
        console.error(
          "[useNotifications] Error marking notification as read:",
          err
        );
        setError("Failed to mark notification as read");
      }
    },
    [useWebSocket, socketConnected, socketMarkAsRead, notifications]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      if (useWebSocket && socketConnected) {
        // Use WebSocket for real-time update
        socketMarkAllAsRead();
      } else {
        // Fallback to API call
        const { markAllNotificationsAsRead } = await import(
          "@/lib/actions/notifications"
        );
        const result = await markAllNotificationsAsRead(userId!);

        if (result.success) {
          setNotifications((prev) =>
            prev.map((notification) => ({ ...notification, isRead: true }))
          );
          setUnreadCount(0);
        } else {
          setError(result.error || "Failed to mark all as read");
        }
      }
    } catch (err) {
      console.error(
        "[useNotifications] Error marking all notifications as read:",
        err
      );
      setError("Failed to mark all notifications as read");
    }
  }, [useWebSocket, socketConnected, socketMarkAllAsRead, userId]);

  // Remove notification
  const removeNotification = useCallback(
    async (notificationId: number) => {
      try {
        if (useWebSocket && socketConnected) {
          // Use WebSocket for real-time update
          socketRemoveNotification(notificationId);
        } else {
          // Fallback to API call
          const { deleteNotifications } = await import(
            "@/lib/actions/notifications"
          );
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
        }
      } catch (err) {
        console.error("[useNotifications] Error removing notification:", err);
        setError("Failed to remove notification");
      }
    },
    [useWebSocket, socketConnected, socketRemoveNotification, notifications]
  );

  // Refresh notifications (reset everything)
  const refresh = useCallback(() => {
    setNotifications([]);
    setHasMoreNotifications(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!useWebSocket || !socketConnected) return;

    const unsubscribers: (() => void)[] = [];

    // Listen for new notifications
    const unsubscribeNew = onNotificationReceived((notification: any) => {
      console.log(
        "[useNotifications] New notification received:",
        notification
      );

      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        // Add new notification at the beginning
        return [notification, ...prev];
      });

      // Update unread count will be handled by onUnreadCountUpdated
    });
    unsubscribers.push(unsubscribeNew);

    // Listen for notification updates (mark as read)
    const unsubscribeUpdated = onNotificationUpdated(
      (notificationId: any, updates: any) => {
        console.log(
          "[useNotifications] Notification updated:",
          notificationId,
          updates
        );

        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, ...updates }
              : notification
          )
        );
      }
    );
    unsubscribers.push(unsubscribeUpdated);

    // Listen for notification deletions
    const unsubscribeDeleted = onNotificationDeleted((notificationId: any) => {
      console.log("[useNotifications] Notification deleted:", notificationId);

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
    });
    unsubscribers.push(unsubscribeDeleted);

    // Listen for bulk read operations
    const unsubscribeBulkRead = onBulkRead((affectedUserId: any) => {
      console.log("[useNotifications] Bulk read for user:", affectedUserId);

      if (affectedUserId === userId) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, isRead: true }))
        );
      }
    });
    unsubscribers.push(unsubscribeBulkRead);

    // Listen for unread count updates
    const unsubscribeCountUpdated = onUnreadCountUpdated((count: any) => {
      console.log("[useNotifications] Unread count updated:", count);
      setUnreadCount(count);
    });
    unsubscribers.push(unsubscribeCountUpdated);

    // Cleanup function
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    useWebSocket,
    socketConnected,
    userId,
    onNotificationReceived,
    onNotificationUpdated,
    onNotificationDeleted,
    onBulkRead,
    onUnreadCountUpdated,
  ]);

  // Set up traditional polling as fallback
  useEffect(() => {
    if (useWebSocket && socketConnected) {
      // Clear any existing polling when WebSocket is active
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Use traditional polling when WebSocket is not available
    if (!autoRefresh || !initialFetchDone.current) return;

    pollingIntervalRef.current = setInterval(() => {
      console.log(
        "[useNotifications] Polling for updates (WebSocket unavailable)"
      );
      refresh();
    }, refreshInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [useWebSocket, socketConnected, autoRefresh, refreshInterval, refresh]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications(true);
    }
  }, [userId, fetchNotifications]);

  // Combine socket and fetch errors
  const combinedError = error || (useWebSocket ? socketError : null);

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMoreNotifications,
    error: combinedError,
    isConnected: useWebSocket ? socketConnected : true, // Always true for non-WebSocket mode
    markAsRead,
    markAllAsRead,
    removeNotification,
    loadMoreNotifications,
    refresh,
  };
}

// Simplified hook for just getting unread count
export function useUnreadCount(
  userId: string,
  refreshInterval = 30000,
  useWebSocket = true
) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  console.log("[useUnreadCount] Initialized with:", {
    userId,
    refreshInterval,
    useWebSocket,
  });

  // WebSocket integration
  const { isConnected: socketConnected, onUnreadCountUpdated } =
    useNotificationSocket({
      userId,
      enabled: useWebSocket,
      autoConnect: useWebSocket,
    });

  const fetchCount = useCallback(async () => {
    console.log("[useUnreadCount] Fetching unread count...");
    try {
      const { getUnreadNotificationCount } = await import(
        "@/lib/actions/notifications"
      );
      const unreadCount = await getUnreadNotificationCount(userId);
      console.log("[useUnreadCount] Unread count fetched:", unreadCount);
      setCount(unreadCount);
    } catch (err) {
      console.error("[useUnreadCount] Error fetching unread count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // WebSocket listener for real-time count updates
  useEffect(() => {
    if (!useWebSocket || !socketConnected) return;

    const unsubscribe = onUnreadCountUpdated((newCount: any) => {
      console.log("[useUnreadCount] Real-time count update:", newCount);
      setCount(newCount);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [useWebSocket, socketConnected, onUnreadCountUpdated]);

  // Traditional polling fallback
  useEffect(() => {
    if (useWebSocket && socketConnected) {
      // Clear polling when WebSocket is active
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Initial fetch and polling setup
    console.log("[useUnreadCount] Setting up polling (WebSocket unavailable)");
    fetchCount();

    pollingIntervalRef.current = setInterval(() => {
      console.log("[useUnreadCount] Polling for count update");
      fetchCount();
    }, refreshInterval);

    return () => {
      if (pollingIntervalRef.current) {
        console.log("[useUnreadCount] Cleaning up polling interval");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchCount, refreshInterval, useWebSocket, socketConnected]);

  return {
    count,
    isLoading,
    refresh: fetchCount,
    isConnected: useWebSocket ? socketConnected : true,
  };
}
