import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { getTeamBySlug } from "@/lib/services/teams";
import { TeamPermissionChecker } from "@/lib/permissions/checkers/team-permission-checker";
import UpdateTeamPage from "./Settings.client";

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

  const { slug } = await params;
  const team = await getTeamBySlug(slug, userId);

  if (!team) {
    notFound();
  }

  // Check permissions
  const permissionChecker = new TeamPermissionChecker();
  await permissionChecker.loadContext(userId, team.id);

  // Get all permissions as object
  const permissions = permissionChecker.getAllPermissions();

  // Check if user has any settings permission
  if (!TeamPermissionChecker.hasAnySettingsPermission(permissions)) {
    notFound();
  }

  return <UpdateTeamPage team={team} permissions={permissions} />;
}
