import { useCallback } from "react";
import { useKanbanStore } from "@/stores/views/board-store";
import { useProjectRealtime } from "@/hooks/websocket/useProjectRealTime";
import type { CardWithRelations } from "@/types";
import { Card } from "@/types/forms/tasks";

interface RealtimeEventData {
  card: CardWithRelations;
  columnId?: string;
  fromColumnId?: string;
  toColumnId?: string;
  userId: string;
  timestamp: string;
}

export function useKanbanRealtime(
  projectId: string,
  projectSlug: string,
  userId: string,
  debouncedRefresh: () => void
) {
  const { moveCard, reorderCardsInColumn, addCard, removeCard, updateCard } =
    useKanbanStore();

  // Real-time event handlers
  const handleCardCreated = useCallback(
    (event: RealtimeEventData) => {
      const { card, columnId } = event;

      // Add the new card to the Zustand store
      if (columnId && card) {
        addCard(projectSlug, columnId, card as Card);
        console.log(`New card created: ${card.title}`);
      }
    },
    [projectSlug, addCard]
  );

  const handleCardUpdated = useCallback(
    (event: RealtimeEventData) => {
      const { card } = event;

      if (card) {
        updateCard(projectSlug, card.id, card as Card);
        console.log(`Card updated: ${card.title}`);
      }
    },
    [projectSlug, updateCard]
  );

  const handleCardMoved = useCallback(
    (event: any) => {
      const { card, fromColumnId, toColumnId, toPosition } = event;

      if (card && fromColumnId && toColumnId) {
        // Update the store with the moved card
        moveCard(projectSlug, card.id, toColumnId, toPosition || 0);
        console.log(`Card moved: ${card.title}`);
      }
    },
    [projectSlug, moveCard]
  );

  const handleCardArchived = useCallback(
    (event: any) => {
      const { cardId, columnId } = event;

      if (cardId && columnId) {
        removeCard(projectSlug, columnId, cardId);
        console.log("Card archived");
      }
    },
    [projectSlug, removeCard]
  );

  const handleCardDeleted = useCallback(
    (event: any) => {
      const { cardId, columnId, title } = event;

      if (cardId && columnId) {
        removeCard(projectSlug, columnId, cardId);
        console.log(`Card deleted: ${title}`);
      }
    },
    [projectSlug, removeCard]
  );

  const handleRealtimeError = useCallback(
    (error: any) => {
      console.error("Real-time connection error:", error);

      // Optionally refresh data when connection fails
      setTimeout(() => {
        debouncedRefresh();
      }, 5000);
    },
    [debouncedRefresh]
  );

  // Subscribe to real-time updates
  useProjectRealtime(
    projectId,
    {
      onCardCreated: handleCardCreated,
      onCardUpdated: handleCardUpdated,
      onCardMoved: handleCardMoved,
      onCardArchived: handleCardArchived,
      onCardDeleted: handleCardDeleted,
      onError: handleRealtimeError,
    },
    userId
  );

  return {
    handleCardCreated,
    handleCardUpdated,
    handleCardMoved,
    handleCardArchived,
    handleCardDeleted,
  };
}
