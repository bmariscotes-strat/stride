import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/users";
import { LabelService } from "@/lib/services/tasks/labels";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { z } from "zod";

// Validation schema for label creation
const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, "Label name is required")
    .max(50, "Label name too long"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
});

// GET /api/projects/[slug]/labels
export async function GET(req: NextRequest, context: any) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = context.params;

    // Fetch labels for this project
    const projectLabels = await LabelService.getProjectLabels(
      slug,
      currentUser.id
    );

    return NextResponse.json(projectLabels, { status: 200 });
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/labels
export async function POST(request: NextRequest, context: any) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = context.params;
    const body = await request.json();

    // Validate input
    const validatedData = createLabelSchema.parse(body);

    // Create new label
    const newLabel = await LabelService.createLabel(
      {
        name: validatedData.name,
        color: validatedData.color,
        projectId: slug,
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
