import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { ListTodo, RefreshCw } from "lucide-react";
import { Card } from "@/types/forms/tasks";
import { useKanbanStore } from "@/stores/views/board-store";
import { AddColumnCard } from "@/components/views/kanban/AddColumnCard";
import { DraggableCard } from "@/components/views/kanban/DraggableCard";
import { DroppableColumn } from "@/components/views/kanban/DroppableColumn";
import { useKanbanRefetch } from "@/hooks/kanban/useKanbanRefetch";
import { useKanbanRealtime } from "@/hooks/kanban/useKanbanRealtime";
import type { KanbanBoardProps } from "@/types/forms/tasks";
import { toast } from "sonner";

export default function KanbanBoard({
  projectId,
  projectSlug,
  userId,
  canEditCards = true,
  onDataChange,
  refreshTrigger,
}: KanbanBoardProps) {
  const {
    columns,
    loading,
    error,
    isRefetching,
    debouncedRefresh,
    manualRefresh,
  } = useKanbanRefetch(projectSlug, onDataChange);

  const { moveCard, reorderCardsInColumn } = useKanbanStore();
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Setup real-time handlers
  useKanbanRealtime(projectId, projectSlug, userId, debouncedRefresh);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Handle external refresh triggers
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      debouncedRefresh();
    }
  }, [refreshTrigger, debouncedRefresh]);

  const handleColumnAdded = () => {
    debouncedRefresh();
  };

  const handleColumnUpdated = () => {
    debouncedRefresh();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = columns
      .flatMap((col) => col.cards)
      .find((card) => card.id === active.id);

    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !canEditCards) return;

    const activeCard = columns
      .flatMap((col) => col.cards)
      .find((card) => card.id === active.id);

    if (!activeCard) return;

    const overColumn = columns.find(
      (col) =>
        col.id === over.id || col.cards.some((card) => card.id === over.id)
    );

    if (!overColumn) return;

    // Same column reordering
    if (activeCard.columnId === overColumn.id) {
      const columnCards = overColumn.cards;
      const oldIndex = columnCards.findIndex(
        (card) => card.id === activeCard.id
      );
      const newIndex =
        over.id === overColumn.id
          ? columnCards.length - 1
          : columnCards.findIndex((card) => card.id === over.id);

      if (oldIndex === newIndex) return;

      const newCards = [...columnCards];
      const [movedCard] = newCards.splice(oldIndex, 1);
      newCards.splice(newIndex, 0, movedCard);

      const cardOrders = newCards.map((card, index) => ({
        id: card.id,
        position: index,
      }));
      reorderCardsInColumn(projectSlug, overColumn.id, cardOrders);
      try {
        const response = await fetch(`/api/cards/${activeCard.id}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newColumnId: overColumn.id,
            newPosition: newIndex,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          toast.error(data.error || "Failed to move card");
          return;
        }
      } catch (error) {
        toast.error("Something went wrong");
        console.error("Failed to update card position:", error);
        debouncedRefresh();
      }
    } else {
      // Moving to different column
      const newIndex =
        over.id === overColumn.id
          ? overColumn.cards.length
          : overColumn.cards.findIndex((card) => card.id === over.id);

      // Update Zustand store optimistically
      moveCard(projectSlug, activeCard.id, overColumn.id, newIndex);

      try {
        const response = await fetch(`/api/cards/${activeCard.id}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newColumnId: overColumn.id,
            newPosition: newIndex,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to move card");
        }
      } catch (error) {
        console.error("Failed to move card:", error);
        debouncedRefresh();
      }
    }
  };

  if (loading && columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Kanban board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading Kanban board</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={manualRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (columns.length > 0 && columns.every((col) => col.cards.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <ListTodo className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="text-lg font-medium mb-1">No tasks yet</p>
        <p className="text-sm">Tasks will appear here once created</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto custom-scrollbar relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-6 p-6 min-w-max">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              projectSlug={projectSlug}
              onColumnUpdated={handleColumnUpdated}
            >
              {column.cards.map((card) => (
                <DraggableCard
                  key={card.id}
                  card={card}
                  projectSlug={projectSlug}
                  userId={userId}
                  canUserEditCards={canEditCards}
                />
              ))}
            </DroppableColumn>
          ))}

          {canEditCards && (
            <AddColumnCard
              projectSlug={projectSlug}
              onColumnAdded={handleColumnAdded}
              position={columns.length}
            />
          )}
        </div>

        <DragOverlay>
          {activeCard && (
            <DraggableCard
              card={activeCard}
              projectSlug={projectSlug}
              userId={userId}
              canUserEditCards={canEditCards}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
