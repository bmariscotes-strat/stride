// types/forms/project.ts - Updated types
import type {
  Team,
  User,
  Project,
  TeamWithRelations,
  ProjectTeamMemberWithRelations,
} from "@/types";

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
  team?: TeamBasic;
  projectTeamMembers?: ProjectTeamMemberWithRelations[];
}

export interface TeamWithProjectRole extends TeamBasic {
  role?: "admin" | "editor" | "viewer";
}

export interface ProjectSettings {
  colorTheme?: string;
}

// Updated to support multiple teams
export interface ProjectFormData {
  name: string;
  slug: string;
  description: string;
  teamIds: string[];
  memberRoles: Record<string, "admin" | "editor" | "viewer">;
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
  onInputChange: (field: keyof ProjectFormData, value: any) => void;
  onSlugChange: (slug: string) => void;
  onTeamsChange: (teamIds: string[]) => void;
  onMemberRolesChange: (
    memberRoles: Record<string, "admin" | "editor" | "viewer">
  ) => void;
  currentUserId: string;
  error?: string | null;
}

export interface ProjectEditFormProps {
  project: ProjectWithPartialRelations;
  teams: TeamWithRelations[];
  currentUserId: string;
  isProjectOwner: boolean;
  onNavigateBack: () => void;
  canEditProject: boolean;
  canManageTeams: boolean;
}

export interface ProjectFormNavigationProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  isEdit?: boolean;
  canDelete?: boolean;
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
  projectRole: "admin" | "editor" | "viewer";
}

export type AssignProjectRoleParams = {
  projectId: string;
  memberId: string;
  newRole: "admin" | "editor" | "viewer";
};

export interface ProjectPageData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  owner?: {
    firstName?: string;
    lastName?: string;
  };
  teams?: Array<{
    id: string;
    name: string;
    slug: string;
    role?: "admin" | "editor" | "viewer";
  }>;
  projectTeamMembers?: Array<{
    id: string;
    role: "admin" | "editor" | "viewer";
    teamMember?: {
      user?: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatarUrl?: string;
      };
    };
  }>;
  columns?: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

export interface ProjectPageClientProps {
  project: ProjectPageData;
  userId: string;
  canCreateCards: boolean;
  canEditProject: boolean;
  canManageTeams: boolean;
  showSettings: boolean;
  isProjectOwner: boolean;
  defaultColumnId?: string;
  views: Array<{
    id: string;
    label: string;
    icon: string;
    isActive: boolean;
  }>;
}
