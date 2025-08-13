// types/forms/project
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

export interface ProjectFormData {
  name: string;
  slug: string;
  description: string;
  teamId: string;
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

export interface ProjectFormSectionProps {
  formData: ProjectFormData;
  onInputChange: (
    field: keyof Omit<ProjectFormData, "settings">,
    value: string
  ) => void;
  onSlugChange: (value: string) => void;
  onSettingChange: (setting: keyof ProjectSettings, value: string) => void;
  teams: Team[];
  error: string;
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
