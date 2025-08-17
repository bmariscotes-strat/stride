// contexts/PermissionsContext.tsx
"use client";
import { createContext, ReactNode } from "react";
import type { ProjectTeamRole, Permission } from "@/lib/permissions/types";

export interface ProjectPermissions {
  // Project permissions
  canViewProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canArchiveProject: boolean;
  canManageTeams: boolean;

  // Column permissions
  canCreateColumns: boolean;
  canEditColumns: boolean;
  canDeleteColumns: boolean;
  canReorderColumns: boolean;

  // Card permissions
  canCreateCards: boolean;
  canEditCards: boolean;
  canDeleteCards: boolean;
  canAssignCards: boolean;
  canMoveCards: boolean;

  // Comment permissions
  canCreateComments: boolean;
  canEditComments: boolean;
  canDeleteComments: boolean;

  // Label permissions
  canCreateLabels: boolean;
  canEditLabels: boolean;
  canDeleteLabels: boolean;

  // Attachment permissions
  canUploadAttachments: boolean;
  canDeleteAttachments: boolean;
}

export interface PermissionsData {
  role: ProjectTeamRole | null;
  permissions: ProjectPermissions;
  hasAccess: boolean;
  isProjectOwner: boolean;
  // Optional: Add debug info for troubleshooting
  debug?: {
    teamMemberships?: Array<{
      teamId: string;
      teamRole: string;
      projectRole?: string;
    }>;
    contextLoaded: boolean;
  };
}

export interface PermissionsContextType extends PermissionsData {
  // Add utility methods
  hasPermission: (permission: Permission) => boolean;
  refetch?: () => Promise<void>;
}

export const PermissionsContext = createContext<PermissionsContextType | null>(
  null
);

interface PermissionsProviderProps {
  children: ReactNode;
  initialPermissions: PermissionsData;
  projectSlug?: string;
}

export function PermissionsProvider({
  children,
  initialPermissions,
  projectSlug,
}: PermissionsProviderProps) {
  // Helper function to check specific permissions
  const hasPermission = (permission: Permission): boolean => {
    const { permissions } = initialPermissions;

    // Map Permission objects to boolean checks
    switch (`${permission.action}_${permission.resource}`) {
      case "view_project":
        return permissions.canViewProject;
      case "edit_project":
        return permissions.canEditProject;
      case "delete_project":
        return permissions.canDeleteProject;
      case "archive_project":
        return permissions.canArchiveProject;
      case "manage_teams_project":
        return permissions.canManageTeams;

      case "create_column":
        return permissions.canCreateColumns;
      case "edit_column":
        return permissions.canEditColumns;
      case "delete_column":
        return permissions.canDeleteColumns;
      case "reorder_column":
        return permissions.canReorderColumns;

      case "create_card":
        return permissions.canCreateCards;
      case "edit_card":
        return permissions.canEditCards;
      case "delete_card":
        return permissions.canDeleteCards;
      case "assign_card":
        return permissions.canAssignCards;
      case "move_card":
        return permissions.canMoveCards;

      case "create_comment":
        return permissions.canCreateComments;
      case "edit_comment":
        return permissions.canEditComments;
      case "delete_comment":
        return permissions.canDeleteComments;

      case "create_label":
        return permissions.canCreateLabels;
      case "edit_label":
        return permissions.canEditLabels;
      case "delete_label":
        return permissions.canDeleteLabels;

      case "upload_attachment":
        return permissions.canUploadAttachments;
      case "delete_attachment":
        return permissions.canDeleteAttachments;

      default:
        return false;
    }
  };

  // Optional: Add refetch functionality
  const refetch = async () => {
    if (!projectSlug) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}/permissions`);
      if (response.ok) {
        const newPermissions = await response.json();
        console.log("Permissions refetched:", newPermissions);
        // You could add state management here if you need dynamic updates
      }
    } catch (error) {
      console.error("Failed to refetch permissions:", error);
    }
  };

  const contextValue: PermissionsContextType = {
    ...initialPermissions,
    hasPermission,
    refetch: projectSlug ? refetch : undefined,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
}
