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
  const getColorThemeStyles = (colorTheme: string | null) => {
    switch (colorTheme) {
      case "blue":
        return "border-blue-200 bg-blue-50";
      case "green":
        return "border-green-200 bg-green-50";
      case "purple":
        return "border-purple-200 bg-purple-50";
      case "red":
        return "border-red-200 bg-red-50";
      case "yellow":
        return "border-yellow-200 bg-yellow-50";
      case "indigo":
        return "border-indigo-200 bg-indigo-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  const getColorThemeAccent = (colorTheme: string | null) => {
    switch (colorTheme) {
      case "blue":
        return "text-blue-600";
      case "green":
        return "text-green-600";
      case "purple":
        return "text-purple-600";
      case "red":
        return "text-red-600";
      case "yellow":
        return "text-yellow-600";
      case "indigo":
        return "text-indigo-600";
      default:
        return "text-gray-600";
    }
  };

  const getColorThemeBackground = (colorTheme: string | null) => {
    switch (colorTheme) {
      case "blue":
        return "bg-blue-400";
      case "green":
        return "bg-green-400";
      case "purple":
        return "bg-purple-400";
      case "red":
        return "bg-red-400";
      case "yellow":
        return "bg-yellow-400";
      case "indigo":
        return "bg-indigo-400";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div
      className={`rounded-lg border-2 p-6 hover:shadow-md transition-shadow group ${getColorThemeStyles(
        project.colorTheme
      )}`}
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
          className={`text-sm font-medium hover:underline ${getColorThemeAccent(
            project.colorTheme
          )}`}
        >
          Open Project →
        </Link>

        {project.colorTheme && (
          <div
            className={`w-3 h-3 rounded-full ${getColorThemeBackground(
              project.colorTheme
            )}`}
          />
        )}
      </div>
    </div>
  );
}
