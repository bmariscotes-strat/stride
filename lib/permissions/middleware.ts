import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ProjectPermissionChecker } from "./project-permission-checker";
import { TeamPermissionChecker } from "./team-permission-checker";
import type { Permission } from "./types";

// Extend NextRequest to include permissionChecker
interface ExtendedRequest extends NextRequest {
  projectPermissionChecker?: ProjectPermissionChecker;
  teamPermissionChecker?: TeamPermissionChecker;
}

export function withPermission(permission: Permission) {
  return function (handler: Function) {
    return async function (req: ExtendedRequest, context: any) {
      const user = await currentUser();

      if (!user) {
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
      await checker.loadContext(user.id, projectId);

      if (!checker.hasPermission(permission)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Add permission checker to request context
      req.projectPermissionChecker = checker;

      return handler(req, context);
    };
  };
}

export function withTeamPermission(permission: Permission) {
  return function (handler: Function) {
    return async function (req: ExtendedRequest, context: any) {
      const user = await currentUser();

      if (!user) {
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
      await checker.loadContext(user.id, teamId);

      if (!checker.hasPermission(permission)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Add team permission checker to request context
      req.teamPermissionChecker = checker;

      return handler(req, context);
    };
  };
}
