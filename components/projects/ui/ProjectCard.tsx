// components/projects/ProjectCard.tsx
import React from "react";
import Link from "next/link";
import { MoreVerticalIcon as MoreVertical, User, Clock } from "lucide-react";
import type { ProjectWithPartialRelations } from "@/types";

interface ProjectCardProps {
  project: ProjectWithPartialRelations;
  canEdit: boolean;
}

export default function ProjectCard({ project, canEdit }: ProjectCardProps) {
  return (
    <div
      className={`rounded-lg border-2 p-6 hover:shadow-md transition-shadow group border-gray-200 bg-white`}
    >
      {/* Project Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link href={`/projects/${project.slug}`} className="block">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
              {project.name}
            </h3>
          </Link>
          {project.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {canEdit && (
          <button className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      {/* Project Meta */}
      <div className="space-y-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <User size={14} />
          <span>
            {project.owner
              ? `${project.owner.firstName} ${project.owner.lastName}`.trim() ||
                project.owner.email
              : "Unknown Owner"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>
            Updated {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Project Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <Link
          href={`/projects/${project.slug}`}
          className={`text-sm font-medium hover:underline}`}
        >
          Open Project →
        </Link>
      </div>
    </div>
  );
}
