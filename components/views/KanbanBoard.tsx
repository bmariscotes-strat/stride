import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { User, Calendar, RefreshCw, Plus, X, Check } from "lucide-react";
import { Card } from "@/types/forms/tasks";
import { MIN_FETCH_INTERVAL } from "@/lib/constants/limits";

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
  onDataChange?: () => void;
  refreshTrigger?: number;
}

// Add Column Component
function AddColumnCard({
  projectSlug,
  onColumnAdded,
  position,
}: {
  projectSlug: string;
  onColumnAdded: () => void;
  position: number;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#3B82F6");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const predefinedColors = [
    "#3B82F6", // blue
    "#10B981", // emerald
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // violet
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F97316", // orange
  ];

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleStartAdding = () => {
    setIsAdding(true);
    setColumnName("");
  };

  const handleCancel = () => {
    setIsAdding(false);
    setColumnName("");
    setColumnColor("#3B82F6");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnName.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/columns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: columnName.trim(),
          color: columnColor,
          position: position,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create column");
      }

      setIsAdding(false);
      setColumnName("");
      setColumnColor("#3B82F6");
      onColumnAdded();
    } catch (error) {
      console.error("Error creating column:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdding) {
    return (
      <div className="min-w-80 max-w-80">
        <button
          onClick={handleStartAdding}
          className="w-full h-20 bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors group"
        >
          <Plus size={20} className="mr-2" />
          <span className="font-medium">Add Column</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-80 max-w-80">
      <div className="bg-white rounded-lg border-2 border-blue-300 p-4 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              ref={inputRef}
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Column name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={50}
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColumnColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    columnColor === color
                      ? "border-gray-800 scale-110"
                      : "border-gray-300 hover:border-gray-400"
                  } transition-all duration-150`}
                  style={{ backgroundColor: color }}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!columnName.trim() || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <Check size={14} className="mr-1" />
                  Add
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Custom hook for managing refetch logic
function useKanbanRefetch(projectSlug: string, onDataChange?: () => void) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchKanbanData = useCallback(
    async (showLoader = true) => {
      try {
        const now = Date.now();
        // Prevent excessive API calls
        if (now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
          return;
        }

        if (showLoader) {
          setLoading(true);
        } else {
          setIsRefetching(true);
        }
        setError(null);
        lastFetchTime.current = now;

        // Fetch columns for the project
        const columnsResponse = await fetch(
          `/api/projects/${projectSlug}/columns`,
          {
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        if (!columnsResponse.ok) {
          throw new Error("Failed to fetch columns");
        }
        const columnsData = await columnsResponse.json();

        // Fetch cards for each column in parallel
        const columnsWithCards = await Promise.all(
          columnsData.map(async (column: any) => {
            const cardsResponse = await fetch(
              `/api/columns/${column.id}/cards`,
              {
                headers: {
                  "Cache-Control": "no-cache",
                },
              }
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
        onDataChange?.(); // Notify parent of data change
      } catch (err) {
        console.error("Error fetching kanban data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setIsRefetching(false);
      }
    },
    [projectSlug, onDataChange]
  );

  // Debounced refresh function
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      fetchKanbanData(false); // Don't show full loader for background refresh
    }, 500); // 500ms debounce
  }, [fetchKanbanData]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    fetchKanbanData(false);
  }, [fetchKanbanData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns,
    setColumns,
    loading,
    error,
    isRefetching,
    fetchKanbanData,
    debouncedRefresh,
    manualRefresh,
  };
}

// Draggable Card Component (unchanged)
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    router.push(`/projects/${projectSlug}/cards/${card.id}`);
  };

  const dragHandlers = {
    ...attributes,
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      if (listeners?.onMouseDown) {
        listeners.onMouseDown(e as any);
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
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
      {/* Title + Labels */}
      <div className="mb-3">
        <h4 className="font-medium text-gray-900 line-clamp-2 text-left">
          {card.title}
        </h4>

        {/* Labels row */}
        {(card.labels ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(card.labels ?? []).map((label) => (
              <span
                key={label.id}
                className="px-2 py-0.5 text-xs rounded-full font-medium"
                style={{
                  backgroundColor: label.color + "20",
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Assignee + Due Date */}
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

// Droppable Column Component (unchanged)
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
  onDataChange,
  refreshTrigger,
}: KanbanBoardProps) {
  const {
    columns,
    setColumns,
    loading,
    error,
    isRefetching,
    fetchKanbanData,
    debouncedRefresh,
    manualRefresh,
  } = useKanbanRefetch(projectSlug, onDataChange);

  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Configure sensors for drag and drop
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

  // Initial fetch
  useEffect(() => {
    if (projectSlug) {
      fetchKanbanData();
    }
  }, [projectSlug, fetchKanbanData]);

  // Handle external refresh triggers
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      debouncedRefresh();
    }
  }, [refreshTrigger, debouncedRefresh]);

  const handleColumnAdded = () => {
    // Refresh the kanban data when a new column is added
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

    // Same column reordering logic
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

      // Optimistic update
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

      // Update database and refresh on success/error
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

        // Refresh after successful move to ensure data consistency
        debouncedRefresh();
      } catch (error) {
        console.error("Failed to update card position:", error);
        // Revert optimistic update and refresh
        setColumns(columns);
        debouncedRefresh();
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

      // Optimistic update
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

      // Update database and refresh
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

        // Refresh after successful move
        debouncedRefresh();
      } catch (error) {
        console.error("Failed to move card:", error);
        // Revert optimistic update and refresh
        setColumns(columns);
        debouncedRefresh();
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

  if (
    !loading &&
    columns.length > 0 &&
    columns.every((col) => col.cards.length === 0)
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="mb-2">No tasks yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto custom-scrollbar">
      {/* Refresh indicator */}
      {isRefetching && (
        <div className="absolute top-4 right-4 z-50">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            <RefreshCw size={14} className="animate-spin" />
            Syncing...
          </div>
        </div>
      )}

      {/* Manual refresh button */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={manualRefresh}
          disabled={isRefetching}
          className="p-2 bg-white shadow-md rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Refresh board"
        >
          <RefreshCw size={16} className={isRefetching ? "animate-spin" : ""} />
        </button>
      </div>

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

          {/* Add Column Button */}
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
            <DraggableCard card={activeCard} projectSlug={projectSlug} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
