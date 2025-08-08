// components/notifications/NotificationBadge.tsx
import React from "react";
import { Bell } from "lucide-react";

interface NotificationBadgeProps {
  count: number;
  onClick: () => void;
  isOpen: boolean;
}

export default function NotificationBadge({
  count,
  onClick,
  isOpen,
}: NotificationBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 ${
        isOpen ? "bg-gray-100 text-gray-900" : ""
      }`}
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold text-white bg-red-500 rounded-full px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
