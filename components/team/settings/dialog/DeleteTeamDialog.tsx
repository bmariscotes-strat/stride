"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { TeamWithRelations, TeamRole } from "@/types";

interface DeleteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
  deleteStep: number;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  onProceedToStep2: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  error: string;
}

export default function DeleteTeamModal({
  isOpen,
  onClose,
  team,
  deleteStep,
  confirmationText,
  setConfirmationText,
  onProceedToStep2,
  onDelete,
  isDeleting,
  error,
}: DeleteTeamModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <DialogContent className="p-5">
        <div className="mt-3">
          {deleteStep === 1 ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full dark:text-gray-200">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
                  Delete Team
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete <strong>{team.name}</strong>
                    ? This action cannot be undone and will permanently delete:
                  </p>
                  <ul className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-left list-disc list-inside">
                    <li>All team data and settings</li>
                    <li>All team projects and content</li>
                    <li>All member access to the team</li>
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
                    To confirm deletion, please type the team name exactly as
                    shown:
                  </p>
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    {team.name}
                  </p>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type team name to confirm"
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
                    disabled={isDeleting || confirmationText !== team.name}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "Deleting..." : "Delete Team"}
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
