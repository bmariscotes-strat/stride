import { NextRequest, NextResponse } from "next/server";
import { ProjectPermissionChecker } from "./checkers/project-permission-checker";
import { TeamPermissionChecker } from "./checkers/team-permission-checker";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import type { Permission } from "@/types/enums/permissions";

// Extend NextRequest to include permissionChecker
interface ExtendedRequest extends NextRequest {
  projectPermissionChecker?: ProjectPermissionChecker;
  teamPermissionChecker?: TeamPermissionChecker;
}

export function withPermission(permission: Permission) {
  return function (handler: Function) {
    return async function (req: ExtendedRequest, context: any) {
      let userId: string;

      try {
        userId = await getRequiredUserId();
      } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const projectId = context.params.projectId;

      if (!projectId) {
        return NextResponse.json(
          { error: "Project ID required" },
          { status: 400 }
        );
      }

      const checker = new ProjectPermissionChecker();

      try {
        await checker.loadContext(userId, projectId);

        if (!checker.hasPermission(permission)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Add permission checker to request context
        req.projectPermissionChecker = checker;

        return handler(req, context);
      } catch (error) {
        console.error("Permission check failed:", error);

        if (error instanceof Error && error.message === "User not found") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        if (error instanceof Error && error.message === "Project not found") {
          return NextResponse.json(
            { error: "Project not found" },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: "Permission check failed" },
          { status: 500 }
        );
      }
    };
  };
}

export function withTeamPermission(permission: Permission) {
  return function (handler: Function) {
    return async function (req: ExtendedRequest, context: any) {
      let userId: string;

      try {
        userId = await getRequiredUserId();
      } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const teamId = context.params.teamId;

      if (!teamId) {
        return NextResponse.json(
          { error: "Team ID required" },
          { status: 400 }
        );
      }

      const checker = new TeamPermissionChecker();

      try {
        await checker.loadContext(userId, teamId);

        if (!checker.hasPermission(permission)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Add team permission checker to request context
        req.teamPermissionChecker = checker;

        return handler(req, context);
      } catch (error) {
        console.error("Team permission check failed:", error);

        if (error instanceof Error && error.message === "User not found") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        if (error instanceof Error && error.message === "Team not found") {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: "Permission check failed" },
          { status: 500 }
        );
      }
    };
  };
}
