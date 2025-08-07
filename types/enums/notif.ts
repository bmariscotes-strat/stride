export type Priority = "high" | "medium" | "low";

export type NotificationType =
  | "task_assigned"
  | "task_updated"
  | "comment_added"
  | "mention"
  | "due_date_reminder"
  | "team_invitation"
  | "team_role_changed"
  | "task_created"
  | "task_moved"
  | "task_reassigned";

export type NotificationTemplate = {
  title: string;
  message: (params: any) => string;
};
