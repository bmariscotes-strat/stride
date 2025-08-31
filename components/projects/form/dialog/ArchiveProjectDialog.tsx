"use client";
import React from "react";
import { Archive } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { ProjectWithPartialRelations } from "@/types";

interface ArchiveProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithPartialRelations;
  onArchive: () => void;
  isArchiving: boolean;
  error: string;
}

export default function ArchiveProjectDialog({
  isOpen,
  onClose,
  project,
  onArchive,
  isArchiving,
  error,
}: ArchiveProjectDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <DialogContent className="p-5">
        <div className="mt-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
            <Archive className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
              Archive Project
            </h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to archive <strong>{project.name}</strong>
                ? This will:
              </p>
              <ul className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-left list-disc list-inside">
                <li>Hide the project from team members</li>
                <li>Prevent new activity in the project</li>
                <li>Preserve all project data, tasks, and attachments</li>
                <li>Move it to your team's archived projects</li>
                <li>Allow you to restore the project later</li>
              </ul>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isArchiving}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onArchive}
                disabled={isArchiving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isArchiving ? "Archiving..." : "Archive Project"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
