// lib/services/tasks/index.ts
import { TaskCRUDService } from "./crud";
import { TaskQueryService } from "./queries";
import { BaseTaskService } from "./base";

// Import types from the correct location
import type {
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  CardFilters,
  CardWithRelations,
  PaginationOptions,
  SortOptions,
  CardQueryResult,
} from "@/types";

// Re-export types for convenience
export type {
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  CardFilters,
  CardWithRelations,
  PaginationOptions,
  SortOptions,
  CardQueryResult,
} from "@/types";

/**
 * Main Task Service - Combines all task/card operations
 */
export class TaskService extends TaskCRUDService {
  // CRUD Operations (inherited from TaskCRUDService)
  static createCard = TaskCRUDService.createCard;
  static getCardById = TaskCRUDService.getCardById;
  static updateCard = TaskCRUDService.updateCard;
  static moveCard = TaskCRUDService.moveCard;
  static archiveCard = TaskCRUDService.archiveCard;
  static restoreCard = TaskCRUDService.restoreCard;
  static deleteCard = TaskCRUDService.deleteCard;

  // Query Operations (from TaskQueryService)
  static getCardsByProject = TaskQueryService.getCardsByProject;
  static getCardsByColumn = TaskQueryService.getCardsByColumn;
  static getCardsAssignedToUser = TaskQueryService.getCardsAssignedToUser;
  static getOverdueCards = TaskQueryService.getOverdueCards;
  static searchCards = TaskQueryService.searchCards;
  static getProjectCardsStats = TaskQueryService.getProjectCardsStats;

  // Utility Operations (from BaseTaskService)
  static getNextCardPosition = BaseTaskService.getNextCardPosition;
  static canUserCreateCardsInProject =
    BaseTaskService.canUserCreateCardsInProject;
  static canUserEditCard = BaseTaskService.canUserEditCard;
  static getProjectAssignees = BaseTaskService.getProjectAssignees;
  static updateCardPositions = BaseTaskService.updateCardPositions;

  /**
   * Bulk operations
   */
  static async bulkUpdateCards(
    cardIds: string[],
    updates: Partial<UpdateCardInput>,
    userId: string
  ): Promise<void> {
    // Check permissions for all cards
    const permissionChecks = await Promise.all(
      cardIds.map((cardId) => this.canUserEditCard(userId, cardId))
    );

    if (!permissionChecks.every(Boolean)) {
      throw new Error("Insufficient permissions to edit one or more cards");
    }

    // Update all cards
    await Promise.all(
      cardIds.map((cardId) =>
        this.updateCard({ id: cardId, ...updates }, userId)
      )
    );
  }

  static async bulkArchiveCards(
    cardIds: string[],
    userId: string
  ): Promise<void> {
    await Promise.all(
      cardIds.map((cardId) => this.archiveCard(cardId, userId))
    );
  }

  static async duplicateCard(
    cardId: string,
    userId: string,
    overrides?: Partial<CreateCardInput>
  ): Promise<CardWithRelations> {
    const originalCard = await this.getCardById(cardId);

    const canEdit = await this.canUserEditCard(userId, cardId);
    if (!canEdit) {
      throw new Error("Insufficient permissions to duplicate this card");
    }

    const newCardData: CreateCardInput = {
      columnId: originalCard.columnId,
      title: `${originalCard.title} (Copy)`,
      description: originalCard.description,
      assigneeId: originalCard.assigneeId,
      priority: originalCard.priority,
      startDate: originalCard.startDate,
      dueDate: originalCard.dueDate,
      status: originalCard.status,
      ...overrides,
    };

    return this.createCard(newCardData, userId);
  }
}

// Default export
export default TaskService;
