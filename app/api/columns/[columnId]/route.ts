// app/api/columns/[columnId]/route.ts
import { db } from "@/lib/db/db";
import { columns, cards } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/utils/get-current-user";

export async function GET(request: NextRequest, context: any) {
  try {
    const columnId = context.params.columnId;

    const column = await db.query.columns.findFirst({
      where: eq(columns.id, columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    return NextResponse.json(column);
  } catch (error) {
    console.error("Error fetching column:", error);
    return NextResponse.json(
      { error: "Failed to fetch column" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const columnId = context.params.columnId;
    const body = await request.json();
    const { name, color, position } = body;

    // Find the column
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Validate input
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Column name cannot be empty" },
          { status: 400 }
        );
      }

      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: "Column name must be 50 characters or less" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Partial<typeof columns.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (position !== undefined) updateData.position = position;

    // Update the column
    const [updatedColumn] = await db
      .update(columns)
      .set(updateData)
      .where(eq(columns.id, columnId))
      .returning();

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const columnId = context.params.columnId;

    // Find the column
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }
    const [cardCount] = await db
      .select({ count: count() })
      .from(cards)
      .where(eq(cards.columnId, columnId));

    if (cardCount.count > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete column with cards. Please move or delete all cards first.",
        },
        { status: 400 }
      );
    }

    // Delete the column
    await db.delete(columns).where(eq(columns.id, columnId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
