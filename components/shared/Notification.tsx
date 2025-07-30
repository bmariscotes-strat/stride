import React, { useState } from "react";
import {
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  UserPlus,
  Calendar,
  Users,
} from "lucide-react";

// Types
type NotificationType =
  | "task_assigned"
  | "task_updated"
  | "comment_added"
  | "mention"
  | "due_date_reminder"
  | "team_invitation";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  cardId: string | null;
  projectId: string | null;
  isRead: boolean;
  createdAt: string;
}

// Mock data for demonstration
const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "task_assigned",
    title: "New task assigned",
    message: 'You have been assigned to "Fix login bug" in Project Alpha',
    cardId: "card-123",
    projectId: "project-456",
    isRead: false,
    createdAt: "2025-07-30T10:30:00Z",
  },
  {
    id: 2,
    type: "comment_added",
    title: "New comment",
    message: 'Sarah commented on "Update dashboard UI"',
    cardId: "card-789",
    projectId: "project-456",
    isRead: false,
    createdAt: "2025-07-30T09:15:00Z",
  },
  {
    id: 3,
    type: "mention",
    title: "You were mentioned",
    message: "John mentioned you in a comment",
    cardId: "card-101",
    projectId: "project-789",
    isRead: true,
    createdAt: "2025-07-30T08:45:00Z",
  },
  {
    id: 4,
    type: "due_date_reminder",
    title: "Task due soon",
    message: '"Review code changes" is due tomorrow',
    cardId: "card-202",
    projectId: "project-456",
    isRead: false,
    createdAt: "2025-07-29T16:20:00Z",
  },
  {
    id: 5,
    type: "team_invitation",
    title: "Team invitation",
    message: "You have been invited to join Team Beta",
    cardId: null,
    projectId: null,
    isRead: true,
    createdAt: "2025-07-29T14:10:00Z",
  },
];

export default function Notifications() {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  // Get unread notifications count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
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

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Mark notification as read
  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
  };

  // Remove notification
  const removeNotification = (id: number) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-4.5 h-4.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-12 h-12" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1 flex items-center justify-center w-3 h-3 text-[8px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
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
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 mr-3 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            !notification.isRead
                              ? "text-gray-900"
                              : "text-gray-700"
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
                            onClick={() => markAsRead(notification.id)}
                            className="flex items-center justify-center w-6 h-6 text-blue-600 hover:text-blue-800 rounded"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 rounded"
                          title="Remove notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.isRead && (
                      <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
