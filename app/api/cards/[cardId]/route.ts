// app/api/cards/[cardId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/users";
import { db } from "@/lib/db/db";
import { cards, columns, users, labels, cardLabels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";

export async function GET(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = params;

    // First, get the basic card data with available relations
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
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

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Manually fetch the column and project data
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, card.columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Check permissions - user should be able to view the project to see the card
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, column.project.id);

    if (!permissionChecker.canViewProject()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Format the response
    const formattedCard = {
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
      column: {
        id: column.id,
        name: column.name,
        projectId: column.projectId,
      },
      assignee: card.assignee
        ? {
            id: card.assignee.id,
            firstName: card.assignee.firstName,
            lastName: card.assignee.lastName,
            email: card.assignee.email,
            avatarUrl: card.assignee.avatarUrl,
          }
        : null,
      labels: card.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
    };

    return NextResponse.json(formattedCard);
  } catch (error) {
    console.error("Error fetching card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = params;
    const body = await request.json();

    // First, get the existing card to check permissions
    const existingCard = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Manually fetch the column and project data for permission checking
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, existingCard.columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, column.project.id);

    if (
      !permissionChecker.canEditCards() &&
      existingCard.assigneeId !== currentUser.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.columnId !== undefined) updateData.columnId = body.columnId;

    // Handle date fields
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }

    // Update the card
    const [updatedCard] = await db
      .update(cards)
      .set(updateData)
      .where(eq(cards.id, cardId))
      .returning();

    // Handle label updates if provided
    if (body.labelIds !== undefined) {
      // First, remove all existing label associations
      await db.delete(cardLabels).where(eq(cardLabels.cardId, cardId));

      // Then add new label associations
      if (body.labelIds.length > 0) {
        const labelAssociations = body.labelIds.map((labelId: string) => ({
          cardId: cardId,
          labelId: labelId,
        }));

        await db.insert(cardLabels).values(labelAssociations);
      }
    }

    // Fetch the updated card with all relations using the same approach as GET
    const cardWithRelations = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
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

    if (!cardWithRelations) {
      return NextResponse.json(
        { error: "Card not found after update" },
        { status: 404 }
      );
    }

    // Manually fetch the updated column data
    const updatedColumn = await db.query.columns.findFirst({
      where: eq(columns.id, cardWithRelations.columnId),
      with: {
        project: true,
      },
    });

    if (!updatedColumn) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Format the response
    const formattedCard = {
      id: cardWithRelations.id,
      title: cardWithRelations.title,
      description: cardWithRelations.description,
      priority: cardWithRelations.priority,
      dueDate: cardWithRelations.dueDate,
      startDate: cardWithRelations.startDate,
      createdAt: cardWithRelations.createdAt,
      updatedAt: cardWithRelations.updatedAt,
      columnId: cardWithRelations.columnId,
      assigneeId: cardWithRelations.assigneeId,
      column: {
        id: updatedColumn.id,
        name: updatedColumn.name,
        projectId: updatedColumn.projectId,
      },
      assignee: cardWithRelations.assignee
        ? {
            id: cardWithRelations.assignee.id,
            firstName: cardWithRelations.assignee.firstName,
            lastName: cardWithRelations.assignee.lastName,
            email: cardWithRelations.assignee.email,
            avatarUrl: cardWithRelations.assignee.avatarUrl,
          }
        : null,
      labels: cardWithRelations.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
    };

    return NextResponse.json(formattedCard);
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = params;

    // First, get the existing card to check permissions
    const existingCard = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
    });

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Manually fetch the column and project data for permission checking
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, existingCard.columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Check permissions - only project editors or owners can delete cards
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(currentUser.id, column.project.id);

    if (!permissionChecker.canEditProject()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the card (cascade will handle related records)
    await db.delete(cards).where(eq(cards.id, cardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
