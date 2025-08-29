// types/create.ts
import type { TeamRole } from "@/types/enums/roles";
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
  jobPosition?: string | null;
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
  ownerId: string;
  colorTheme?: string | null;
}

export interface CreateProjectWithMembers
  extends Omit<CreateProject, "teamIds"> {
  teamIds: string[];
  memberRoles: Record<string, "admin" | "editor" | "viewer">;
}

// NEW: Interface for creating project-team relationships
export interface CreateProjectTeam {
  projectId: string;
  teamId: string;
  role: "admin" | "editor" | "viewer";
  addedBy: string;
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

// UPDATED: CreateLabel interface - changed from teamId to projectId
export interface CreateLabel {
  name: string;
  color: string;
  projectId: string; // Changed from teamId to projectId
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
  teamId?: string | null;
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
  commentId: number; // Changed from string to number to match cardComments.id
  mentionedUserId: string;
  mentionedBy: string;
}

// =============================================================================
// EXTENDED CREATE INTERFACES FOR COMPLEX OPERATIONS
// =============================================================================

export interface CreateProjectWithTeams extends CreateProject {
  teamIds: string[]; // Array of team IDs - matches what your hook expects
  teamRoles?: Record<string, "admin" | "editor" | "viewer">; // Optional roles per team
}

// Alternative interface using teamAssignments array (if you prefer this structure)
export interface CreateProjectWithTeamAssignments extends CreateProject {
  teamAssignments: Array<{
    teamId: string;
    role: "admin" | "editor" | "viewer";
  }>;
}

// For bulk creating project-team relationships
export interface BulkCreateProjectTeams {
  projectId: string;
  assignments: Array<{
    teamId: string;
    role: "admin" | "editor" | "viewer";
  }>;
  addedBy: string;
}
