import {
  NotificationWithRelations,
  NotificationResponse,
  NotificationStats,
} from "@/types";

const API_BASE = "/api/notifications";

export class NotificationAPI {
  /**
   * Get unread notifications for the current user
   */
  static async getUnreadNotifications(
    limit: number = 20
  ): Promise<NotificationWithRelations[]> {
    try {
      const response = await fetch(`${API_BASE}/unread?limit=${limit}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch unread notifications: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.notifications || [];
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      throw error;
    }
  }

  /**
   * Get all notifications with pagination
   */
  static async getAllNotifications(
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationResponse> {
    try {
      const response = await fetch(
        `${API_BASE}?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notifications: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE}/count`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
  }

  /**
   * Mark specific notifications as read
   */
  static async markAsRead(notificationIds: number[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/mark-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to mark notifications as read: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to mark all notifications as read: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Delete/remove a notification
   */
  static async deleteNotification(notificationId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${notificationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to delete notification: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getStats(): Promise<NotificationStats> {
    try {
      const response = await fetch(`${API_BASE}/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notification stats: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      return {};
    }
  }
}
