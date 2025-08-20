// app\api\columns\[columnId]\cards\route.ts
import { db } from "@/lib/db/db";
import { cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { columnId: string } }
) {
  try {
    const columnId = params.columnId;
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    // Get cards for this column
    const columnCards = await db.query.cards.findMany({
      where: includeArchived
        ? eq(cards.columnId, columnId)
        : and(eq(cards.columnId, columnId), eq(cards.isArchived, false)),
      orderBy: (cards, { asc }) => [asc(cards.position)],
      with: {
        assignee: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(columnCards);
  } catch (error) {
    console.error("Error fetching column cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}
