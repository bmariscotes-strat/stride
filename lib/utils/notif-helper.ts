// lib/helpers/notification-helpers.ts

import { NotificationType } from "@/types/enums/notif";
import { NOTIFICATION_TEMPLATES } from "@/lib/templates/notif-template";

// Helper function to create notification content
export function createNotificationContent(
  type: NotificationType,
  params: Record<string, any>
): { title: string; message: string } {
  const template = NOTIFICATION_TEMPLATES[type];

  if (!template) {
    throw new Error(`No template found for notification type: ${type}`);
  }

  return {
    title: template.title,
    message: template.message(params),
  };
}
