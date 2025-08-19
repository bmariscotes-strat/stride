// app/api/projects/[projectId]/cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/users";
import { TaskCRUDService } from "@/lib/services/tasks/crud"; // Import the class
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { z } from "zod";

const createCardSchema = z.object({
  columnId: z.string().min(1, "Column ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(), // ISO string
  startDate: z.string().nullable().optional(), // ISO string
  status: z.string().nullable().optional(),
  position: z.number().optional(),
});

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
    const validatedData = createCardSchema.parse(body);

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, projectId);

    if (!permissionChecker.canCreateCards()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert date strings to Date objects if provided
    const dueDate = validatedData.dueDate
      ? new Date(validatedData.dueDate)
      : null;

    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : null;

    // Create the card using the static method
    const newCard = await TaskCRUDService.createCard(
      {
        columnId: validatedData.columnId,
        title: validatedData.title,
        description: validatedData.description || null,
        priority: validatedData.priority || null,
        assigneeId: validatedData.assigneeId || null,
        dueDate,
        startDate,
        status: validatedData.status || null,
        position: validatedData.position,
      },
      currentUser.id
    );

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific error messages from the service
      if (
        error.message.includes("permissions") ||
        error.message.includes("access")
      ) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
