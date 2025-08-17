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

  // Check permissions on the SERVER
  const permissionChecker = new ProjectPermissionChecker();
  const context = await permissionChecker.loadContext(userId, project.id);

  // Get specific permissions
  const canEditProject = permissionChecker.canEditProject();
  const canManageTeams = permissionChecker.canManageTeams();
  const canViewProject = permissionChecker.canViewProject();

  // If user doesn't have basic access, redirect or show error
  if (!canViewProject) {
    redirect(`/dashboard?error=no-project-access`);
  }

  // If user can't edit or manage teams, redirect back to project
  if (!canEditProject && !canManageTeams) {
    redirect(
      `/team/${project.team?.slug}/project/${project.slug}?error=no-settings-access`
    );
  }

  // Get teams only if needed
  const teams = await getTeamsForUser(userId);

  // Determine user's role for display
  const isProjectOwner = context.isProjectOwner;
  const userRole = getUserDisplayRole(context, isProjectOwner);

  return (
    <ProjectSettings
      project={project}
      teams={teams}
      currentUserId={userId}
      canEditProject={canEditProject}
      canManageTeams={canManageTeams}
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
