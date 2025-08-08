"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";
import type { TeamWithRelations, TeamRole } from "@/types";

interface DangerZoneSectionProps {
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
  onArchive: () => void;
  onDelete: () => void;
  isArchiving: boolean;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function DangerZoneSection({
  team,
  onArchive,
  onDelete,
  isArchiving,
  sectionRef,
}: DangerZoneSectionProps) {
  return (
    <section id="danger-zone" ref={sectionRef} className="scroll-mt-6">
      <div className="border-b border-red-200 pb-6">
        <h3 className="text-xl font-semibold text-red-900 flex items-center gap-2">
          <AlertTriangle size={20} />
          Danger Zone
        </h3>
        <p className="mt-1 text-sm text-red-600">
          Irreversible and destructive actions.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {!team.isPersonal && (
          <>
            {/* Archive Team */}
            <div className="border border-yellow-200 rounded-md p-4 bg-yellow-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Archive Team
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Archive this team to hide it from members. You can restore
                    it later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onArchive}
                  disabled={isArchiving || team.currentUserRole !== "owner"}
                  className="px-3 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isArchiving ? "Archiving..." : "Archive Team"}
                </button>
              </div>
            </div>

            {/* Delete Team */}
            <div className="border border-red-200 rounded-md p-4 bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-red-800">
                    Delete Team
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete this team and all its data. This action
                    cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={team.currentUserRole !== "owner"}
                  className="px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Team
                </button>
              </div>
            </div>
          </>
        )}

        {team.isPersonal && (
          <div className="text-center py-6 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500">
              Personal teams cannot be archived or deleted.
            </p>
          </div>
        )}

        {team.currentUserRole !== "owner" && !team.isPersonal && (
          <div className="text-center py-6 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500">
              Only team owners can perform these actions.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
