// lib/actions/notif-actions.ts
"use server";

import { NotificationService } from "@/lib/services/notification";
import { NotificationWithRelations, NotificationResponse } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Get unread notifications for the current user
 */
export async function getUnreadNotifications(
  userId: string,
  limit: number = 20
): Promise<NotificationWithRelations[]> {
  try {
    const notifications = await NotificationService.getUnreadNotifications(
      userId,
      limit
    );

    return notifications.map((notification: any) => ({
      ...notification,
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to get unread notifications:", error);
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
    console.error("Failed to get all notifications:", error);
    return {
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
    };
  }
}

/**
 * Mark specific notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await NotificationService.markAsRead(notificationIds);

    // Revalidate paths that might show notification states
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return {
      success: false,
      error: "Failed to mark notifications as read",
    };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await NotificationService.markAllAsRead(userId);

    // Revalidate paths that might show notification states
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return {
      success: false,
      error: "Failed to mark all notifications as read",
    };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  try {
    return await NotificationService.getUnreadCount(userId);
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
}

/**
 * Delete specific notifications
 */
export async function deleteNotifications(
  notificationIds: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await NotificationService.deleteNotifications(notificationIds);

    // Revalidate paths that might show notification states
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete notifications:", error);
    return {
      success: false,
      error: "Failed to delete notifications",
    };
  }
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string) {
  try {
    return await NotificationService.getNotificationStats(userId);
  } catch (error) {
    console.error("Failed to get notification stats:", error);
    return {};
  }
}
