import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Plus, X, Check } from "lucide-react";
import { useCreateColumn } from "@/hooks/useColumns";
import { PREDEFINED_COLORS } from "@/lib/constants/kanban";

interface AddColumnCardProps {
  projectSlug: string;
  onColumnAdded: () => void;
  position: number;
}

export function AddColumnCard({
  projectSlug,
  onColumnAdded,
  position,
}: AddColumnCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#3B82F6");
  const inputRef = useRef<HTMLInputElement>(null);

  const createColumnMutation = useCreateColumn();

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
    if (!columnName.trim() || createColumnMutation.isPending) return;

    try {
      await createColumnMutation.mutateAsync({
        projectSlug,
        name: columnName.trim(),
        color: columnColor,
        position: position,
      });

      setIsAdding(false);
      setColumnName("");
      setColumnColor("#3B82F6");
      onColumnAdded();
    } catch (error) {
      console.error("Error creating column:", error);
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
              disabled={createColumnMutation.isPending}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_COLORS.map((color) => (
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
                  disabled={createColumnMutation.isPending}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!columnName.trim() || createColumnMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center"
            >
              {createColumnMutation.isPending ? (
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
              disabled={createColumnMutation.isPending}
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
