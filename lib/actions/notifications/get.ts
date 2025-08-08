"use server";

import { NotificationService } from "@/lib/services/notification";
import { NotificationWithRelations, NotificationResponse } from "@/types";

/**
 * Get unread notifications for the current user
 */
export async function getUnreadNotifications(
  userId: string | null,
  limit: number = 20
): Promise<NotificationWithRelations[]> {
  console.log("[getUnreadNotifications] called with:", { userId, limit });

  try {
    const notifications = await NotificationService.getUnreadNotifications(
      userId!,
      limit
    );
    const result = notifications.map((notification: any) => ({
      ...notification,
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    }));
    return result;
  } catch (error) {
    console.error("[getUnreadNotifications] Failed:", error);
    return [];
  }
}

/**
 * Get all notifications for the current user with pagination
 */
export async function getAllNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationResponse> {
  console.log("[getAllNotifications] called with:", { userId, limit, offset });

  try {
    const [notifications, unreadCount] = await Promise.all([
      NotificationService.getAllNotifications(userId, limit, offset),
      NotificationService.getUnreadCount(userId),
    ]);
    const formattedNotifications = notifications.map((notification: any) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    }));

    return {
      notifications: formattedNotifications,
      unreadCount,
      totalCount: formattedNotifications.length,
    };
  } catch (error) {
    console.error("[getAllNotifications] Failed:", error);
    return {
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
    };
  }
}
