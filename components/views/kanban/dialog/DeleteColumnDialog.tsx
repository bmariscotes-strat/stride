import React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

interface Column {
  id: string;
  name: string;
  position: number;
  color: string | null;
  projectId: string;
  cards: any[];
}

interface DeleteColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: Column;
  onDelete: () => void;
  isDeleting: boolean;
}

export default function DeleteColumnModal({
  isOpen,
  onClose,
  column,
  onDelete,
  isDeleting,
}: DeleteColumnModalProps) {
  const hasCards = column.cards.length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <DialogContent className="p-5">
        <div className="mt-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Delete Column</h3>
            <div className="mt-2 px-7 py-3">
              {hasCards ? (
                <p className="text-sm text-gray-500">
                  Cannot delete column <strong>"{column.name}"</strong> because
                  it contains <strong>{column.cards.length}</strong> task
                  {column.cards.length === 1 ? "" : "s"}. Please move or delete
                  all tasks first.
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the column{" "}
                  <strong>"{column.name}"</strong>? This action cannot be
                  undone.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              {!hasCards && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete Column"}
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
