// components/notifications/Notifications.tsx
import React, { useEffect } from "react";
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
  } = useNotifications({
    userId,
    limit,
    autoRefresh,
    refreshInterval,
    batchSize,
  });

  // Track new notifications for animations/badges
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      const isNewNotification =
        latestNotification &&
        !latestNotification.isRead &&
        Date.now() - new Date(latestNotification.createdAt).getTime() < 60000; // Within last minute

      if (isNewNotification) {
        setHasNewNotifications(true);
        setLastNotificationTime(Date.now());

        // Auto-clear the "new" indicator after a few seconds
        const timer = setTimeout(() => {
          setHasNewNotifications(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [notifications, setHasNewNotifications, setLastNotificationTime]);

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
          onRefresh={refresh}
          onLoadMore={handleLoadMore}
          onViewAll={onViewAll}
        />
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={closeDropdown} />}
    </div>
  );
}
