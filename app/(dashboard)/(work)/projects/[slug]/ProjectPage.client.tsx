"use client";

import React, { useState, lazy, Suspense } from "react";
import Link from "next/link";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import {
  Settings,
  Calendar,
  Users,
  Kanban,
  List,
  Table,
  Crown,
  Shield,
  Eye,
} from "lucide-react";
import KanbanBoard from "@/components/views/KanbanBoard";
import type { ProjectPageClientProps } from "@/types";

// Lazy load the CreateTaskDialog to avoid importing database code on initial load
const CreateTaskDialog = lazy(
  () => import("@/components/tasks/CreateTaskDialog")
);

export default function ProjectPageClient({
  project,
  userId,
  canCreateCards,
  canEditProject,
  canManageTeams,
  showSettings,
  isProjectOwner,
  defaultColumnId,
  views,
}: ProjectPageClientProps) {
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  console.log("Project data:", {
    projectId: project.id,
    projectName: project.name,
    columns: project.columns,
    defaultColumnId,
    canCreateCards,
  });

  const getRoleIcon = (role: "admin" | "editor" | "viewer") => {
    switch (role) {
      case "admin":
        return <Crown size={12} className="text-yellow-600" />;
      case "editor":
        return <Shield size={12} className="text-blue-600" />;
      case "viewer":
        return <Eye size={12} className="text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeClass = (role: "admin" | "editor" | "viewer") => {
    switch (role) {
      case "admin":
        return "bg-yellow-100 text-yellow-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Kanban":
        return Kanban;
      case "List":
        return List;
      case "Table":
        return Table;
      default:
        return Kanban;
    }
  };

  return (
    <>
      <DualPanelLayout
        left={
          <>
            <AppBreadcrumb />

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="font-bold text-xl text-gray-900 mb-2">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="text-sm text-gray-700 mb-4">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Settings button - only show if user has permission */}
              {showSettings && (
                <Link
                  href={`/projects/${project.slug}/settings`}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Project Settings"
                >
                  <Settings size={16} />
                </Link>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {project.teams && project.teams.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                    <Users size={14} />
                    <span>Teams ({project.teams.length}):</span>
                  </div>
                  <div className="ml-5 space-y-1">
                    {project.teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between"
                      >
                        <Link
                          href={`/team/${team.slug}`}
                          className="text-blue-500 hover:underline text-sm"
                        >
                          {team.name}
                        </Link>
                        {team.role && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(team.role)}`}
                          >
                            {getRoleIcon(team.role)}
                            {team.role}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Crown size={14} />
                <span>
                  Owner: {project.owner?.firstName} {project.owner?.lastName}
                  {isProjectOwner && " (You)"}
                </span>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              {/* Create card button - only show if user can create cards */}
              {canCreateCards && (
                <button
                  type="button"
                  onClick={() => setCreateTaskOpen(true)}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Create New Card
                </button>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Views</h3>
              <div className="space-y-1">
                {views.map(({ id, label, icon, isActive }) => {
                  const Icon = getIcon(icon);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        }
        right={
          <div className="p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <KanbanBoard
                  projectId={project.id}
                  projectSlug={project.slug}
                  userId={userId}
                  canEditCards={canCreateCards}
                />
              </div>
            </div>
          </div>
        }
      />

      {canCreateCards && createTaskOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <CreateTaskDialog
            open={createTaskOpen}
            onOpenChange={setCreateTaskOpen}
            projectId={project.id}
            columnId={defaultColumnId}
            userId={userId} // Added missing userId prop
          />
        </Suspense>
      )}
    </>
  );
}
