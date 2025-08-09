import React from "react";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/notif/useNotification";

interface NotificationBadgeProps {
  userId: string;
  refreshInterval?: number;
  size?: "sm" | "md" | "lg";
  showZero?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function NotificationBadge({
  userId,
  refreshInterval = 30000,
  size = "md",
  showZero = false,
  onClick,
  className = "",
}: NotificationBadgeProps) {
  const { count, isLoading, refresh } = useUnreadCount(userId, refreshInterval);

  const sizeClasses = {
    sm: {
      bell: "w-4 h-4",
      container: "w-8 h-8",
      badge: "w-4 h-4 text-xs",
      badgePosition: "-top-1 -right-1",
    },
    md: {
      bell: "w-5 h-5",
      container: "w-10 h-10",
      badge: "min-w-5 h-5 text-xs",
      badgePosition: "-top-1 -right-1",
    },
    lg: {
      bell: "w-6 h-6",
      container: "w-12 h-12",
      badge: "min-w-6 h-6 text-sm",
      badgePosition: "-top-2 -right-2",
    },
  };

  const classes = sizeClasses[size];

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    refresh();
  };

  if (isLoading) {
    return (
      <div
        className={`relative flex items-center justify-center ${classes.container} text-gray-400 ${className}`}
      >
        <Bell className={classes.bell} />
        <div className="absolute inset-0 rounded-full animate-pulse bg-gray-200 opacity-50" />
      </div>
    );
  }

  const shouldShowBadge = count > 0 || showZero;

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center justify-center ${classes.container} text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 ${className}`}
      aria-label={`Notifications ${count > 0 ? `(${count} unread)` : ""}`}
    >
      <Bell className={classes.bell} />
      {shouldShowBadge && (
        <span
          className={`absolute ${classes.badgePosition} flex items-center justify-center ${classes.badge} px-1 font-bold text-white rounded-full animate-pulse ${
            count > 0 ? "bg-red-500" : "bg-gray-400"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
