// components/notifications/NotificationItem.tsx
import React from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Calendar,
  Users,
  Bell,
} from "lucide-react";
import { NotificationWithRelations } from "@/types";
import { formatTimeAgo } from "@/lib/utils/notif-helper";

interface NotificationItemProps {
  notification: NotificationWithRelations;
  onMarkAsRead: (id: number) => void;
  onRemove: (id: number) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: NotificationItemProps) {
  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationWithRelations["type"]) => {
    const iconClass = "w-4 h-4 flex-shrink-0";

    switch (type) {
      case "task_assigned":
        return <CheckCircle className={`${iconClass} text-blue-500`} />;
      case "task_updated":
        return <AlertCircle className={`${iconClass} text-orange-500`} />;
      case "comment_added":
        return <MessageCircle className={`${iconClass} text-green-500`} />;
      case "mention":
        return <MessageCircle className={`${iconClass} text-purple-500`} />;
      case "due_date_reminder":
        return <Calendar className={`${iconClass} text-red-500`} />;
      case "team_invitation":
        return <Users className={`${iconClass} text-indigo-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  return (
    <div
      className={`relative flex items-start p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        !notification.isRead ? "bg-blue-50" : ""
      }`}
    >
      {/* Unread Indicator */}
      {!notification.isRead && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}

      {/* Notification Icon */}
      <div className="flex-shrink-0 mr-3 mt-1 ml-2">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${
                !notification.isRead ? "text-gray-900" : "text-gray-700"
              }`}
            >
              {notification.title}
            </p>
            {notification.message && (
              <p className="text-sm text-gray-600 mt-1">
                {notification.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {formatTimeAgo(notification.createdAt)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 ml-2">
            {!notification.isRead && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="flex items-center justify-center w-6 h-6 text-blue-600 hover:text-blue-800 rounded transition-colors"
                title="Mark as read"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onRemove(notification.id)}
              className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Remove notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
