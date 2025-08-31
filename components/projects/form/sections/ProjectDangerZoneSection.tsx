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
        <h3 className="text-xl font-semibold text-red-900 dark:text-red-700 flex items-center gap-2">
          <AlertTriangle size={20} />
          Danger Zone
        </h3>
        <p className="mt-1 text-sm text-red-600 dark:text-red-700 ">
          Irreversible and destructive actions.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Archive Project */}
        <div className="col-span-1 md:col-span-full lg:col-span-full border border-yellow-200 rounded-md p-4 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Archive Project
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Archive this project to hide it from team members. You can
                restore it later.
              </p>
            </div>
            <button
              type="button"
              onClick={onArchive}
              disabled={isArchiving || project.isArchived}
              className="px-3 py-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-600 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
        <div className="col-span-1 md:col-span-full lg:col-span-full border border-red-200 rounded-md p-4 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                Delete Project
              </h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Permanently delete this project and all its data. This action
                cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 text-sm font-medium text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-800/40 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
