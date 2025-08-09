// types/create.ts
import type { TeamRole } from "@/types/enums/permissions";
import type { Priority, NotificationType } from "./enums/notif";

// =============================================================================
// CREATE INTERFACES - For creating new records (omitting auto-generated fields)
// =============================================================================

export interface CreateUser {
  clerkUserId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  personalTeamId?: string | null;
}

export interface CreateTeam {
  name: string;
  slug: string;
  description?: string | null;
  isPersonal?: boolean;
  createdBy: string;
}

export interface CreateProject {
  name: string;
  slug: string;
  description?: string | null;
  teamId: string;
  ownerId: string;
  colorTheme?: string | null;
}

export interface CreateColumn {
  projectId: string;
  name: string;
  position: number;
  color?: string | null;
}

export interface CreateCard {
  columnId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: Priority | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  position: number;
  status?: string | null;
}

export interface CreateLabel {
  name: string;
  color: string;
  teamId: string;
}

export interface CreateTeamMember {
  teamId: string;
  userId: string;
  role?: TeamRole;
}

export interface CreateCardLabel {
  cardId: string;
  labelId: string;
}

export interface CreateCardComment {
  cardId: string;
  userId: string;
  content: string;
}

export interface CreateCardAttachment {
  cardId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  uploadedBy: string;
}

export interface CreateActivityLog {
  projectId?: string | null;
  cardId?: string | null;
  userId: string;
  actionType: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  cardId?: string | null;
  projectId?: string | null;
  teamId?: string | null;
}

export interface CreateMention {
  commentId: string;
  mentionedUserId: string;
  mentionedBy: string;
}
