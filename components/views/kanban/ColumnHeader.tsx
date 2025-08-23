// components/ColumnHeader.tsx
import React, { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Check, X } from "lucide-react";
import { useDeleteColumn } from "@/hooks/useColumns";

interface Column {
  id: string;
  name: string;
  position: number;
  color: string | null;
  projectId: string;
  cards: any[];
}

interface ColumnHeaderProps {
  column: Column;
  projectSlug: string;
  onColumnUpdated?: () => void;
}

export function ColumnHeader({
  column,
  projectSlug,
  onColumnUpdated,
}: ColumnHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteColumn = useDeleteColumn();

  const handleStartEdit = () => {
    setColumnName(column.name);
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleCancelEdit = () => {
    setColumnName(column.name);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (columnName.trim() === column.name.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      // You'll need to create an update column hook similar to delete
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: columnName.trim() }),
      });

      if (!response.ok) throw new Error("Failed to update column");

      setIsEditing(false);
      onColumnUpdated?.();
    } catch (error) {
      console.error("Error updating column:", error);
      setColumnName(column.name); // Reset on error
    }
  };

  const handleDelete = async () => {
    if (column.cards.length > 0) {
      alert(
        `Cannot delete column "${column.name}" because it contains ${column.cards.length} task(s). Please move or delete all tasks first.`
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete the column "${column.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteColumn.mutateAsync({
        columnId: column.id,
        projectSlug,
      });
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error deleting column:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2 flex-1">
        {column.color && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
        )}

        {isEditing ? (
          <div className="flex items-center space-x-2 flex-1">
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="font-semibold text-gray-900 bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500 flex-1 min-w-0"
              maxLength={50}
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-600 hover:text-green-700"
              disabled={!columnName.trim()}
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900 truncate">
              {column.name}
            </h3>
            <span className="text-sm font-normal text-gray-500 flex-shrink-0">
              ({column.cards.length})
            </span>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={16} />
          </button>

          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border z-20 min-w-[120px]">
                <button
                  onClick={handleStartEdit}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md"
                >
                  <Edit2 size={14} />
                  <span>Rename</span>
                </button>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting || column.cards.length > 0}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:text-gray-400 disabled:cursor-not-allowed last:rounded-b-md"
                  title={
                    column.cards.length > 0
                      ? `Cannot delete column with ${column.cards.length} task(s)`
                      : "Delete column"
                  }
                >
                  <Trash2 size={14} />
                  <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
