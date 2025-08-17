import { NotificationType, NotificationTemplate } from "@/types";

// Notification templates with dynamic message generation
export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  // Projects
  project_created: {
    title: "New project created",
    message: ({
      actorName,
      projectName,
    }: {
      actorName: string;
      projectName: string;
    }) => `${actorName} created a new project: ${projectName}`,
  },

  project_updated: {
    title: "Project updated",
    message: ({
      actorName,
      projectName,
      updateSummary,
    }: {
      actorName: string;
      projectName: string;
      updateSummary: string;
    }) => `${actorName} updated ${projectName}: ${updateSummary}`,
  },

  project_archived: {
    title: "Project archived",
    message: ({
      actorName,
      projectName,
    }: {
      actorName: string;
      projectName: string;
    }) => `${actorName} archived the project: ${projectName}`,
  },

  project_deleted: {
    title: "Project deleted",
    message: ({
      actorName,
      projectName,
    }: {
      actorName: string;
      projectName: string;
    }) => `${actorName} permanently deleted the project: ${projectName}`,
  },

  project_restored: {
    title: "Project restored",
    message: ({
      actorName,
      projectName,
    }: {
      actorName: string;
      projectName: string;
    }) => `${actorName} restored the project from archive: ${projectName}`,
  },

  // Tasks
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

  // Comments + Mentions
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

  // Teams
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

  team_role_changed: {
    title: "Changed role",
    message: ({
      teamName,
      oldRole,
      newRole,
    }: {
      teamName: string;
      oldRole: string;
      newRole: string;
    }) => `Role changed from ${oldRole} to ${newRole} in ${teamName}`,
  },
};
