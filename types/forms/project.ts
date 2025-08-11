// types/forms/project
import type { Team, User, Project } from "@/types";

// Basic Types
export type TeamBasic = Pick<Team, "id" | "name" | "slug">;
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
}

export interface ProjectFormMessagesProps {
  success: boolean;
  error: string;
}

export interface ProjectWithPartialRelations extends Project {
  team?: TeamBasic;
  owner?: UserBasic;
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
