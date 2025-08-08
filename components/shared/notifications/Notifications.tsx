// components/notifications/Notifications.tsx
import React, { useState } from "react";
import { useNotifications } from "@/hooks/useNotification";
import NotificationBadge from "./NotificationBadge";
import NotificationDropdown from "./NotificationDropdown";

interface NotificationsProps {
  userId: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onViewAll?: () => void;
}

export default function Notifications({
  userId,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000,
  onViewAll,
}: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refresh,
  } = useNotifications({
    userId,
    limit,
    autoRefresh,
    refreshInterval,
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
          error={error}
          onClose={handleClose}
          onMarkAllAsRead={handleMarkAllAsRead}
          onMarkAsRead={handleMarkAsRead}
          onRemoveNotification={handleRemoveNotification}
          onRefresh={refresh}
          onViewAll={onViewAll}
        />
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={handleClose} />}
    </div>
  );
}
