import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { User, Calendar } from "lucide-react";

// Types based on your schema
interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  priority: "high" | "medium" | "low" | null;
  dueDate: Date | null;
  position: number;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
}

interface Column {
  id: string;
  name: string;
  position: number;
  color: string | null;
  projectId: string;
  cards: Card[];
}

interface KanbanBoardProps {
  projectId: string;
  projectSlug: string;
  userId: string;
  canEditCards?: boolean;
}

// Draggable Card Component
function DraggableCard({
  card,
  projectSlug,
}: {
  card: Card;
  projectSlug: string;
}) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({
    id: card.id,
  });

  // Update local dragging state
  React.useEffect(() => {
    setIsDragging(dndIsDragging);
  }, [dndIsDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityColor = (priority: Card["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-red-400 bg-red-50";
      case "medium":
        return "border-l-yellow-400 bg-yellow-50";
      case "low":
        return "border-l-green-400 bg-green-50";
      default:
        return "border-l-gray-300 bg-white";
    }
  };

  // Handle card click - navigate to card detail page
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if we're in the middle of dragging
    if (isDragging) {
      return;
    }

    // Prevent navigation during drag operations
    e.preventDefault();
    e.stopPropagation();

    // Navigate to the card detail page
    router.push(`/projects/${projectSlug}/cards/${card.id}`);
  };

  // Separate drag handlers to prevent conflicts with click
  const dragHandlers = {
    ...attributes,
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      // Call the original drag handler
      if (listeners?.onMouseDown) {
        listeners.onMouseDown(e as any);
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      // Call the original drag handler
      if (listeners?.onTouchStart) {
        listeners.onTouchStart(e as any);
      }
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragHandlers}
      onClick={handleCardClick}
      className={`p-3 mb-3 rounded-lg border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 ${getPriorityColor(card.priority)} ${
        isDragging ? "cursor-grabbing" : "cursor-pointer hover:scale-[1.02]"
      }`}
    >
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {card.title}
      </h4>

      {card.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {card.assignee && (
            <div className="flex items-center space-x-1">
              {card.assignee.avatarUrl ? (
                <img
                  src={card.assignee.avatarUrl}
                  alt={`${card.assignee.firstName} ${card.assignee.lastName}`}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
              )}
              <span className="text-xs text-gray-600">
                {card.assignee.firstName} {card.assignee.lastName}
              </span>
            </div>
          )}
        </div>

        {card.dueDate && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{formatDate(card.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  column,
  children,
}: {
  column: Column;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 rounded-lg p-4 min-w-80 max-w-80 flex flex-col ${
        isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          {column.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <span>{column.name}</span>
          <span className="text-sm font-normal text-gray-500">
            ({column.cards.length})
          </span>
        </h3>
      </div>

      <div className="flex-1 min-h-32">
        <SortableContext
          items={column.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

// Main Kanban Board Component
export default function KanbanBoard({
  projectId,
  projectSlug,
  userId,
  canEditCards = true,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure sensors for drag and drop with adjusted activation constraints
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before drag starts on touch
        tolerance: 5,
      },
    })
  );

  // Fetch project columns and cards
  useEffect(() => {
    const fetchKanbanData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch columns for the project
        const columnsResponse = await fetch(
          `/api/projects/${projectSlug}/columns`
        );
        if (!columnsResponse.ok) {
          throw new Error("Failed to fetch columns");
        }
        const columnsData = await columnsResponse.json();

        // Fetch cards for each column
        const columnsWithCards = await Promise.all(
          columnsData.map(async (column: any) => {
            const cardsResponse = await fetch(
              `/api/columns/${column.id}/cards`
            );
            const cardsData = cardsResponse.ok
              ? await cardsResponse.json()
              : [];

            return {
              ...column,
              cards: cardsData.sort(
                (a: Card, b: Card) => a.position - b.position
              ),
            };
          })
        );

        // Sort columns by position
        const sortedColumns = columnsWithCards.sort(
          (a, b) => a.position - b.position
        );
        setColumns(sortedColumns);
      } catch (err) {
        console.error("Error fetching kanban data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (projectSlug) {
      fetchKanbanData();
    }
  }, [projectSlug]);

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

    // If moving to the same column, handle reordering
    if (activeCard.columnId === overColumn.id) {
      const columnCards = overColumn.cards;
      const oldIndex = columnCards.findIndex(
        (card) => card.id === activeCard.id
      );
      const newIndex =
        over.id === overColumn.id
          ? columnCards.length
          : columnCards.findIndex((card) => card.id === over.id);

      if (oldIndex === newIndex) return;

      // Update local state optimistically
      const newCards = [...columnCards];
      const [movedCard] = newCards.splice(oldIndex, 1);
      newCards.splice(newIndex, 0, movedCard);

      const updatedColumns = columns.map((col) =>
        col.id === overColumn.id
          ? {
              ...col,
              cards: newCards.map((card, index) => ({
                ...card,
                position: index,
              })),
            }
          : col
      );
      setColumns(updatedColumns);

      // Update database
      try {
        await fetch(`/api/cards/${activeCard.id}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newColumnId: overColumn.id,
            newPosition: newIndex,
          }),
        });
      } catch (error) {
        console.error("Failed to update card position:", error);
        // Revert optimistic update on error
        setColumns(columns);
      }
    } else {
      // Moving to different column
      const sourceColumn = columns.find(
        (col) => col.id === activeCard.columnId
      );
      if (!sourceColumn) return;

      const newIndex =
        over.id === overColumn.id
          ? overColumn.cards.length
          : overColumn.cards.findIndex((card) => card.id === over.id);

      // Update local state optimistically
      const sourceCards = sourceColumn.cards.filter(
        (card) => card.id !== activeCard.id
      );
      const targetCards = [...overColumn.cards];
      const updatedCard = {
        ...activeCard,
        columnId: overColumn.id,
        position: newIndex,
      };
      targetCards.splice(newIndex, 0, updatedCard);

      const updatedColumns = columns.map((col) => {
        if (col.id === sourceColumn.id) {
          return {
            ...col,
            cards: sourceCards.map((card, index) => ({
              ...card,
              position: index,
            })),
          };
        }
        if (col.id === overColumn.id) {
          return {
            ...col,
            cards: targetCards.map((card, index) => ({
              ...card,
              position: index,
            })),
          };
        }
        return col;
      });
      setColumns(updatedColumns);

      // Update database
      try {
        await fetch(`/api/cards/${activeCard.id}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newColumnId: overColumn.id,
            newPosition: newIndex,
          }),
        });
      } catch (error) {
        console.error("Failed to move card:", error);
        // Revert optimistic update on error
        setColumns(columns);
      }
    }
  };

  if (loading) {
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
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-6 p-6 min-w-max">
          {columns.map((column) => (
            <DroppableColumn key={column.id} column={column}>
              {column.cards.map((card) => (
                <DraggableCard
                  key={card.id}
                  card={card}
                  projectSlug={projectSlug}
                />
              ))}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {activeCard && (
            <DraggableCard card={activeCard} projectSlug={projectSlug} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
