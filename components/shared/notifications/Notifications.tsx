// components/notifications/Notifications.tsx
import React, { useEffect, useMemo } from "react";
import { useNotifications } from "@/hooks/useNotification";
import { useNotificationStore } from "@/stores/ui/notif-store";
import NotificationBadge from "@/components/shared/notifications/NotificationBadge";
import NotificationDropdown from "@/components/shared/notifications/NotificationDropdown";
import type { LazyNotificationProps } from "@/hooks/useNotification";
import {
  NOTIFICATIONS_LOAD_LIMIT as LIMIT,
  NOTIFICATIONS_BATCH_LIMIT as BATCH_LIMIT,
  NOTIFICATIONS_REFRESH_INTERVAL as INTERVAL,
} from "@/lib/constants/limits";

type ExtendedNotificationProps = LazyNotificationProps & {
  onViewAll?: () => void;
};

export default function Notifications({
  userId,
  limit = LIMIT,
  autoRefresh = true,
  refreshInterval = INTERVAL,
  batchSize = BATCH_LIMIT,
  onViewAll,
}: ExtendedNotificationProps) {
  // Zustand store for UI state and preferences
  const {
    isOpen,
    toggleDropdown,
    closeDropdown,
    setHasNewNotifications,
    setLastNotificationTime,
  } = useNotificationStore();

  // Keep the useNotifications hook for data operations
  const {
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
    fetchNewNotifications, // New method from optimized hook
  } = useNotifications({
    userId,
    limit,
    autoRefresh,
    refreshInterval,
    batchSize,
  });

  // Memoize the latest unread notification for better performance
  const latestUnreadNotification = useMemo(() => {
    return notifications.find((notification) => !notification.isRead) || null;
  }, [notifications]);

  // Enhanced new notification detection
  useEffect(() => {
    if (latestUnreadNotification) {
      const notificationTime = new Date(
        latestUnreadNotification.createdAt
      ).getTime();
      const isRecentNotification = Date.now() - notificationTime < 60000; // Within last minute

      // Check if this is actually a new notification we haven't seen before
      const isNewNotification =
        isRecentNotification && !latestUnreadNotification.isRead;

      if (isNewNotification) {
        setHasNewNotifications(true);
        setLastNotificationTime(notificationTime);

        // Auto-clear the "new" indicator after a few seconds
        const timer = setTimeout(() => {
          setHasNewNotifications(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [
    latestUnreadNotification,
    setHasNewNotifications,
    setLastNotificationTime,
  ]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setHasNewNotifications(false);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsRead(notificationId);
  };

  const handleRemoveNotification = async (notificationId: number) => {
    await removeNotification(notificationId);
  };

  const handleLoadMore = async () => {
    await loadMoreNotifications();
  };

  const handleBadgeClick = () => {
    toggleDropdown();
    // Clear new notification indicator when opening
    if (!isOpen) {
      setHasNewNotifications(false);
    }
  };

  // Enhanced refresh that can use the optimized polling
  const handleRefresh = async () => {
    if (notifications.length > 0) {
      // If we have notifications, try the optimized fetch first
      await fetchNewNotifications();
    } else {
      // If no notifications, do a full refresh
      refresh();
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <NotificationBadge
        count={unreadCount}
        onClick={handleBadgeClick}
        isOpen={isOpen}
      />

      {/* Notification Dropdown */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMoreNotifications={hasMoreNotifications}
          error={error}
          onClose={closeDropdown}
          onMarkAllAsRead={handleMarkAllAsRead}
          onMarkAsRead={handleMarkAsRead}
          onRemoveNotification={handleRemoveNotification}
          onRefresh={handleRefresh} // Use the enhanced refresh
          onLoadMore={handleLoadMore}
          onViewAll={onViewAll}
        />
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={closeDropdown} />}
    </div>
  );
}
