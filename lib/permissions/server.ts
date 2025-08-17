// lib/permissions/server.ts
import { getProjectBySlugForUser } from "@/lib/services/projects";
import { ProjectPermissionChecker } from "@/lib/permissions/project-permission-checker";
import { PERMISSIONS } from "@/lib/permissions/types";
import type {
  PermissionsData,
  ProjectPermissions,
} from "@/contexts/PermissionsContext";
import type { ProjectTeamRole } from "@/lib/permissions/types";

// Map your Permission checker to the context interface
function mapCheckerToPermissions(
  checker: ProjectPermissionChecker
): ProjectPermissions {
  return {
    // Project permissions
    canViewProject: checker.hasPermission(PERMISSIONS.PROJECT_VIEW),
    canEditProject: checker.hasPermission(PERMISSIONS.PROJECT_EDIT),
    canDeleteProject: checker.hasPermission(PERMISSIONS.PROJECT_DELETE),
    canArchiveProject: checker.hasPermission(PERMISSIONS.PROJECT_ARCHIVE),
    canManageTeams: checker.hasPermission(PERMISSIONS.PROJECT_MANAGE_TEAMS),

    // Column permissions
    canCreateColumns: checker.hasPermission(PERMISSIONS.COLUMN_CREATE),
    canEditColumns: checker.hasPermission(PERMISSIONS.COLUMN_EDIT),
    canDeleteColumns: checker.hasPermission(PERMISSIONS.COLUMN_DELETE),
    canReorderColumns: checker.hasPermission(PERMISSIONS.COLUMN_REORDER),

    // Card permissions
    canCreateCards: checker.hasPermission(PERMISSIONS.CARD_CREATE),
    canEditCards: checker.hasPermission(PERMISSIONS.CARD_EDIT),
    canDeleteCards: checker.hasPermission(PERMISSIONS.CARD_DELETE),
    canAssignCards: checker.hasPermission(PERMISSIONS.CARD_ASSIGN),
    canMoveCards: checker.hasPermission(PERMISSIONS.CARD_MOVE),

    // Comment permissions
    canCreateComments: checker.hasPermission(PERMISSIONS.COMMENT_CREATE),
    canEditComments: checker.hasPermission(PERMISSIONS.COMMENT_EDIT),
    canDeleteComments: checker.hasPermission(PERMISSIONS.COMMENT_DELETE),

    // Label permissions
    canCreateLabels: checker.hasPermission(PERMISSIONS.LABEL_CREATE),
    canEditLabels: checker.hasPermission(PERMISSIONS.LABEL_EDIT),
    canDeleteLabels: checker.hasPermission(PERMISSIONS.LABEL_DELETE),

    // Attachment permissions
    canUploadAttachments: checker.hasPermission(PERMISSIONS.ATTACHMENT_UPLOAD),
    canDeleteAttachments: checker.hasPermission(PERMISSIONS.ATTACHMENT_DELETE),
  };
}

// Helper to get the user's highest role for display purposes
function getUserDisplayRole(
  context: any,
  isProjectOwner: boolean
): ProjectTeamRole | null {
  if (isProjectOwner) {
    return "admin"; // Project owners are displayed as admin role
  }

  if (!context?.teamMemberships || context.teamMemberships.length === 0) {
    return null;
  }

  // Get the highest project role from team memberships
  const roles = context.teamMemberships
    .map((m: any) => m.projectRole)
    .filter(Boolean) as ProjectTeamRole[];

  if (roles.includes("admin")) return "admin";
  if (roles.includes("editor")) return "editor";
  if (roles.includes("viewer")) return "viewer";

  return "viewer"; // Default fallback
}

export async function getProjectPermissions(
  slug: string,
  userId: string
): Promise<PermissionsData> {
  try {
    // First get the project to get the project ID
    const project = await getProjectBySlugForUser(slug, userId);

    if (!project) {
      return {
        role: null,
        permissions: getEmptyPermissions(),
        hasAccess: false,
        isProjectOwner: false,
      };
    }

    // Use your existing ProjectPermissionChecker
    const permissionChecker = new ProjectPermissionChecker();
    const context = await permissionChecker.loadContext(userId, project.id);

    // Map the checker's permissions to our interface
    const permissions = mapCheckerToPermissions(permissionChecker);

    // Determine the user's role for display
    const role = getUserDisplayRole(context, context.isProjectOwner);

    // Check if user has basic access
    const hasAccess = permissionChecker.hasPermission(PERMISSIONS.PROJECT_VIEW);

    return {
      role,
      permissions,
      hasAccess,
      isProjectOwner: context.isProjectOwner,
    };
  } catch (error) {
    console.error("[GET_PROJECT_PERMISSIONS_ERROR]", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "Project not found") {
        return {
          role: null,
          permissions: getEmptyPermissions(),
          hasAccess: false,
          isProjectOwner: false,
        };
      }
    }

    return {
      role: null,
      permissions: getEmptyPermissions(),
      hasAccess: false,
      isProjectOwner: false,
    };
  }
}

// Helper to get empty permissions object
function getEmptyPermissions(): ProjectPermissions {
  return {
    canViewProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canArchiveProject: false,
    canManageTeams: false,
    canCreateColumns: false,
    canEditColumns: false,
    canDeleteColumns: false,
    canReorderColumns: false,
    canCreateCards: false,
    canEditCards: false,
    canDeleteCards: false,
    canAssignCards: false,
    canMoveCards: false,
    canCreateComments: false,
    canEditComments: false,
    canDeleteComments: false,
    canCreateLabels: false,
    canEditLabels: false,
    canDeleteLabels: false,
    canUploadAttachments: false,
    canDeleteAttachments: false,
  };
}

// Additional helper for API routes that need the permission checker
export async function getProjectPermissionChecker(
  slug: string,
  userId: string
): Promise<{ checker: ProjectPermissionChecker; project: any } | null> {
  try {
    const project = await getProjectBySlugForUser(slug, userId);

    if (!project) {
      return null;
    }

    const checker = new ProjectPermissionChecker();
    await checker.loadContext(userId, project.id);

    return { checker, project };
  } catch (error) {
    console.error("[GET_PROJECT_PERMISSION_CHECKER_ERROR]", error);
    return null;
  }
}
