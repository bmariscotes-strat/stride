// app/api/projects/[projectId]/labels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/users";
import { LabelService } from "@/lib/services/tasks/labels";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { z } from "zod";

const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, "Label name is required")
    .max(50, "Label name too long"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
});

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

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, projectId);

    if (!permissionChecker.canViewProject()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project labels using the static method
    const labels = await LabelService.getProjectLabels(
      projectId,
      currentUser.id
    );
    return NextResponse.json(labels);
  } catch (error) {
    console.error("Error fetching project labels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = createLabelSchema.parse(body);

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, projectId);

    if (!permissionChecker.canEditProject()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create the label using the static method
    const newLabel = await LabelService.createLabel(
      {
        name: validatedData.name,
        color: validatedData.color,
        projectId,
      },
      currentUser.id
    );

    return NextResponse.json(newLabel, { status: 201 });
  } catch (error) {
    console.error("Error creating label:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
