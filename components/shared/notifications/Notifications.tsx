// components/notifications/Notifications.tsx
import React, { useState } from "react";
import { useNotifications } from "@/hooks/useNotification";
import NotificationBadge from "./NotificationBadge";
import NotificationDropdown from "./NotificationDropdown";
import type { LazyNotificationProps } from "@/hooks/useNotification";

type ExtendedNotificationProps = LazyNotificationProps & {
  onViewAll?: () => void;
};

export default function Notifications({
  userId,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
  batchSize = 5,
  onViewAll,
}: ExtendedNotificationProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
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

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <NotificationBadge
        count={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
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
          onClose={handleClose}
          onMarkAllAsRead={handleMarkAllAsRead}
          onMarkAsRead={handleMarkAsRead}
          onRemoveNotification={handleRemoveNotification}
          onRefresh={refresh}
          onLoadMore={handleLoadMore}
          onViewAll={onViewAll}
        />
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={handleClose} />}
    </div>
  );
}
