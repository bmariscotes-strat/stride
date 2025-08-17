import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { getTeamBySlug } from "@/lib/services/teams";
import { TeamPermissionChecker } from "@/lib/permissions/checkers/team-permission-checker";
import UpdateTeamPage from "./Settings.client";

// Define the permissions interface
export interface TeamPermissions {
  canEditTeam: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canDeleteTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
}

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || null;

  if (!userId) {
    redirect("/sign-in");
  }

  // ✅ Await params before accessing its properties
  const { slug } = await params;

  // Fetch the team data using the slug and current user ID
  const team = await getTeamBySlug(slug, userId);

  if (!team) {
    notFound(); // Redirect to 404 if team not found
  }

  // Check permissions using TeamPermissionChecker
  const permissionChecker = new TeamPermissionChecker();
  await permissionChecker.loadContext(userId, team.id);

  // Get all permissions
  const permissions: TeamPermissions = {
    canEditTeam: permissionChecker.canEditTeam(),
    canManageMembers: permissionChecker.canManageMembers(),
    canManageRoles: permissionChecker.canManageRoles(),
    canDeleteTeam: permissionChecker.canDeleteTeam(),
    canInviteMembers: permissionChecker.canInviteMembers(),
    canRemoveMembers: permissionChecker.canRemoveMembers(),
  };

  if (
    !permissions.canEditTeam &&
    !permissions.canManageMembers &&
    !permissions.canManageRoles
  ) {
    notFound();
  }

  return <UpdateTeamPage team={team as any} permissions={permissions} />;
}
