import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { TeamPermissionChecker } from "@/lib/permissions/checkers/team-permission-checker";
import type { TeamRole, ProjectTeamRole } from "@/types/enums/roles";

/**
 * Cache invalidation helpers for permission system
 * Call these after making changes to user roles, team memberships, or project access
 */

// Team-related cache invalidation
export const TeamCacheManager = {
  /**
   * Call when adding a user to a team
   */
  onUserAddedToTeam(userId: string, teamId: string) {
    TeamPermissionChecker.invalidateUserTeamCache(userId, teamId);
    // Also invalidate project permissions since team membership affects project access
    ProjectPermissionChecker.invalidateUserProjectCache(userId);
  },

  /**
   * Call when removing a user from a team
   */
  onUserRemovedFromTeam(userId: string, teamId: string) {
    TeamPermissionChecker.invalidateUserTeamCache(userId, teamId);
    // Also invalidate project permissions since team membership affects project access
    ProjectPermissionChecker.invalidateUserProjectCache(userId);
  },

  /**
   * Call when changing a user's role in a team
   */
  onUserRoleChanged(
    userId: string,
    teamId: string,
    oldRole: TeamRole,
    newRole: TeamRole
  ) {
    TeamPermissionChecker.invalidateUserTeamCache(userId, teamId);
    // Also invalidate project permissions since team role affects project access
    ProjectPermissionChecker.invalidateUserProjectCache(userId);
  },

  /**
   * Call when team ownership changes
   */
  onTeamOwnershipTransferred(
    teamId: string,
    oldOwnerId: string,
    newOwnerId: string
  ) {
    TeamPermissionChecker.invalidateTeamCache(teamId);
    // Invalidate both users' project permissions
    ProjectPermissionChecker.invalidateUserProjectCache(oldOwnerId);
    ProjectPermissionChecker.invalidateUserProjectCache(newOwnerId);
  },

  /**
   * Call when a team is deleted
   */
  onTeamDeleted(teamId: string) {
    TeamPermissionChecker.invalidateTeamCache(teamId);
    // Note: Project permissions will be invalidated when project-team relationships are cleaned up
  },

  /**
   * Call when team settings change (if they affect permissions)
   */
  onTeamSettingsChanged(teamId: string) {
    TeamPermissionChecker.invalidateTeamCache(teamId);
  },
};

// Project-related cache invalidation
export const ProjectCacheManager = {
  /**
   * Call when a team is given access to a project
   */
  onTeamAddedToProject(teamId: string, projectId: string) {
    // Invalidate all users in this team for this project
    ProjectPermissionChecker.invalidateProjectCache(projectId);
  },

  /**
   * Call when a team's access to a project is removed
   */
  onTeamRemovedFromProject(teamId: string, projectId: string) {
    // Invalidate all users in this team for this project
    ProjectPermissionChecker.invalidateProjectCache(projectId);
  },

  /**
   * Call when a specific user's project role changes
   */
  onUserProjectRoleChanged(
    userId: string,
    projectId: string,
    oldRole: ProjectTeamRole,
    newRole: ProjectTeamRole
  ) {
    ProjectPermissionChecker.invalidateUserProjectCache(userId, projectId);
  },

  /**
   * Call when project ownership changes
   */
  onProjectOwnershipTransferred(
    projectId: string,
    oldOwnerId: string,
    newOwnerId: string
  ) {
    ProjectPermissionChecker.invalidateProjectCache(projectId);
  },

  /**
   * Call when a project is deleted
   */
  onProjectDeleted(projectId: string) {
    ProjectPermissionChecker.invalidateProjectCache(projectId);
  },

  /**
   * Call when project settings change (if they affect permissions)
   */
  onProjectSettingsChanged(projectId: string) {
    ProjectPermissionChecker.invalidateProjectCache(projectId);
  },
};

// Bulk cache operations
export const CacheManager = {
  /**
   * Clear all permission caches (use sparingly, e.g., during maintenance)
   */
  clearAllCaches() {
    ProjectPermissionChecker.clearCache();
    TeamPermissionChecker.clearCache();
  },

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      projects: ProjectPermissionChecker.getCacheStats(),
      teams: TeamPermissionChecker.getCacheStats(),
    };
  },

  /**
   * Invalidate all caches for a specific user (e.g., when user is deleted/suspended)
   */
  invalidateUserCaches(userId: string) {
    ProjectPermissionChecker.invalidateUserProjectCache(userId);
    TeamPermissionChecker.invalidateUserTeamCache(userId);
  },
};

// Export individual checkers for convenience
export { ProjectPermissionChecker, TeamPermissionChecker };
