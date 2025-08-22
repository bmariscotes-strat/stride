// lib/services/tasks/crud.ts
import { db } from "@/lib/db/db";
import {
  cards,
  columns,
  users,
  cardLabels,
  cardComments,
} from "@/lib/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";
import {
  BaseTaskService,
  type CreateCardInput,
  type UpdateCardInput,
  type MoveCardInput,
} from "./base";
import type { CardWithRelations } from "@/types";
import { ActivityService } from "@/lib/services/activity";
import { NotificationService } from "@/lib/services/notification";

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

    // Check permissions
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
        status: input.status,
        ownerId: userId,
        isArchived: false,
        schemaVersion: 1,
      })
      .returning();

    // Log activity and send notifications
    try {
      await NotificationService.notifyCardCreated(
        userId,
        column.project.id,
        newCard.id,
        newCard.title,
        column.name
      );

      // If assigned to someone, send additional assignment notification
      if (input.assigneeId && input.assigneeId !== userId) {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, input.assigneeId),
        });

        if (assignee) {
          await NotificationService.notifyCardAssigned(
            userId,
            column.project.id,
            newCard.id,
            newCard.title,
            input.assigneeId,
            `${assignee.firstName} ${assignee.lastName}`.trim()
          );
        }
      }
    } catch (error) {
      console.error("Failed to log activity/send notifications:", error);
      // Don't fail the main operation
    }

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
      color: labelItem.label.color,
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
    const canEdit = await TaskCRUDService.canUserEditCard(userId, input.id);
    if (!canEdit) {
      throw new Error("Insufficient permissions to edit this card");
    }

    // Get current card state for comparison
    const currentCard = await TaskCRUDService.getCardById(input.id);

    // If moving to a different column, validate the new column
    if (input.columnId && input.columnId !== currentCard.columnId) {
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

    // Prepare update data
    const updateData: Partial<typeof cards.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Track changes for activity logging
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    // Only include fields that are being updated and track changes
    if (input.title !== undefined && input.title !== currentCard.title) {
      updateData.title = input.title;
      changes.push({
        field: "title",
        oldValue: currentCard.title,
        newValue: input.title,
      });
    }

    if (
      input.description !== undefined &&
      input.description !== currentCard.description
    ) {
      updateData.description = input.description;
      changes.push({
        field: "description",
        oldValue: currentCard.description,
        newValue: input.description,
      });
    }

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== currentCard.assigneeId
    ) {
      updateData.assigneeId = input.assigneeId;
      changes.push({
        field: "assigneeId",
        oldValue: currentCard.assigneeId,
        newValue: input.assigneeId,
      });
    }

    if (
      input.priority !== undefined &&
      input.priority !== currentCard.priority
    ) {
      updateData.priority = input.priority;
      changes.push({
        field: "priority",
        oldValue: currentCard.priority,
        newValue: input.priority,
      });
    }

    if (
      input.startDate !== undefined &&
      input.startDate !== currentCard.startDate
    ) {
      updateData.startDate = input.startDate;
      changes.push({
        field: "startDate",
        oldValue: currentCard.startDate,
        newValue: input.startDate,
      });
    }

    if (input.dueDate !== undefined && input.dueDate !== currentCard.dueDate) {
      updateData.dueDate = input.dueDate;
      changes.push({
        field: "dueDate",
        oldValue: currentCard.dueDate,
        newValue: input.dueDate,
      });
    }

    if (input.status !== undefined && input.status !== currentCard.status) {
      updateData.status = input.status;
      changes.push({
        field: "status",
        oldValue: currentCard.status,
        newValue: input.status,
      });
    }

    if (input.position !== undefined) updateData.position = input.position;
    if (input.columnId !== undefined) updateData.columnId = input.columnId;

    // Update the card
    await db.update(cards).set(updateData).where(eq(cards.id, input.id));

    // Log activities and send notifications for significant changes
    try {
      const projectId = currentCard.column?.projectId;

      if (projectId) {
        // Log general card update if there are changes
        if (changes.length > 0) {
          await ActivityService.logCardUpdated(
            userId,
            projectId,
            input.id,
            changes
          );
        }

        // Handle assignment change notifications
        if (
          input.assigneeId !== undefined &&
          input.assigneeId !== currentCard.assigneeId
        ) {
          const previousAssignee = currentCard.assignee;
          let newAssignee = null;

          if (input.assigneeId) {
            newAssignee = await db.query.users.findFirst({
              where: eq(users.id, input.assigneeId),
            });
          }

          if (input.assigneeId) {
            // Card was assigned
            await NotificationService.notifyCardAssigned(
              userId,
              projectId,
              input.id,
              currentCard.title,
              input.assigneeId,
              newAssignee
                ? `${newAssignee.firstName} ${newAssignee.lastName}`.trim()
                : "Unknown User",
              previousAssignee?.id,
              previousAssignee
                ? `${previousAssignee.firstName} ${previousAssignee.lastName}`.trim()
                : undefined
            );
          } else if (previousAssignee) {
            // Card was unassigned
            await ActivityService.logCardUnassigned(
              userId,
              projectId,
              input.id,
              currentCard.title,
              previousAssignee.id,
              `${previousAssignee.firstName} ${previousAssignee.lastName}`.trim()
            );
          }
        }

        // Handle due date change notifications
        if (
          input.dueDate !== undefined &&
          input.dueDate !== currentCard.dueDate &&
          input.dueDate
        ) {
          await NotificationService.notifyCardDueDateChanged(
            userId,
            projectId,
            input.id,
            currentCard.title,
            input.dueDate,
            currentCard.dueDate || undefined
          );
        }

        // Handle priority change
        if (
          input.priority !== undefined &&
          input.priority !== currentCard.priority
        ) {
          await ActivityService.logCardPriorityChanged(
            userId,
            projectId,
            input.id,
            currentCard.title,
            currentCard.priority || "none",
            input.priority || "none"
          );
        }
      }
    } catch (error) {
      console.error("Failed to log activity/send notifications:", error);
      // Don't fail the main operation
    }

    return TaskCRUDService.getCardById(input.id);
  }

  /**
   * Move card to different column with position
   */
  static async moveCard(
    input: MoveCardInput,
    userId: string
  ): Promise<CardWithRelations> {
    const canEdit = await TaskCRUDService.canUserEditCard(userId, input.cardId);
    if (!canEdit) {
      throw new Error("Insufficient permissions to move this card");
    }

    const card = await TaskCRUDService.getCardById(input.cardId);
    const oldColumnId = card.columnId;
    const oldPosition = card.position;

    // Get column names for notifications
    const [oldColumn, newColumn] = await Promise.all([
      db.query.columns.findFirst({ where: eq(columns.id, oldColumnId) }),
      db.query.columns.findFirst({ where: eq(columns.id, input.newColumnId) }),
    ]);

    if (!oldColumn || !newColumn) {
      throw new Error("Column not found");
    }

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
      // Check permissions for target column
      const canCreateInProject =
        await TaskCRUDService.canUserCreateCardsInProject(
          userId,
          newColumn.projectId
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

      // Log activity and send notifications for column moves
      try {
        await NotificationService.notifyCardMoved(
          userId,
          newColumn.projectId,
          input.cardId,
          card.title,
          oldColumnId,
          input.newColumnId,
          oldColumn.name,
          newColumn.name
        );
      } catch (error) {
        console.error("Failed to log move activity/send notifications:", error);
        // Don't fail the main operation
      }
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

    const card = await TaskCRUDService.getCardById(cardId);

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

    // Log activity
    try {
      const projectId = card.column?.projectId;
      const columnName = card.column?.name || "Unknown Column";

      if (projectId) {
        await ActivityService.logCardDeleted(
          userId,
          projectId,
          cardId,
          card.title,
          columnName
        );
      }
    } catch (error) {
      console.error("Failed to log archive activity:", error);
    }
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

    // Log activity
    try {
      await ActivityService.logCardCreated(
        userId,
        card.column.project.id,
        cardId,
        card.title,
        card.column.name
      );
    } catch (error) {
      console.error("Failed to log restore activity:", error);
    }

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

    const card = await TaskCRUDService.getCardById(cardId);

    if (!card) {
      throw new Error("Card not found");
    }

    // Log activity before deletion
    try {
      const projectId = card.column?.projectId;
      const columnName = card.column?.name || "Unknown Column";

      if (projectId) {
        await ActivityService.logCardDeleted(
          userId,
          projectId,
          cardId,
          card.title,
          columnName
        );
      }
    } catch (error) {
      console.error("Failed to log delete activity:", error);
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
