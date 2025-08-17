import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { TeamPermissionChecker } from "@/lib/permissions/checkers/team-permission-checker";

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const userId = await getRequiredUserId();
    const { teamId } = params;

    const permissionChecker = new TeamPermissionChecker();
    const context = await permissionChecker.loadContext(userId, teamId);

    const permissions = {
      canViewTeam: permissionChecker.canViewTeam(),
      canEditTeam: permissionChecker.canEditTeam(),
      canDeleteTeam: permissionChecker.canDeleteTeam(),
      canManageMembers: permissionChecker.canManageMembers(),
      canManageRoles: permissionChecker.canManageRoles(),
      canInviteMembers: permissionChecker.canInviteMembers(),
      canRemoveMembers: permissionChecker.canRemoveMembers(),
      canLeaveTeam: permissionChecker.canLeaveTeam(),
    };

    return NextResponse.json({
      role: context.userRole || "viewer",
      permissions,
      isTeamCreator: context.isTeamCreator,
    });
  } catch (error) {
    console.error("Error fetching team permissions:", error);

    if (error instanceof Error && error.message === "Team not found") {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
