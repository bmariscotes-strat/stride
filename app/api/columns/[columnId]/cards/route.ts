import { db } from "@/lib/db/db";
import { cards, cardLabels, labels, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: any) {
  try {
    const columnId = context.params.columnId;
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const columnCards = await db
      .select({
        card: cards,
        label: labels,
        assignee: users,
      })
      .from(cards)
      .leftJoin(cardLabels, eq(cards.id, cardLabels.cardId))
      .leftJoin(labels, eq(cardLabels.labelId, labels.id))
      .leftJoin(users, eq(cards.assigneeId, users.id))
      .where(
        includeArchived
          ? eq(cards.columnId, columnId)
          : and(eq(cards.columnId, columnId), eq(cards.isArchived, false))
      )
      .orderBy(cards.position);

    // Transform: group labels under each card
    const grouped = columnCards.reduce(
      (acc, row) => {
        const cardId = row.card.id;

        if (!acc[cardId]) {
          acc[cardId] = {
            ...row.card,
            labels: [],
            assignee: row.assignee || null,
          };
        }

        if (row.label) {
          acc[cardId].labels.push(row.label);
        }

        return acc;
      },
      {} as Record<string, any>
    );

    return NextResponse.json(Object.values(grouped));
  } catch (error) {
    console.error("Error fetching column cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}
