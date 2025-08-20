import { TaskCRUDService } from "@/lib/services/tasks/crud";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/utils/get-current-user";

export async function PATCH(request: NextRequest, context: any) {
  try {
    const userId = await getRequiredUserId();

    const { cardId } = context.params;
    const body = await request.json();
    const { newColumnId, newPosition } = body;

    if (!newColumnId || newPosition === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: newColumnId, newPosition" },
        { status: 400 }
      );
    }

    const updatedCard = await TaskCRUDService.moveCard(
      {
        cardId,
        newColumnId,
        newPosition,
      },
      userId
    );

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error("Error moving card:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to move card" },
      { status: 500 }
    );
  }
}
