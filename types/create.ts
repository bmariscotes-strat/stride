// types/create.ts
import type { TeamRole, Priority, NotificationType } from "./enums";

// =============================================================================
// CREATE INTERFACES - For creating new records (omitting auto-generated fields)
// =============================================================================

export interface CreateUser {
  clerkUserId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  personalTeamId?: string;
}

export interface CreateTeam {
  name: string;
  slug: string;
  description?: string;
  isPersonal?: boolean;
  createdBy: string;
}

export interface CreateProject {
  name: string;
  slug: string;
  description?: string;
  teamId: string;
  ownerId: string;
  colorTheme?: string;
}

export interface CreateColumn {
  projectId: string;
  name: string;
  position: number;
  color?: string;
}

export interface CreateCard {
  columnId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: Priority;
  startDate?: Date;
  dueDate?: Date;
  position: number;
  status?: string;
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
  fileSize?: number;
  uploadedBy: string;
}

export interface CreateActivityLog {
  projectId?: string;
  cardId?: string;
  userId: string;
  actionType: string;
  oldValue?: string;
  newValue?: string;
}

export interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  cardId?: string;
  projectId?: string;
}

export interface CreateMention {
  commentId: string;
  mentionedUserId: string;
  mentionedBy: string;
}
