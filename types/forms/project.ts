// types/forms/project.ts - Updated types
import type { Team, User, Project, TeamWithRelations } from "@/types";

// Basic Types
export type UserBasic = Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
>;

// Utility types for reusable constraints
export type SortDirection = "asc" | "desc";
export type ProjectSortableFields = keyof Pick<
  Project,
  "name" | "createdAt" | "updatedAt"
>;

export type TeamBasic = Pick<Team, "id" | "name" | "slug">;

export interface ProjectWithPartialRelations extends Project {
  teams: TeamWithProjectRole[];
  owner?: UserBasic;
  // Optional fields for when you need them
  team?: TeamBasic; // For backward compatibility in some queries
  teamRole?: "admin" | "editor" | "viewer"; // When queried from user's perspective
}

export interface TeamWithProjectRole extends TeamBasic {
  role: "admin" | "editor" | "viewer";
}

export interface ProjectSettings {
  colorTheme?: string;
}

// Updated to support multiple teams
export interface ProjectFormData {
  name: string;
  slug: string;
  description: string;
  teamIds: string[]; // Changed from teamId to teamIds
  teamRoles: Record<string, "admin" | "editor" | "viewer">; // Roles for each team
  settings: ProjectSettings;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface ProjectCreationProps {
  teams: Team[];
  selectedTeamId?: string;
}

// Updated to support multiple teams and roles
export interface ProjectFormSectionProps {
  formData: ProjectFormData;
  onInputChange: (
    field: keyof Omit<ProjectFormData, "settings" | "teamRoles">,
    value: string | string[]
  ) => void;
  onSlugChange: (value: string) => void;
  onSettingChange: (setting: keyof ProjectSettings, value: string) => void;
  onTeamRoleChange: (
    teamId: string,
    role: "admin" | "editor" | "viewer"
  ) => void;
  onTeamsChange: (teamIds: string[]) => void;
  teams: Team[];
  error: string;
  currentUserId: string; // Added to determine default roles
}

export interface ProjectFormNavigationProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  isEdit?: boolean;
  canDelete?: boolean;
}

export interface ProjectEditProps {
  project: ProjectWithPartialRelations;
  teams: TeamWithRelations[];
  currentUserId: string;
}

export interface ProjectFormMessagesProps {
  success: boolean;
  error: string;
}

// Base filtering and pagination options (reusable across entities)
export interface BaseListOptions {
  search?: string;
  orderDirection?: SortDirection;
  limit?: number;
  offset?: number;
}

// Project-specific options using utility types
export interface ProjectsListOptions extends BaseListOptions {
  teamId?: string;
  ownerId?: string;
  isArchived?: boolean;
  orderBy?: ProjectSortableFields;
}

// New interfaces for team member role assignment
export interface TeamMemberWithRole {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "editor" | "viewer";
}

export interface TeamWithMembersAndRoles extends Team {
  members: TeamMemberWithRole[];
  projectRole: "admin" | "editor" | "viewer"; // The role this team will have in the project
}
