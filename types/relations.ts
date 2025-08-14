// types/relations.ts
import type {
  User,
  Team,
  Project,
  Column,
  Card,
  Label,
  TeamMember,
  CardLabel,
  CardComment,
  CardAttachment,
  ActivityLog,
  Notification,
  Mention,
} from "./base";

// =============================================================================
// NEW TYPES FOR PROJECT-TEAM RELATIONSHIPS
// =============================================================================

export interface ProjectTeam {
  id: string;
  projectId: string;
  teamId: string;
  role: "admin" | "editor" | "viewer";
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTeamWithRelations extends ProjectTeam {
  project?: Project;
  team?: Team;
  addedByUser?: User;
}

// Basic Types for queries
export type TeamBasic = Pick<Team, "id" | "name" | "slug">;
export type UserBasic = Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
>;

// Team with role information in project context
export interface TeamWithProjectRole extends TeamBasic {
  role: "admin" | "editor" | "viewer";
}

// =============================================================================
// EXTENDED INTERFACES WITH RELATIONS - For when you need related data
// =============================================================================

export interface UserWithRelations extends User {
  personalTeam?: Team;
  teamMemberships?: TeamMember[];
  ownedProjects?: Project[];
  assignedCards?: Card[];
  comments?: CardComment[];
  attachments?: CardAttachment[];
  activities?: ActivityLog[];
  notifications?: Notification[];
}

export interface TeamWithRelations extends Team {
  creator?: User;
  members?: TeamMemberWithRelations[];
  projects?: ProjectTeamWithRelations[]; // Changed from Project[] to ProjectTeam[]
}

export interface TeamWithProjectRoleRelations {
  team?: TeamWithRelations;
  members?: TeamMemberWithRelations[];
  // Project-specific role assignment
  projectRole: "admin" | "editor" | "viewer";
  memberRoles: Record<string, "admin" | "editor" | "viewer">;
}

export interface TeamWithMemberRoles {
  team: TeamWithRelations;
  members: TeamMemberWithRelations[];
}

export interface ProjectWithRelations extends Project {
  teams?: TeamWithProjectRole[]; // Changed from single team to multiple teams with roles
  owner?: User;
  columns?: Column[];
  labels?: Label[]; // Labels are now project-scoped
  activities?: ActivityLog[];
  notifications?: Notification[];
}

export interface ColumnWithRelations extends Column {
  project?: Project;
  cards?: Card[];
}

export interface CardWithRelations extends Card {
  column?: Column;
  assignee?: User;
  labels?: CardLabel[];
  comments?: CardComment[];
  attachments?: CardAttachment[];
  activities?: ActivityLog[];
  notifications?: Notification[];
}

// Updated - Labels are now project-scoped instead of team-scoped
export interface LabelWithRelations extends Label {
  project?: Project; // Changed from team to project
  cards?: CardLabel[];
}

export interface TeamMemberWithRelations extends TeamMember {
  team?: Team;
  user?: User;
}

export interface CardLabelWithRelations extends CardLabel {
  card?: Card;
  label?: Label;
}

export interface CardCommentWithRelations extends CardComment {
  card?: Card;
  user?: User;
  mentions?: Mention[];
}

export interface CardAttachmentWithRelations extends CardAttachment {
  card?: Card;
  uploader?: User;
}

export interface ActivityLogWithRelations extends ActivityLog {
  project?: Project;
  team?: Team;
  card?: Card;
  user?: User;
}

export interface NotificationWithRelations extends Notification {
  user?: User;
  card?: Card;
  project?: Project;
  team?: Team;
}

export interface MentionWithRelations extends Mention {
  comment?: CardComment;
  mentionedUser?: User;
  mentionedByUser?: User;
}

// =============================================================================
// UTILITY TYPES FOR PROJECT MANAGEMENT
// =============================================================================

export interface ProjectTeamManagement {
  projectId: string;
  teamId: string;
  role: "admin" | "editor" | "viewer";
  userId: string; // User performing the action
}

export interface ProjectAccessInfo {
  projectId: string;
  userId: string;
  accessLevel: "owner" | "admin" | "editor" | "viewer" | "none";
  throughTeams: Array<{
    teamId: string;
    teamName: string;
    role: "admin" | "editor" | "viewer";
  }>;
}

// For project creation with team assignments
export interface CreateProjectWithTeams {
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  colorTheme?: string | null;
  teamAssignments: Array<{
    teamId: string;
    role: "admin" | "editor" | "viewer";
  }>;
}
