// types/update.ts
import type { TeamRole, Priority, NotificationType } from "./enums";

// =============================================================================
// UPDATE INTERFACES - For updating existing records (all fields optional except id)
// =============================================================================

export interface UpdateUser {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  personalTeamId?: string;
}

export interface UpdateTeam {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  isArchived?: boolean;
}

export interface UpdateProject {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  colorTheme?: string;
  isArchived?: boolean;
}

export interface UpdateColumn {
  id: string;
  name?: string;
  position?: number;
  color?: string;
}

export interface UpdateCard {
  id: string;
  columnId?: string;
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: Priority;
  startDate?: Date;
  dueDate?: Date;
  position?: number;
  status?: string;
  isArchived?: boolean;
}

export interface UpdateLabel {
  id: string;
  name?: string;
  color?: string;
}

export interface UpdateTeamMember {
  id: string;
  role?: TeamRole;
}

export interface UpdateCardComment {
  id: number;
  content?: string;
}

export interface UpdateNotification {
  id: number;
  isRead?: boolean;
  title?: string;
  message?: string;
}
