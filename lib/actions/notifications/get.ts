"use server";

import { NotificationService } from "@/lib/services/notification";
import { NotificationWithRelations, NotificationResponse } from "@/types";

/**
 * Get unread notifications for the current user
 */
export async function getUnreadNotificationsSince(
  userId: string,
  since: Date,
  limit: number = 20
): Promise<NotificationResponse> {
  console.log("[getUnreadNotificationsSince] called with:", {
    userId,
    since: since.toISOString(),
    limit,
  });

  try {
    const [notifications, unreadCount] = await Promise.all([
      NotificationService.getUnreadNotificationsSince(userId, since, limit),
      NotificationService.getUnreadCount(userId),
    ]);

    const formattedNotifications: NotificationWithRelations[] =
      notifications.map((notification: any) => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        cardId: notification.cardId,
        projectId: notification.projectId,
        teamId: notification.teamId,
        isRead: notification.isRead ?? false,
        createdAt: notification.createdAt.toISOString(),
        updatedAt:
          notification.updatedAt?.toISOString() ||
          notification.createdAt.toISOString(),
        // Include related data
        card: notification.card || null,
        project: notification.project || null,
      }));

    return {
      notifications: formattedNotifications,
      unreadCount,
      totalCount: formattedNotifications.length,
      length: formattedNotifications.length,
    };
  } catch (error) {
    console.error("[getUnreadNotificationsSince] Failed:", error);
    return {
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      length: 0,
    };
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
    const formattedNotifications: NotificationWithRelations[] =
      notifications.map((notification: any) => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        message: notification.message,
        isRead: notification.isRead ?? false,
        createdAt: notification.createdAt.toISOString(),
        updatedAt:
          notification.updatedAt?.toISOString() ||
          notification.createdAt.toISOString(),
        ...notification,
      }));

    return {
      notifications: formattedNotifications,
      unreadCount,
      totalCount: formattedNotifications.length,
      length: formattedNotifications.length, // Add the required length property
    };
  } catch (error) {
    console.error("[getAllNotifications] Failed:", error);
    return {
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      length: 0, // Add the required length property
    };
  }
}

/**
 * Lightweight check to see if there are new unread notifications since a timestamp
 * Used for efficient polling without fetching data
 */
export async function hasNewNotificationsSince(
  userId: string,
  since: Date
): Promise<boolean> {
  console.log("[hasNewNotificationsSince] called with:", {
    userId,
    since: since.toISOString(),
  });

  try {
    const hasNew = await NotificationService.hasNewNotificationsSince(
      userId,
      since
    );
    console.log("[hasNewNotificationsSince] result:", hasNew);
    return hasNew;
  } catch (error) {
    console.error("[hasNewNotificationsSince] Failed:", error);
    return false; // Default to false on error to avoid unnecessary fetches
  }
}

/**
 * Get unread count along with timestamp of most recent unread notification
 * More efficient than separate calls
 */
export async function getUnreadCountWithTimestamp(
  userId: string
): Promise<{ count: number; mostRecentUnread: Date | null }> {
  console.log("[getUnreadCountWithTimestamp] called with:", { userId });

  try {
    const result =
      await NotificationService.getUnreadCountWithTimestamp(userId);

    return {
      count: result.count,
      mostRecentUnread: result.mostRecentUnread,
    };
  } catch (error) {
    console.error("[getUnreadCountWithTimestamp] Failed:", error);
    return {
      count: 0,
      mostRecentUnread: null,
    };
  }
}

/**
 * Get the timestamp of the most recent notification for a user
 * Useful for establishing polling baselines
 */
export async function getMostRecentNotificationTimestamp(
  userId: string
): Promise<Date | null> {
  console.log("[getMostRecentNotificationTimestamp] called with:", { userId });

  try {
    const timestamp =
      await NotificationService.getMostRecentNotificationTimestamp(userId);
    console.log(
      "[getMostRecentNotificationTimestamp] result:",
      timestamp?.toISOString()
    );
    return timestamp;
  } catch (error) {
    console.error("[getMostRecentNotificationTimestamp] Failed:", error);
    return null;
  }
}
