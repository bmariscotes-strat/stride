import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { PERMISSIONS } from "@/types/enums/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { projectId } = await params;

    const permissionChecker = new ProjectPermissionChecker();
    const context = await permissionChecker.loadContext(userId, projectId);

    // Determine user's role for display
    const role = getUserDisplayRole(context);

    // Check all relevant permissions
    const permissions = {
      canViewProject: permissionChecker.canViewProject(),
      canEditProject: permissionChecker.canEditProject(),
      canManageTeams: permissionChecker.canManageTeams(),
      canCreateCards: permissionChecker.canCreateCards(),
      canEditCards: permissionChecker.canEditCards(),
      canDeleteCards: permissionChecker.canDeleteCards(),
      canCreateColumns: permissionChecker.hasPermission(
        PERMISSIONS.COLUMN_CREATE
      ),
      canEditColumns: permissionChecker.hasPermission(PERMISSIONS.COLUMN_EDIT),
      canDeleteColumns: permissionChecker.hasPermission(
        PERMISSIONS.COLUMN_DELETE
      ),
      canReorderColumns: permissionChecker.hasPermission(
        PERMISSIONS.COLUMN_REORDER
      ),
      canCreateComments: permissionChecker.hasPermission(
        PERMISSIONS.COMMENT_CREATE
      ),
      canEditComments: permissionChecker.hasPermission(
        PERMISSIONS.COMMENT_EDIT
      ),
      canDeleteComments: permissionChecker.hasPermission(
        PERMISSIONS.COMMENT_DELETE
      ),
      canCreateLabels: permissionChecker.hasPermission(
        PERMISSIONS.LABEL_CREATE
      ),
      canEditLabels: permissionChecker.hasPermission(PERMISSIONS.LABEL_EDIT),
      canDeleteLabels: permissionChecker.hasPermission(
        PERMISSIONS.LABEL_DELETE
      ),
      canUploadAttachments: permissionChecker.hasPermission(
        PERMISSIONS.ATTACHMENT_UPLOAD
      ),
      canDeleteAttachments: permissionChecker.hasPermission(
        PERMISSIONS.ATTACHMENT_DELETE
      ),
      canAssignCards: permissionChecker.hasPermission(PERMISSIONS.CARD_ASSIGN),
      canMoveCards: permissionChecker.hasPermission(PERMISSIONS.CARD_MOVE),
      canArchiveProject: permissionChecker.hasPermission(
        PERMISSIONS.PROJECT_ARCHIVE
      ),
    };

    return NextResponse.json({
      role,
      permissions,
      isProjectOwner: context.isProjectOwner,
      teamMemberships: context.teamMemberships.length,
    });
  } catch (error) {
    console.error("Error fetching project permissions:", error);

    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

// Helper function to get display role
function getUserDisplayRole(
  context: any
): "owner" | "admin" | "editor" | "viewer" {
  if (context.isProjectOwner) {
    return "owner";
  }

  if (!context?.teamMemberships || context.teamMemberships.length === 0) {
    return "viewer";
  }

  const roles = context.teamMemberships
    .map((m: any) => m.projectRole)
    .filter(Boolean);

  if (roles.includes("admin")) return "admin";
  if (roles.includes("editor")) return "editor";
  return "viewer";
}
