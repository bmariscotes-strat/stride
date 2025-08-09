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
      className={`flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 ${
        isOpen ? "bg-gray-100 text-gray-900" : ""
      }`}
      aria-label="Notifications"
    >
      <span className="relative inline-flex">
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-[4px] -right-[4px] flex items-center justify-center w-3 h-3 text-xs font-bold text-white bg-red-500 rounded-full">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
    </button>
  );
}
