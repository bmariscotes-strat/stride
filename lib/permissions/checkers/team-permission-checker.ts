// lib/permissions/checkers/team-permission-checkers.ts
import { db } from "@/lib/db/db";
import { eq, and } from "drizzle-orm";
import { teams, teamMembers } from "@/lib/db/schema";
import type {
  TeamPermissionContext,
  Permission,
} from "@/types/enums/permissions";
import type { TeamRole } from "@/types/enums/roles";
import { PERMISSIONS } from "@/types/enums/permissions";
import { PermissionCache } from "@/lib/cache/permission/permission-cache";

// Add this interface to your types
export interface TeamPermissions {
  canViewTeam: boolean;
  canEditTeam: boolean;
  canDeleteTeam: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canLeaveTeam: boolean;
  // Add computed permissions for convenience
  canViewSettings: boolean;
  hasAnySettingsPermission: boolean;
  hasAnyMemberPermission: boolean;
}

export class TeamPermissionChecker {
  private static cache = new PermissionCache<TeamPermissionContext>();
  private context: TeamPermissionContext | null = null;

  constructor() {}

  // Load user's permission context for a specific team
  async loadContext(
    userId: string,
    teamId: string,
    useCache: boolean = true
  ): Promise<TeamPermissionContext> {
    const cacheKey = `team:${userId}:${teamId}`;

    // Try to get from cache first
    if (useCache) {
      const cachedContext = TeamPermissionChecker.cache.get(cacheKey);
      if (cachedContext) {
        this.context = cachedContext;
        return cachedContext;
      }
    }

    // Get team info
    const team = await db
      .select({ createdById: teams.createdBy })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team[0]) {
      throw new Error("Team not found");
    }

    const isTeamCreator = team[0].createdById === userId;

    // Get user's team membership
    const membership = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId))
      )
      .limit(1);

    const context: TeamPermissionContext = {
      userId,
      teamId,
      userRole: membership[0]?.role || null,
      isTeamCreator,
    };

    // Cache the result
    if (useCache) {
      TeamPermissionChecker.cache.set(cacheKey, context);
    }

    this.context = context;
    return context;
  }

  // Static method to invalidate cache when permissions change
  static invalidateUserTeamCache(userId: string, teamId?: string): void {
    if (teamId) {
      // Invalidate specific user-team combination
      this.cache.invalidate(`team:${userId}:${teamId}`);
    } else {
      // Invalidate all team permissions for a user
      this.cache.invalidatePattern(`team:${userId}:`);
    }
  }

  // Static method to invalidate all caches for a team (when team changes)
  static invalidateTeamCache(teamId: string): void {
    this.cache.invalidatePattern(`:${teamId}`);
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

    const { isTeamCreator, userRole } = this.context;

    // Team creators have all permissions
    if (isTeamCreator) {
      return true;
    }

    // If user is not a team member, deny all permissions
    if (!userRole) {
      return false;
    }

    return this.checkPermissionForRole(permission, userRole);
  }

  // Check if a specific role has permission to perform an action
  private checkPermissionForRole(
    permission: Permission,
    role: TeamRole
  ): boolean {
    const rolePermissions = this.getRolePermissions(role);
    return rolePermissions.some(
      (p) =>
        p.action === permission.action && p.resource === permission.resource
    );
  }

  // Define what permissions each team role has
  private getRolePermissions(role: TeamRole): Permission[] {
    switch (role) {
      case "owner":
        return [
          // All permissions except team deletion (only creator can delete)
          PERMISSIONS.TEAM_VIEW,
          PERMISSIONS.TEAM_EDIT,
          PERMISSIONS.TEAM_MANAGE_MEMBERS,
          PERMISSIONS.TEAM_MANAGE_ROLES,
          PERMISSIONS.TEAM_INVITE_MEMBERS,
          PERMISSIONS.TEAM_REMOVE_MEMBERS,
        ];

      case "admin":
        return [
          PERMISSIONS.TEAM_VIEW,
          PERMISSIONS.TEAM_EDIT,
          PERMISSIONS.TEAM_MANAGE_MEMBERS,
          PERMISSIONS.TEAM_INVITE_MEMBERS,
          PERMISSIONS.TEAM_REMOVE_MEMBERS,
        ];

      case "member":
        return [
          PERMISSIONS.TEAM_VIEW,
          PERMISSIONS.TEAM_INVITE_MEMBERS,
          PERMISSIONS.TEAM_LEAVE,
        ];

      case "viewer":
        return [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_LEAVE];

      default:
        return [];
    }
  }

  // Convenience methods for common permission checks
  canViewTeam(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_VIEW);
  }

  canEditTeam(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_EDIT);
  }

  canDeleteTeam(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_DELETE);
  }

  canManageMembers(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_MANAGE_MEMBERS);
  }

  canManageRoles(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_MANAGE_ROLES);
  }

  canInviteMembers(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_INVITE_MEMBERS);
  }

  canRemoveMembers(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_REMOVE_MEMBERS);
  }

  canLeaveTeam(): boolean {
    return this.hasPermission(PERMISSIONS.TEAM_LEAVE);
  }

  // Get all permissions as an object
  getAllPermissions(): TeamPermissions {
    const canViewTeam = this.canViewTeam();
    const canEditTeam = this.canEditTeam();
    const canDeleteTeam = this.canDeleteTeam();
    const canManageMembers = this.canManageMembers();
    const canManageRoles = this.canManageRoles();
    const canInviteMembers = this.canInviteMembers();
    const canRemoveMembers = this.canRemoveMembers();
    const canLeaveTeam = this.canLeaveTeam();

    // Computed permissions
    const canViewSettings = canEditTeam || canManageMembers || canManageRoles;
    const hasAnySettingsPermission =
      canEditTeam || canManageMembers || canManageRoles;
    const hasAnyMemberPermission =
      canManageMembers || canInviteMembers || canRemoveMembers;

    return {
      canViewTeam,
      canEditTeam,
      canDeleteTeam,
      canManageMembers,
      canManageRoles,
      canInviteMembers,
      canRemoveMembers,
      canLeaveTeam,
      canViewSettings,
      hasAnySettingsPermission,
      hasAnyMemberPermission,
    };
  }

  // Static helper to check if user has any settings permission
  static hasAnySettingsPermission(permissions: TeamPermissions): boolean {
    return permissions.hasAnySettingsPermission;
  }

  // Static helper to check if user has any member management permission
  static hasAnyMemberPermission(permissions: TeamPermissions): boolean {
    return permissions.hasAnyMemberPermission;
  }

  // Get cache statistics (useful for debugging/monitoring)
  static getCacheStats() {
    return TeamPermissionChecker.cache.getStats();
  }
}
