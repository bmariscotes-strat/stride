import { db } from "@/lib/db/db";
import { eq, and } from "drizzle-orm";
import { teams, teamMembers } from "@/lib/db/schema";
import type { TeamPermissionContext, Permission, TeamRole } from "./types";
import { PERMISSIONS } from "./types";

export class TeamPermissionChecker {
  private context: TeamPermissionContext | null = null;

  constructor() {}

  // Load user's permission context for a specific team
  async loadContext(
    userId: string,
    teamId: string
  ): Promise<TeamPermissionContext> {
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

    this.context = {
      userId,
      teamId,
      userRole: membership[0]?.role || null,
      isTeamCreator,
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
}
