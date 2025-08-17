// hooks/usePermissions.ts
import { useContext } from "react";
import { PermissionsContext } from "@/contexts/PermissionsContext";
import type { Permission } from "@/lib/permissions/types";

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

// Convenience hooks for common checks using your Permission constants
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

// Project-level permission hooks
export function useCanEditProject(): boolean {
  const { permissions } = usePermissions();
  return permissions.canEditProject;
}

export function useCanDeleteProject(): boolean {
  const { permissions } = usePermissions();
  return permissions.canDeleteProject;
}

export function useCanArchiveProject(): boolean {
  const { permissions } = usePermissions();
  return permissions.canArchiveProject;
}

export function useCanManageTeams(): boolean {
  const { permissions } = usePermissions();
  return permissions.canManageTeams;
}

// Column permission hooks
export function useCanCreateColumns(): boolean {
  const { permissions } = usePermissions();
  return permissions.canCreateColumns;
}

export function useCanEditColumns(): boolean {
  const { permissions } = usePermissions();
  return permissions.canEditColumns;
}

export function useCanDeleteColumns(): boolean {
  const { permissions } = usePermissions();
  return permissions.canDeleteColumns;
}

export function useCanReorderColumns(): boolean {
  const { permissions } = usePermissions();
  return permissions.canReorderColumns;
}

// Card permission hooks
export function useCanCreateCards(): boolean {
  const { permissions } = usePermissions();
  return permissions.canCreateCards;
}

export function useCanEditCards(): boolean {
  const { permissions } = usePermissions();
  return permissions.canEditCards;
}

export function useCanDeleteCards(): boolean {
  const { permissions } = usePermissions();
  return permissions.canDeleteCards;
}

export function useCanAssignCards(): boolean {
  const { permissions } = usePermissions();
  return permissions.canAssignCards;
}

export function useCanMoveCards(): boolean {
  const { permissions } = usePermissions();
  return permissions.canMoveCards;
}

// Comment permission hooks
export function useCanCreateComments(): boolean {
  const { permissions } = usePermissions();
  return permissions.canCreateComments;
}

export function useCanEditComments(): boolean {
  const { permissions } = usePermissions();
  return permissions.canEditComments;
}

export function useCanDeleteComments(): boolean {
  const { permissions } = usePermissions();
  return permissions.canDeleteComments;
}

// Label permission hooks
export function useCanCreateLabels(): boolean {
  const { permissions } = usePermissions();
  return permissions.canCreateLabels;
}

export function useCanEditLabels(): boolean {
  const { permissions } = usePermissions();
  return permissions.canEditLabels;
}

export function useCanDeleteLabels(): boolean {
  const { permissions } = usePermissions();
  return permissions.canDeleteLabels;
}

// Attachment permission hooks
export function useCanUploadAttachments(): boolean {
  const { permissions } = usePermissions();
  return permissions.canUploadAttachments;
}

export function useCanDeleteAttachments(): boolean {
  const { permissions } = usePermissions();
  return permissions.canDeleteAttachments;
}

// Role-based hooks
export function useIsProjectOwner(): boolean {
  const { isProjectOwner } = usePermissions();
  return isProjectOwner;
}

export function useUserRole() {
  const { role } = usePermissions();
  return role;
}

export function useHasAccess(): boolean {
  const { hasAccess } = usePermissions();
  return hasAccess;
}

// Utility hooks for grouped permissions
export function useCardPermissions() {
  const { permissions } = usePermissions();
  return {
    canCreate: permissions.canCreateCards,
    canEdit: permissions.canEditCards,
    canDelete: permissions.canDeleteCards,
    canAssign: permissions.canAssignCards,
    canMove: permissions.canMoveCards,
  };
}

export function useColumnPermissions() {
  const { permissions } = usePermissions();
  return {
    canCreate: permissions.canCreateColumns,
    canEdit: permissions.canEditColumns,
    canDelete: permissions.canDeleteColumns,
    canReorder: permissions.canReorderColumns,
  };
}

export function useProjectPermissions() {
  const { permissions } = usePermissions();
  return {
    canView: permissions.canViewProject,
    canEdit: permissions.canEditProject,
    canDelete: permissions.canDeleteProject,
    canArchive: permissions.canArchiveProject,
    canManageTeams: permissions.canManageTeams,
  };
}
