// components/projects/form/DeleteProjectModal.tsx
"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { ProjectWithPartialRelations } from "@/types";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithPartialRelations;
  deleteStep: number;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  onProceedToStep2: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  error: string;
}

export default function DeleteProjectDialog({
  isOpen,
  onClose,
  project,
  deleteStep,
  confirmationText,
  setConfirmationText,
  onProceedToStep2,
  onDelete,
  isDeleting,
  error,
}: DeleteProjectModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <DialogContent className="p-5">
        <div className="mt-3">
          {deleteStep === 1 ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Project
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete{" "}
                    <strong>{project.name}</strong>? This action cannot be
                    undone and will permanently delete:
                  </p>
                  <ul className="mt-3 text-sm text-gray-500 text-left list-disc list-inside">
                    <li>All project data and settings</li>
                    <li>All tasks, columns, and boards</li>
                    <li>All project files and attachments</li>
                    <li>All project history and activity</li>
                    <li>All team member access to the project</li>
                  </ul>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onProceedToStep2}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Deletion
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    To confirm deletion, please type the project name exactly as
                    shown:
                  </p>
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    {project.name}
                  </p>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type project name to confirm"
                    autoFocus
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
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
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting || confirmationText !== project.name}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
