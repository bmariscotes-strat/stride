import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import { getTeamsForUser } from "@/lib/services/teams";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { notFound, redirect } from "next/navigation";
import ProjectSettings from "./ProjectSettings.client";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const userId = await getRequiredUserId();
  const { slug } = await params;

  const project = await getProjectBySlugForUser(slug, userId);
  if (!project) {
    notFound();
  }

  // Check permissions
  const permissionChecker = new ProjectPermissionChecker();
  const context = await permissionChecker.loadContext(userId, project.id);
  const permissions = permissionChecker.getAllPermissions();

  // Basic access check
  if (!permissions.canViewProject) {
    redirect(`/dashboard?error=no-project-access`);
  }

  // Settings access check
  if (!ProjectPermissionChecker.canViewSettings(permissions)) {
    notFound();
  }

  // Get teams
  const teams = await getTeamsForUser(userId);

  // Get user role for display
  const isProjectOwner = context.isProjectOwner;
  const userRole = getUserDisplayRole(context, isProjectOwner);

  return (
    <ProjectSettings
      project={project}
      teams={teams}
      currentUserId={userId}
      permissions={permissions}
      isProjectOwner={isProjectOwner}
      userRole={userRole}
    />
  );
}
// Helper function to get display role
function getUserDisplayRole(context: any, isProjectOwner: boolean): string {
  if (isProjectOwner) {
    return "Owner";
  }

  if (!context?.teamMemberships || context.teamMemberships.length === 0) {
    return "No Access";
  }

  const roles = context.teamMemberships
    .map((m: any) => m.projectRole)
    .filter(Boolean);

  if (roles.includes("admin")) return "Admin";
  if (roles.includes("editor")) return "Editor";
  if (roles.includes("viewer")) return "Viewer";

  return "Viewer";
}
