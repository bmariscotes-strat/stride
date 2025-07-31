// types/update.ts
import type { TeamRole, Priority, NotificationType } from "./enums";
import type { UUID } from "@/types/base";

// =============================================================================
// UPDATE INTERFACES - For updating existing records (all fields optional except id)
// =============================================================================

export interface UpdateUser {
  id: UUID;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  personalTeamId?: UUID | null;
}

export interface UpdateTeam {
  id: UUID;
  name?: string;
  slug?: string;
  description?: string | null;
  isArchived?: boolean;
}

export interface UpdateProject {
  id: UUID;
  name?: string;
  slug?: string;
  description?: string | null;
  colorTheme?: string | null;
  isArchived?: boolean;
}

export interface UpdateColumn {
  id: UUID;
  name?: string;
  position?: number;
  color?: string | null;
}

export interface UpdateCard {
  id: UUID;
  columnId?: UUID;
  title?: string;
  description?: string | null;
  assigneeId?: UUID | null;
  priority?: Priority | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  position?: number;
  status?: string | null;
  isArchived?: boolean;
}

export interface UpdateLabel {
  id: UUID;
  name?: string;
  color?: string;
}

export interface UpdateTeamMember {
  id: UUID;
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
  message?: string | null;
}
