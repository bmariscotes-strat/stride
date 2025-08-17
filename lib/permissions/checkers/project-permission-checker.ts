import { db } from "@/lib/db/db";
import { eq, and } from "drizzle-orm";
import {
  projects,
  projectTeams,
  projectTeamMembers,
  teamMembers,
  cardComments,
} from "@/lib/db/schema";
import type {
  UserPermissionContext,
  Permission,
  ProjectPermissions,
} from "@/types/enums/permissions";
import type { TeamRole, ProjectTeamRole } from "@/types/enums/roles";

import { PERMISSIONS } from "../../../types/enums/permissions";
import { PermissionCache } from "@/lib/cache/permission/permission-cache";

export class ProjectPermissionChecker {
  private static cache = new PermissionCache<UserPermissionContext>();
  private context: UserPermissionContext | null = null;

  constructor() {}

  // Load user's permission context for a specific project
  async loadContext(
    userId: string,
    projectId: string,
    useCache: boolean = true
  ): Promise<UserPermissionContext> {
    const cacheKey = `project:${userId}:${projectId}`;

    // Try to get from cache first
    if (useCache) {
      const cachedContext = ProjectPermissionChecker.cache.get(cacheKey);
      if (cachedContext) {
        this.context = cachedContext;
        return cachedContext;
      }
    }

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
    // AND their specific project roles
    const teamMemberships = await db
      .select({
        teamId: teamMembers.teamId,
        teamRole: teamMembers.role,
        projectRole: projectTeamMembers.role, // This comes from projectTeamMembers, not projectTeams
      })
      .from(teamMembers)
      .innerJoin(projectTeams, eq(teamMembers.teamId, projectTeams.teamId))
      .innerJoin(
        projectTeamMembers,
        and(
          eq(projectTeamMembers.projectId, projectTeams.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(projectTeams.projectId, projectId)
        )
      );

    const context: UserPermissionContext = {
      userId,
      projectId,
      teamMemberships,
      isProjectOwner,
    };

    // Cache the result
    if (useCache) {
      ProjectPermissionChecker.cache.set(cacheKey, context);
    }

    this.context = context;
    return context;
  }

  // Static method to invalidate cache when permissions change
  static invalidateUserProjectCache(userId: string, projectId?: string): void {
    if (projectId) {
      // Invalidate specific user-project combination
      this.cache.invalidate(`project:${userId}:${projectId}`);
    } else {
      // Invalidate all project permissions for a user
      this.cache.invalidatePattern(`project:${userId}:`);
    }
  }

  // Static method to invalidate all caches for a project (when project changes)
  static invalidateProjectCache(projectId: string): void {
    this.cache.invalidatePattern(`:${projectId}`);
  }

  // Static method to clear all cache
  static clearCache(): void {
    this.cache.clear();
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
          PERMISSIONS.COMMENT_EDIT,
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

  getAllPermissions(): ProjectPermissions {
    const canViewProject = this.canViewProject();
    const canEditProject = this.canEditProject();
    const canDeleteProject = this.hasPermission(PERMISSIONS.PROJECT_DELETE);
    const canArchiveProject = this.hasPermission(PERMISSIONS.PROJECT_ARCHIVE);
    const canManageTeams = this.canManageTeams();
    const canCreateCards = this.canCreateCards();
    const canEditCards = this.canEditCards();
    const canDeleteCards = this.canDeleteCards();
    const canCreateColumns = this.hasPermission(PERMISSIONS.COLUMN_CREATE);
    const canEditColumns = this.hasPermission(PERMISSIONS.COLUMN_EDIT);
    const canDeleteColumns = this.hasPermission(PERMISSIONS.COLUMN_DELETE);
    const canCreateComments = this.hasPermission(PERMISSIONS.COMMENT_CREATE);
    const canEditComments = this.hasPermission(PERMISSIONS.COMMENT_EDIT);
    const canDeleteComments = this.hasPermission(PERMISSIONS.COMMENT_DELETE);
    const canUploadAttachments = this.hasPermission(
      PERMISSIONS.ATTACHMENT_UPLOAD
    );
    const canDeleteAttachments = this.hasPermission(
      PERMISSIONS.ATTACHMENT_DELETE
    );
    const canCreateLabels = this.hasPermission(PERMISSIONS.LABEL_CREATE);
    const canEditLabels = this.hasPermission(PERMISSIONS.LABEL_EDIT);
    const canDeleteLabels = this.hasPermission(PERMISSIONS.LABEL_DELETE);

    // Computed permissions
    const hasAnyEditPermission =
      canEditProject || canEditCards || canEditColumns;
    const hasAnyManagementPermission =
      canEditProject || canManageTeams || canDeleteProject;
    const canViewSettings = canEditProject || canManageTeams;

    return {
      canViewProject,
      canEditProject,
      canDeleteProject,
      canArchiveProject,
      canManageTeams,
      canCreateCards,
      canEditCards,
      canDeleteCards,
      canCreateColumns,
      canEditColumns,
      canDeleteColumns,
      canCreateComments,
      canEditComments,
      canDeleteComments,
      canUploadAttachments,
      canDeleteAttachments,
      canCreateLabels,
      canEditLabels,
      canDeleteLabels,
      hasAnyEditPermission,
      hasAnyManagementPermission,
      canViewSettings,
    };
  }

  // Static helper methods
  static hasAnyEditPermission(permissions: ProjectPermissions): boolean {
    return permissions.hasAnyEditPermission;
  }

  static hasAnyManagementPermission(permissions: ProjectPermissions): boolean {
    return permissions.hasAnyManagementPermission;
  }

  static canViewSettings(permissions: ProjectPermissions): boolean {
    return permissions.canViewSettings;
  }

  // Get cache statistics (useful for debugging/monitoring)
  static getCacheStats() {
    return ProjectPermissionChecker.cache.getStats();
  }
}
