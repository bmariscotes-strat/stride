// app/api/projects/[projectId]/assignees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/users";
import { BaseTaskService } from "@/lib/services/tasks/base";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    // Check permissions - user should be able to view the project to see assignees
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, projectId);

    if (!permissionChecker.canViewProject()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project assignees using the static method from the class
    const assignees = await BaseTaskService.getProjectAssignees(projectId);

    // Return simplified user data for the dropdown
    const simplifiedAssignees = assignees.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }));

    return NextResponse.json(simplifiedAssignees);
  } catch (error) {
    console.error("Error fetching project assignees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
