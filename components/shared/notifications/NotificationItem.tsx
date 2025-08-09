import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Calendar,
  Users,
  UserCog,
  Bell,
  Check,
} from "lucide-react";
import { NotificationWithRelations } from "@/types";
import {
  formatTimeAgo,
  getNotificationUrlById,
} from "@/lib/utils/notif-helper";

interface NotificationItemProps {
  notification: NotificationWithRelations;
  onMarkAsRead: (id: number) => Promise<void> | void;
  onRemove: (id: number) => void;
  onClose?: () => void; // Add close function prop
  fetchSlugs: (
    teamId: string,
    projectId?: string
  ) => Promise<{ teamSlug: string; projectSlug?: string }>;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
  onClose,
  fetchSlugs,
}: NotificationItemProps) {
  const [notificationUrl, setNotificationUrl] = useState("#");

  useEffect(() => {
    async function fetchUrl() {
      const url = await getNotificationUrlById(notification, fetchSlugs);
      setNotificationUrl(url);
    }

    fetchUrl();
  }, [notification, fetchSlugs]);

  const handleLinkClick = () => {
    // Mark as read when clicking the link (happens before navigation)
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    // Close the notifications dropdown
    if (onClose) {
      onClose();
    }
  };

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
      case "team_role_changed":
        return <UserCog className={`${iconClass} text-amber-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  return (
    <Link
      href={notificationUrl}
      onClick={handleLinkClick}
      className={`relative flex items-start p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        !notification.isRead ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
      }`}
    >
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}

      <div className="flex-shrink-0 mr-3 mt-1 ml-2">
        {getNotificationIcon(notification.type)}
      </div>

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
              <p
                className={`text-sm mt-1 ${
                  !notification.isRead ? "text-gray-800" : "text-gray-600"
                }`}
              >
                {notification.message}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <p
                className={`text-xs ${
                  !notification.isRead ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {formatTimeAgo(notification.createdAt)}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  !notification.isRead
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {notification.isRead ? "Read" : "Unread"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {!notification.isRead && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="flex items-center justify-center w-7 h-7 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(notification.id);
              }}
              className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Remove notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
