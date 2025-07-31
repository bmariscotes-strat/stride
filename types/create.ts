// types/create.ts
import type { TeamRole, Priority, NotificationType } from "./enums";
import type { UUID } from "@/types/base";

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
  personalTeamId?: UUID | null;
}

export interface CreateTeam {
  name: string;
  slug: string;
  description?: string | null;
  isPersonal?: boolean;
  createdBy: UUID;
}

export interface CreateProject {
  name: string;
  slug: string;
  description?: string | null;
  teamId: UUID;
  ownerId: UUID;
  colorTheme?: string | null;
}

export interface CreateColumn {
  projectId: UUID;
  name: string;
  position: number;
  color?: string | null;
}

export interface CreateCard {
  columnId: UUID;
  title: string;
  description?: string | null;
  assigneeId?: UUID | null;
  priority?: Priority | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  position: number;
  status?: string | null;
}

export interface CreateLabel {
  name: string;
  color: string;
  teamId: UUID;
}

export interface CreateTeamMember {
  teamId: UUID;
  userId: UUID;
  role?: TeamRole;
}

export interface CreateCardLabel {
  cardId: UUID;
  labelId: UUID;
}

export interface CreateCardComment {
  cardId: UUID;
  userId: UUID;
  content: string;
}

export interface CreateCardAttachment {
  cardId: UUID;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  uploadedBy: UUID;
}

export interface CreateActivityLog {
  projectId?: UUID | null;
  cardId?: UUID | null;
  userId: UUID;
  actionType: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface CreateNotification {
  userId: UUID;
  type: NotificationType;
  title: string;
  message?: string | null;
  cardId?: UUID | null;
  projectId?: UUID | null;
}

export interface CreateMention {
  commentId: UUID;
  mentionedUserId: UUID;
  mentionedBy: UUID;
}
