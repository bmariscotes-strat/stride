// components/notifications/index.ts
export { default as Notifications } from "./Notifications";
export { default as NotificationBadge } from "./NotificationBadge";
export { default as NotificationItem } from "./NotificationItem";
export { default as NotificationDropdown } from "./NotificationDropdown";

// Re-export hooks and utilities
export { useNotifications, useUnreadCount } from "@/hooks/useNotification";
export { formatTimeAgo } from "@/lib/utils/notif-helper";

// Re-export types
export type {
  NotificationType,
  NotificationWithRelations,
  NotificationResponse,
} from "@/types";
