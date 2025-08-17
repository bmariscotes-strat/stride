// app/api/projects/[slug]/permissions/route.ts
import { NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { getProjectPermissions } from "@/lib/permissions/server";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    console.log("[PERMISSIONS API] params:", params);

    const userId = await getRequiredUserId();
    console.log("[PERMISSIONS API] userId:", userId);

    // Use the server permissions helper which uses your ProjectPermissionChecker
    const permissionsData = await getProjectPermissions(params.slug, userId);

    console.log("[PERMISSIONS API] permissionsData:", {
      role: permissionsData.role,
      hasAccess: permissionsData.hasAccess,
      isProjectOwner: permissionsData.isProjectOwner,
    });

    if (!permissionsData.hasAccess) {
      console.log("[PERMISSIONS API] No access → returning 403");
      return NextResponse.json(
        {
          error: "Access denied",
          role: null,
          permissions: permissionsData.permissions,
          hasAccess: false,
          isProjectOwner: false,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      role: permissionsData.role,
      permissions: permissionsData.permissions,
      hasAccess: permissionsData.hasAccess,
      isProjectOwner: permissionsData.isProjectOwner,
    });
  } catch (error) {
    console.error("[GET_PROJECT_PERMISSIONS_ERROR]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        role: null,
        permissions: {},
        hasAccess: false,
        isProjectOwner: false,
      },
      { status: 500 }
    );
  }
}
