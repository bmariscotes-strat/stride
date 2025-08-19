// lib/services/tasks/crud.ts - Fixed static method calls
import { db } from "@/lib/db/db";
import {
  cards,
  columns,
  users,
  cardLabels,
  cardComments,
} from "@/lib/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";
import { BaseTaskService } from "./base";
import type {
  CardWithRelations,
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
} from "@/types";

export class TaskCRUDService extends BaseTaskService {
  /**
   * Create a new card
   */
  static async createCard(
    input: CreateCardInput,
    userId: string
  ): Promise<CardWithRelations> {
    // Get column info to check project access
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, input.columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      throw new Error("Column not found");
    }

    // FIXED: Use static method call instead of this
    const canCreate = await TaskCRUDService.canUserCreateCardsInProject(
      userId,
      column.project.id
    );

    if (!canCreate) {
      throw new Error(
        "Insufficient permissions to create cards in this project"
      );
    }

    // Validate assignee if provided
    if (input.assigneeId) {
      const canAssign = await TaskCRUDService.canUserCreateCardsInProject(
        input.assigneeId,
        column.project.id
      );
      if (!canAssign) {
        throw new Error(
          "Cannot assign card to user who doesn't have project access"
        );
      }
    }

    // FIXED: Use static method call
    const position =
      input.position ??
      (await TaskCRUDService.getNextCardPosition(input.columnId));

    // Create the card
    const [newCard] = await db
      .insert(cards)
      .values({
        columnId: input.columnId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        priority: input.priority,
        startDate: input.startDate,
        dueDate: input.dueDate,
        position,
        statusColumnId: input.statusColumnId,
        ownerId: userId,
        isArchived: false,
        schemaVersion: 1,
      })
      .returning();

    // FIXED: Use static method call
    return TaskCRUDService.getCardById(newCard.id);
  }

  /**
   * Get card by ID with all relations
   */
  static async getCardById(
    cardId: string
  ): Promise<CardWithRelations & { commentsCount: number }> {
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
      with: {
        column: {
          with: {
            project: true,
          },
        },
        assignee: true,
        labels: {
          with: {
            label: true,
          },
        },
        comments: {
          with: {
            user: true,
          },
          orderBy: desc(cardComments.createdAt),
          limit: 5,
        },
        attachments: {
          with: {
            uploader: true,
          },
        },
      },
    });

    if (!card) {
      throw new Error("Card not found");
    }

    // Add comments count
    const [commentsCount] = await db
      .select({ count: count() })
      .from(cardComments)
      .where(eq(cardComments.cardId, cardId));

    // Transform labels to match CardWithRelations structure
    const transformedLabels = card.labels.map((labelItem) => ({
      ...labelItem,
      color: labelItem.label.color, // Flatten the color property
    }));

    return {
      ...card,
      labels: transformedLabels,
      commentsCount: commentsCount?.count || 0,
    } as CardWithRelations & { commentsCount: number };
  }

  /**
   * Update a card
   */
  static async updateCard(
    input: UpdateCardInput,
    userId: string
  ): Promise<CardWithRelations> {
    // FIXED: Use static method call
    const canEdit = await TaskCRUDService.canUserEditCard(userId, input.id);
    if (!canEdit) {
      throw new Error("Insufficient permissions to edit this card");
    }

    // If moving to a different column, validate the new column
    if (input.columnId) {
      const column = await db.query.columns.findFirst({
        where: eq(columns.id, input.columnId),
        with: { project: true },
      });

      if (!column) {
        throw new Error("Target column not found");
      }

      const canCreateInProject =
        await TaskCRUDService.canUserCreateCardsInProject(
          userId,
          column.project.id
        );

      if (!canCreateInProject) {
        throw new Error("Insufficient permissions to move card to this column");
      }
    }

    // Validate assignee if being updated
    if (input.assigneeId !== undefined) {
      if (input.assigneeId) {
        const currentCard = await TaskCRUDService.getCardById(input.id);
        const canAssign = await TaskCRUDService.canUserCreateCardsInProject(
          input.assigneeId,
          currentCard.column?.projectId
        );
        if (!canAssign) {
          throw new Error(
            "Cannot assign card to user who doesn't have project access"
          );
        }
      }
    }

    // Update the card
    const updateData: Partial<typeof cards.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Only include fields that are being updated
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.assigneeId !== undefined)
      updateData.assigneeId = input.assigneeId;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.position !== undefined) updateData.position = input.position;
    if (input.statusColumnId !== undefined)
      updateData.statusColumnId = input.statusColumnId;
    if (input.columnId !== undefined) updateData.columnId = input.columnId;

    await db.update(cards).set(updateData).where(eq(cards.id, input.id));

    return TaskCRUDService.getCardById(input.id);
  }

  /**
   * Move card to different column with position
   */
  static async moveCard(
    input: MoveCardInput,
    userId: string
  ): Promise<CardWithRelations> {
    // FIXED: Use static method call
    const canEdit = await TaskCRUDService.canUserEditCard(userId, input.cardId);
    if (!canEdit) {
      throw new Error("Insufficient permissions to move this card");
    }

    const card = await TaskCRUDService.getCardById(input.cardId);
    const oldColumnId = card.columnId;
    const oldPosition = card.position;

    // If moving to the same column, just update position
    if (oldColumnId === input.newColumnId) {
      if (oldPosition !== input.newPosition) {
        // Moving within same column
        if (input.newPosition > oldPosition) {
          // Moving down: decrease positions of cards between old and new position
          await TaskCRUDService.updateCardPositions(
            oldColumnId,
            oldPosition + 1,
            -1
          );
        } else {
          // Moving up: increase positions of cards between new and old position
          await TaskCRUDService.updateCardPositions(
            oldColumnId,
            input.newPosition,
            1
          );
        }

        // Update the card's position
        await db
          .update(cards)
          .set({
            position: input.newPosition,
            updatedAt: new Date(),
          })
          .where(eq(cards.id, input.cardId));
      }
    } else {
      // Moving to different column
      const newColumn = await db.query.columns.findFirst({
        where: eq(columns.id, input.newColumnId),
        with: { project: true },
      });

      if (!newColumn) {
        throw new Error("Target column not found");
      }

      // Check permissions for target column
      const canCreateInProject =
        await TaskCRUDService.canUserCreateCardsInProject(
          userId,
          newColumn.project.id
        );

      if (!canCreateInProject) {
        throw new Error("Insufficient permissions to move card to this column");
      }

      // Update positions in old column (shift cards up)
      await TaskCRUDService.updateCardPositions(
        oldColumnId,
        oldPosition + 1,
        -1
      );

      // Update positions in new column (make space)
      await TaskCRUDService.updateCardPositions(
        input.newColumnId,
        input.newPosition,
        1
      );

      // Move the card to new column and position
      await db
        .update(cards)
        .set({
          columnId: input.newColumnId,
          position: input.newPosition,
          updatedAt: new Date(),
        })
        .where(eq(cards.id, input.cardId));
    }

    return TaskCRUDService.getCardById(input.cardId);
  }

  /**
   * Archive a card (soft delete)
   */
  static async archiveCard(cardId: string, userId: string): Promise<void> {
    const canEdit = await TaskCRUDService.canUserEditCard(userId, cardId);
    if (!canEdit) {
      throw new Error("Insufficient permissions to archive this card");
    }

    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
    });

    if (!card) {
      throw new Error("Card not found");
    }

    // Archive the card
    await db
      .update(cards)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, cardId));

    // Update positions of remaining cards
    await TaskCRUDService.updateCardPositions(
      card.columnId,
      card.position + 1,
      -1
    );
  }

  /**
   * Restore an archived card
   */
  static async restoreCard(
    cardId: string,
    userId: string
  ): Promise<CardWithRelations> {
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
      with: {
        column: {
          with: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      throw new Error("Card not found");
    }

    const canEdit = await TaskCRUDService.canUserCreateCardsInProject(
      userId,
      card.column.project.id
    );

    if (!canEdit) {
      throw new Error("Insufficient permissions to restore this card");
    }

    // Get new position at end of column
    const newPosition = await TaskCRUDService.getNextCardPosition(
      card.columnId
    );

    // Restore the card
    await db
      .update(cards)
      .set({
        isArchived: false,
        position: newPosition,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, cardId));

    return TaskCRUDService.getCardById(cardId);
  }

  /**
   * Permanently delete a card
   */
  static async deleteCard(cardId: string, userId: string): Promise<void> {
    const canEdit = await TaskCRUDService.canUserEditCard(userId, cardId);
    if (!canEdit) {
      throw new Error("Insufficient permissions to delete this card");
    }

    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
    });

    if (!card) {
      throw new Error("Card not found");
    }

    // Delete the card (cascade will handle related records)
    await db.delete(cards).where(eq(cards.id, cardId));

    // Update positions of remaining cards if it wasn't archived
    if (!card.isArchived) {
      await TaskCRUDService.updateCardPositions(
        card.columnId,
        card.position + 1,
        -1
      );
    }
  }
}
