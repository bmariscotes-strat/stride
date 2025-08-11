// components/projects/form/ProjectDangerZoneSection.tsx
"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ProjectWithPartialRelations } from "@/types";

interface ProjectDangerZoneSectionProps {
  project: ProjectWithPartialRelations;
  onArchive: () => void;
  onDelete: () => void;
  isArchiving: boolean;
  sectionRef?: React.RefObject<HTMLElement | null>;
}

export default function ProjectDangerZoneSection({
  project,
  onArchive,
  onDelete,
  isArchiving,
  sectionRef,
}: ProjectDangerZoneSectionProps) {
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
        {/* Archive Project */}
        <div className="border border-yellow-200 rounded-md p-4 bg-yellow-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Archive Project
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Archive this project to hide it from team members. You can
                restore it later from the team's archived projects.
              </p>
            </div>
            <button
              type="button"
              onClick={onArchive}
              disabled={isArchiving || project.isArchived}
              className="px-3 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isArchiving
                ? "Archiving..."
                : project.isArchived
                  ? "Already Archived"
                  : "Archive Project"}
            </button>
          </div>
        </div>

        {/* Delete Project */}
        <div className="border border-red-200 rounded-md p-4 bg-red-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Delete Project
              </h4>
              <p className="text-sm text-red-700 mt-1">
                Permanently delete this project and all its data including
                tasks, columns, and attachments. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
