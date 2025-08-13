import { db } from "@/lib/db/db";
import { eq, and } from "drizzle-orm";
import {
  users,
  teams,
  projects,
  projectTeams,
  teamMembers,
  cardComments,
} from "@/lib/db/schema";
import type {
  UserPermissionContext,
  Permission,
  TeamRole,
  ProjectTeamRole,
} from "./types";
import { PERMISSIONS } from "./types";

export class ProjectPermissionChecker {
  private context: UserPermissionContext | null = null;

  constructor() {}

  // Load user's permission context for a specific project
  async loadContext(
    userId: string,
    projectId: string
  ): Promise<UserPermissionContext> {
    // Get project owner info
    const project = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project[0]) {
      throw new Error("Project not found");
    }

    const isProjectOwner = project[0].ownerId === userId;

    // Get user's team memberships that have access to this project
    const teamMemberships = await db
      .select({
        teamId: teamMembers.teamId,
        teamRole: teamMembers.role,
        projectRole: projectTeams.role,
      })
      .from(teamMembers)
      .innerJoin(projectTeams, eq(teamMembers.teamId, projectTeams.teamId))
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(projectTeams.projectId, projectId)
        )
      );

    this.context = {
      userId,
      projectId,
      teamMemberships,
      isProjectOwner,
    };

    return this.context;
  }

  // Check if user has a specific permission
  hasPermission(permission: Permission): boolean {
    if (!this.context) {
      throw new Error(
        "Permission context not loaded. Call loadContext() first."
      );
    }

    const { isProjectOwner, teamMemberships } = this.context;

    // Project owners have all permissions
    if (isProjectOwner) {
      return true;
    }

    // If user has no team memberships with project access, deny all permissions
    if (teamMemberships.length === 0) {
      return false;
    }

    // Get the highest project role from all team memberships
    const highestProjectRole = this.getHighestProjectRole(teamMemberships);

    return this.checkPermissionForRole(permission, highestProjectRole);
  }

  // Get the highest project role across all team memberships
  private getHighestProjectRole(
    memberships: Array<{
      teamId: string;
      teamRole: TeamRole;
      projectRole?: ProjectTeamRole;
    }>
  ): ProjectTeamRole {
    const roles = memberships
      .map((m) => m.projectRole)
      .filter(Boolean) as ProjectTeamRole[];

    if (roles.includes("admin")) return "admin";
    if (roles.includes("editor")) return "editor";
    return "viewer";
  }

  // Check if a specific role has permission to perform an action
  private checkPermissionForRole(
    permission: Permission,
    role: ProjectTeamRole
  ): boolean {
    const rolePermissions = this.getRolePermissions(role);
    return rolePermissions.some(
      (p) =>
        p.action === permission.action && p.resource === permission.resource
    );
  }

  // Define what permissions each role has
  private getRolePermissions(role: ProjectTeamRole): Permission[] {
    switch (role) {
      case "admin":
        return [
          // All permissions except project deletion (only owner can delete)
          PERMISSIONS.PROJECT_VIEW,
          PERMISSIONS.PROJECT_EDIT,
          PERMISSIONS.PROJECT_ARCHIVE,
          PERMISSIONS.PROJECT_MANAGE_TEAMS,
          PERMISSIONS.COLUMN_CREATE,
          PERMISSIONS.COLUMN_EDIT,
          PERMISSIONS.COLUMN_DELETE,
          PERMISSIONS.COLUMN_REORDER,
          PERMISSIONS.CARD_CREATE,
          PERMISSIONS.CARD_EDIT,
          PERMISSIONS.CARD_DELETE,
          PERMISSIONS.CARD_ASSIGN,
          PERMISSIONS.CARD_MOVE,
          PERMISSIONS.COMMENT_CREATE,
          PERMISSIONS.COMMENT_EDIT,
          PERMISSIONS.COMMENT_DELETE,
          PERMISSIONS.LABEL_CREATE,
          PERMISSIONS.LABEL_EDIT,
          PERMISSIONS.LABEL_DELETE,
          PERMISSIONS.ATTACHMENT_UPLOAD,
          PERMISSIONS.ATTACHMENT_DELETE,
        ];

      case "editor":
        return [
          PERMISSIONS.PROJECT_VIEW,
          PERMISSIONS.COLUMN_CREATE,
          PERMISSIONS.COLUMN_EDIT,
          PERMISSIONS.COLUMN_REORDER,
          PERMISSIONS.CARD_CREATE,
          PERMISSIONS.CARD_EDIT,
          PERMISSIONS.CARD_ASSIGN,
          PERMISSIONS.CARD_MOVE,
          PERMISSIONS.COMMENT_CREATE,
          PERMISSIONS.COMMENT_EDIT, // Can edit their own comments
          PERMISSIONS.LABEL_CREATE,
          PERMISSIONS.LABEL_EDIT,
          PERMISSIONS.ATTACHMENT_UPLOAD,
        ];

      case "viewer":
        return [PERMISSIONS.PROJECT_VIEW, PERMISSIONS.COMMENT_CREATE];

      default:
        return [];
    }
  }

  // Convenience methods for common permission checks
  canViewProject(): boolean {
    return this.hasPermission(PERMISSIONS.PROJECT_VIEW);
  }

  canEditProject(): boolean {
    return this.hasPermission(PERMISSIONS.PROJECT_EDIT);
  }

  canManageTeams(): boolean {
    return this.hasPermission(PERMISSIONS.PROJECT_MANAGE_TEAMS);
  }

  canCreateCards(): boolean {
    return this.hasPermission(PERMISSIONS.CARD_CREATE);
  }

  canEditCards(): boolean {
    return this.hasPermission(PERMISSIONS.CARD_EDIT);
  }

  canDeleteCards(): boolean {
    return this.hasPermission(PERMISSIONS.CARD_DELETE);
  }

  // Check if user can edit/delete a specific comment (they can edit their own)
  async canModifyComment(commentId: number): Promise<boolean> {
    if (!this.context) {
      throw new Error("Permission context not loaded");
    }

    // Admins can modify any comment
    if (this.hasPermission(PERMISSIONS.COMMENT_DELETE)) {
      return true;
    }

    // Users can modify their own comments if they have edit permission
    if (this.hasPermission(PERMISSIONS.COMMENT_EDIT)) {
      const comment = await db
        .select({ userId: cardComments.userId })
        .from(cardComments)
        .where(eq(cardComments.id, commentId))
        .limit(1);

      return comment[0]?.userId === this.context.userId;
    }

    return false;
  }
}
