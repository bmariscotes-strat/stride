import type { NotificationWithRelations } from "../relations";

export type Priority = "high" | "medium" | "low";

export type NotificationType =
  | "task_assigned"
  | "task_updated"
  | "comment_added"
  | "mention"
  | "project_created"
  | "project_updated"
  | "project_archived"
  | "project_deleted"
  | "project_restored"
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

export interface NotificationStats {
  [key: string]: {
    total: number;
    unread: number;
  };
}

export interface NotificationProps {
  userId: string | null;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface NotificationResponse {
  notifications: NotificationWithRelations[];
  unreadCount: number;
  totalCount: number;
  length: number;
}
