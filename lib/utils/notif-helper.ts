// lib/helpers/notification-helpers.ts

import { NotificationType } from "@/types/enums/notif";
import { NOTIFICATION_TEMPLATES } from "@/lib/templates/notif-template";
import { NotificationWithRelations } from "@/types";

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

// Format time ago
export const formatTimeAgo = (dateString: Date) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export async function getNotificationUrlById(
  notification: NotificationWithRelations,
  fetchSlugs: (
    teamId: string,
    projectId?: string
  ) => Promise<{ teamSlug: string; projectSlug?: string }>
): Promise<string> {
  if (!notification.teamId) {
    return "#";
  }

  try {
    const { teamSlug, projectSlug } = await fetchSlugs(
      notification.teamId,
      notification.projectId || undefined
    );

    if (notification.cardId && projectSlug) {
      return `/team/${teamSlug}/project/${projectSlug}/card/${notification.cardId}`;
    }

    if (notification.projectId && projectSlug) {
      return `/team/${teamSlug}/project/${projectSlug}`;
    }

    return `/team/${teamSlug}`;
  } catch (error) {
    console.error("Error fetching slugs for notification URL:", error);
    return "#";
  }
}
