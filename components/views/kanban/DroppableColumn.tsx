import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { ColumnHeader } from "@/components/views/kanban/ColumnHeader";
import { Card } from "@/types/forms/tasks";

interface Column {
  id: string;
  name: string;
  position: number;
  color: string | null;
  projectId: string;
  cards: Card[];
}

interface DroppableColumnProps {
  column: Column;
  projectSlug: string;
  onColumnUpdated?: () => void;
  children: React.ReactNode;
}

export function DroppableColumn({
  column,
  projectSlug,
  onColumnUpdated,
  children,
}: DroppableColumnProps) {
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
      <ColumnHeader
        column={column}
        projectSlug={projectSlug}
        onColumnUpdated={onColumnUpdated}
      />

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
