// components/notifications/NotificationDropdown.tsx
import React from "react";
import { X, Bell } from "lucide-react";
import { NotificationWithRelations } from "@/types";
import NotificationItem from "./NotificationItem";

interface NotificationDropdownProps {
  notifications: NotificationWithRelations[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: number) => void;
  onRemoveNotification: (id: number) => void;
  onRefresh: () => void;
  onViewAll?: () => void;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  error,
  onClose,
  onMarkAllAsRead,
  onMarkAsRead,
  onRemoveNotification,
  onRefresh,
  onViewAll,
}: NotificationDropdownProps) {
  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              disabled={isLoading}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && notifications.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {!isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onRemove={onRemoveNotification}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            onClick={() => {
              onClose();
              onViewAll?.();
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
