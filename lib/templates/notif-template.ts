import { NotificationType } from "@/types";

// Template function type for dynamic messages
export type NotificationTemplate = {
  title: string;
  message: (params: any) => string;
};

// Notification templates with dynamic message generation
export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  task_created: {
    title: "New card created",
    message: ({
      actorName,
      cardTitle,
      columnName,
    }: {
      actorName: string;
      cardTitle: string;
      columnName: string;
    }) => `${actorName} created "${cardTitle}" in ${columnName}`,
  },

  task_assigned: {
    title: "You were assigned to a card",
    message: ({
      actorName,
      cardTitle,
    }: {
      actorName: string;
      cardTitle: string;
    }) => `${actorName} assigned you to "${cardTitle}"`,
  },

  task_moved: {
    title: "Card moved",
    message: ({
      actorName,
      cardTitle,
      toColumnName,
    }: {
      actorName: string;
      cardTitle: string;
      toColumnName: string;
    }) => `${actorName} moved "${cardTitle}" to ${toColumnName}`,
  },

  task_updated: {
    title: "Your card was moved",
    message: ({
      actorName,
      cardTitle,
      fromColumnName,
      toColumnName,
    }: {
      actorName: string;
      cardTitle: string;
      fromColumnName: string;
      toColumnName: string;
    }) =>
      `${actorName} moved "${cardTitle}" from ${fromColumnName} to ${toColumnName}`,
  },

  task_reassigned: {
    title: "Card reassigned",
    message: ({
      cardTitle,
      assigneeName,
    }: {
      cardTitle: string;
      assigneeName: string;
    }) => `"${cardTitle}" has been reassigned to ${assigneeName}`,
  },

  comment_added: {
    title: "New comment on your card",
    message: ({
      actorName,
      cardTitle,
    }: {
      actorName: string;
      cardTitle: string;
    }) => `${actorName} commented on "${cardTitle}"`,
  },

  mention: {
    title: "You were mentioned",
    message: ({
      actorName,
      cardTitle,
    }: {
      actorName: string;
      cardTitle: string;
    }) => `${actorName} mentioned you in a comment on "${cardTitle}"`,
  },

  due_date_reminder: {
    title: "Due date changed",
    message: ({
      actorName,
      cardTitle,
      dueDateStr,
      actionText,
    }: {
      actorName: string;
      cardTitle: string;
      dueDateStr: string;
      actionText: string;
    }) =>
      `${actorName} ${actionText} the due date for "${cardTitle}" to ${dueDateStr}`,
  },

  team_invitation: {
    title: "Added to team",
    message: ({
      actorName,
      teamName,
      role,
    }: {
      actorName: string;
      teamName: string;
      role: string;
    }) => `${actorName} added you to "${teamName}" as ${role}`,
  },
};
