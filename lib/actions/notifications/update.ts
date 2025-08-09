// lib/actions/notifications/update.ts

"use server";

import { NotificationService } from "@/lib/services/notification";
import { revalidatePath } from "next/cache";

/**
 * Mark specific notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await NotificationService.markAsRead(notificationIds);
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("[markNotificationsAsRead] Failed:", error);
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
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsAsRead] Failed:", error);
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
    const count = await NotificationService.getUnreadCount(userId);
    return count;
  } catch (error) {
    console.error("[getUnreadNotificationCount] Failed:", error);
    return 0;
  }
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string) {
  try {
    const stats = await NotificationService.getNotificationStats(userId);
    return stats;
  } catch (error) {
    console.error("[getNotificationStats] Failed:", error);
    return {};
  }
}
