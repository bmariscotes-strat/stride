// lib/actions/notifications/delete.ts
"use server";

import { NotificationService } from "@/lib/services/notification";
import { revalidatePath } from "next/cache";

/**
 * Delete specific notifications
 */
export async function deleteNotifications(
  notificationIds: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await NotificationService.deleteNotifications(notificationIds);
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("[deleteNotifications] Failed:", error);
    return {
      success: false,
      error: "Failed to delete notifications",
    };
  }
}
