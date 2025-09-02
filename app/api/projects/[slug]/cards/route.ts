// app/api/projects/[slug]/cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/users";
import { TaskCRUDService } from "@/lib/services/tasks/crud";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { db } from "@/lib/db/db";
import { columns, cardLabels, cards, projects } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { UpdateCardInput } from "@/types/forms/tasks";

const createCardSchema = z.object({
  columnId: z.string().min(1, "Column ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  position: z.number().optional(),
  labelIds: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slug: projectId } = resolvedParams;

    const body = await request.json();
    console.log("API received body:", body);

    // Validate input
    const validatedData = createCardSchema.parse(body);
    console.log("Validated data:", validatedData);

    // Verify that the column exists and belongs to the project
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, validatedData.columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      console.error("Column not found:", validatedData.columnId);
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Verify project ownership
    const normalizedUrlProjectId = projectId.toString().trim();
    const normalizedColumnProjectId = column.projectId?.toString().trim();

    if (normalizedColumnProjectId !== normalizedUrlProjectId) {
      console.error("Project ID mismatch");
      return NextResponse.json(
        { error: "Column does not belong to this project" },
        { status: 400 }
      );
    }

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

    console.log("Creating card with TaskCRUDService...");

    // Create the card
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

    console.log("Card created successfully:", newCard);

    // Handle label associations if provided
    if (validatedData.labelIds && validatedData.labelIds.length > 0) {
      console.log("Adding labels to card:", validatedData.labelIds);

      // Insert label associations
      const labelInserts = validatedData.labelIds.map((labelId) => ({
        cardId: newCard.id,
        labelId: labelId,
      }));

      await db.insert(cardLabels).values(labelInserts);
      console.log("Labels added to card successfully");
    }

    // Fetch the created card with all relations for response
    const cardWithRelations = await db.query.cards.findFirst({
      where: eq(cards.id, newCard.id),
      with: {
        assignee: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        labels: {
          with: {
            label: true,
          },
        },
      },
    });

    return NextResponse.json(cardWithRelations, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);

    if (error instanceof z.ZodError) {
      console.error("Validation error:", error);
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("Error message:", error.message);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slug: projectSlug } = resolvedParams;

    // First, find the project by slug to get the project ID
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
      columns: {
        id: true,
        slug: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // TODO: Add permission check back later
    // const permissionChecker = new ProjectPermissionChecker();
    // await permissionChecker.loadContext(currentUser.id, project.id);
    // if (!permissionChecker.canViewCards?.()) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // Get all columns for this project first
    const projectColumns = await db.query.columns.findMany({
      where: eq(columns.projectId, project.id),
      columns: {
        id: true,
      },
    });

    const columnIds = projectColumns.map((col) => col.id);

    if (columnIds.length === 0) {
      // No columns means no cards
      return NextResponse.json([]);
    }

    // Fetch all cards for the project columns
    const projectCards = await db.query.cards.findMany({
      where: (cards, { eq, and, isNull, or, inArray }) =>
        and(
          inArray(cards.columnId, columnIds),
          // Only fetch non-archived cards unless specifically requested
          or(isNull(cards.isArchived), eq(cards.isArchived, false))
        ),
      with: {
        column: {
          columns: {
            id: true,
            name: true,
            projectId: true,
          },
        },
        assignee: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        labels: {
          with: {
            label: true,
          },
        },
      },
      orderBy: (cards, { asc }) => [asc(cards.position)],
    });

    // Transform the data to match the expected Card type structure
    const transformedCards = projectCards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      dueDate: card.dueDate,
      startDate: card.startDate,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      columnId: card.columnId,
      assigneeId: card.assigneeId,
      archived: card.isArchived || false,
      position: card.position,
      ownerId: card.ownerId,
      // Relations
      column: card.column
        ? {
            id: card.column.id,
            name: card.column.name,
            projectId: card.column.projectId,
          }
        : undefined,
      assignee: card.assignee
        ? {
            id: card.assignee.id,
            firstName: card.assignee.firstName,
            lastName: card.assignee.lastName,
            email: card.assignee.email,
            avatarUrl: card.assignee.avatarUrl,
          }
        : undefined,
      labels: card.labels?.map((cl) => cl.label) || [],
    }));

    return NextResponse.json(transformedCards);
  } catch (error) {
    console.error("Error fetching cards:", error);

    if (error instanceof Error) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { slug: cardId } = resolvedParams;

    const body = await request.json();
    const { startDate, dueDate, ...otherFields } = body;

    // Convert date strings to Date objects if provided
    const processedStartDate = startDate ? new Date(startDate) : undefined;
    const processedDueDate = dueDate ? new Date(dueDate) : undefined;

    // Validation: ensure startDate is not after dueDate
    if (processedStartDate && processedDueDate) {
      if (processedStartDate > processedDueDate) {
        return NextResponse.json(
          { error: "Start date cannot be after due date" },
          { status: 400 }
        );
      }
    }

    // Create the UpdateCardInput object with the card ID and other fields
    const updateInput: UpdateCardInput = {
      id: cardId,
      ...otherFields,
      ...(processedStartDate !== undefined && {
        startDate: processedStartDate,
      }),
      ...(processedDueDate !== undefined && { dueDate: processedDueDate }),
    };

    // Update the card in your database
    const updatedCard = await TaskCRUDService.updateCard(
      updateInput,
      currentUser.id
    );

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error("Error updating card:", error);

    if (error instanceof Error) {
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
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}
