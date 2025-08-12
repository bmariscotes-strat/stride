"use client";
import React from "react";
import { Archive } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { TeamWithRelations, TeamRole } from "@/types";

interface ArchiveTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
  onArchive: () => void;
  isArchiving: boolean;
  error: string;
}

export default function ArchiveTeamDialog({
  isOpen,
  onClose,
  team,
  onArchive,
  isArchiving,
  error,
}: ArchiveTeamDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <DialogContent className="p-5">
        <div className="mt-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
            <Archive className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Archive Team</h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">
                Are you sure you want to archive <strong>{team.name}</strong>?
                This will:
              </p>
              <ul className="mt-3 text-sm text-gray-500 text-left list-disc list-inside">
                <li>Hide the team from all members</li>
                <li>Prevent new activity in the team</li>
                <li>Preserve all team data and projects</li>
                <li>Allow you to restore the team later</li>
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
                {isArchiving ? "Archiving..." : "Archive Team"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
