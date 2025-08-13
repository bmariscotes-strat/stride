import { ProjectPermissionChecker } from "./project-permission-checker";
import { TeamPermissionChecker } from "./team-permission-checker";
import { withPermission, withTeamPermission } from "./middleware";
import type { Permission } from "./types";

// Export classes
export { ProjectPermissionChecker };
export { TeamPermissionChecker };

// Export middleware
export { withPermission, withTeamPermission };

// Export types and permissions
export * from "./types";

// Additional utility for checking permissions in server components
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  permission: Permission
): Promise<boolean> {
  const checker = new ProjectPermissionChecker();
  await checker.loadContext(userId, projectId);
  return checker.hasPermission(permission);
}

export async function checkTeamPermission(
  userId: string,
  teamId: string,
  permission: Permission
): Promise<boolean> {
  const checker = new TeamPermissionChecker();
  await checker.loadContext(userId, teamId);
  return checker.hasPermission(permission);
}
