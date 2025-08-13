// projects/[slug]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import { Settings, Calendar, Users, Kanban, List, Table } from "lucide-react";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import { ProjectPermissionChecker, PERMISSIONS } from "@/lib/permissions";
import type { ProjectWithPartialRelations } from "@/types";

interface ProjectPageData extends ProjectWithPartialRelations {
  currentUserRole?: string;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || null;

  if (!userId) {
    redirect("/sign-in");
  }

  // Await params before accessing its properties
  const { slug } = await params;
  const project = (await getProjectBySlugForUser(
    slug,
    userId
  )) as ProjectPageData;

  if (!project) {
    notFound();
  }

  // Initialize permission checker
  const permissionChecker = new ProjectPermissionChecker();
  await permissionChecker.loadContext(userId, project.id);

  // Check various permissions
  const canViewProject = permissionChecker.canViewProject();
  const canEditProject = permissionChecker.canEditProject();
  const canManageTeams = permissionChecker.canManageTeams();
  const canCreateCards = permissionChecker.canCreateCards();
  const canEditCards = permissionChecker.canEditCards();
  const canDeleteCards = permissionChecker.canDeleteCards();

  // If user can't view the project, show not found
  if (!canViewProject) {
    notFound();
  }

  // Check if current user is the project owner
  const isProjectOwner = project.ownerId === userId;

  // Determine if user can access settings (project edit or team management)
  const canAccessSettings = canEditProject || canManageTeams;

  // Views configuration - disable views based on permissions
  const views = [
    {
      id: "kanban",
      label: "Kanban",
      icon: Kanban,
      isActive: true,
      isEnabled: canViewProject,
    },
    {
      id: "list",
      label: "List",
      icon: List,
      isActive: false,
      isEnabled: canViewProject,
    },
    {
      id: "table",
      label: "Table",
      icon: Table,
      isActive: false,
      isEnabled: canViewProject,
    },
  ];

  return (
    <DualPanelLayout
      left={
        <>
          <AppBreadcrumb />
          {/* Project Info Section */}
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
            {/* Show settings button only if user has permission */}
            {canAccessSettings && (
              <Link
                href={`/projects/${project.slug}/settings`}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                title="Project Settings"
              >
                <Settings size={16} />
              </Link>
            )}
          </div>

          {/* Project Stats */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={14} />
              <span>
                Team:{" "}
                <Link
                  href={`/team/${project.team?.slug}`}
                  className="text-blue-500 hover:underline"
                >
                  {project.team?.name}
                </Link>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={14} />
              <span>
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            {/* Show owner info */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={14} />
              <span>
                Owner: {project.owner?.firstName} {project.owner?.lastName}
                {isProjectOwner && " (You)"}
              </span>
            </div>
          </div>

          {/* Permission-based Action Buttons */}
          {(canCreateCards || canEditProject) && (
            <div className="mb-6 space-y-2">
              {canCreateCards && (
                <button
                  type="button"
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Create New Card
                </button>
              )}
              {canEditProject && (
                <button
                  type="button"
                  className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Edit Project Details
                </button>
              )}
            </div>
          )}

          {/* User Role Display */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Your role:{" "}
              {isProjectOwner ? "Owner" : project.currentUserRole || "Member"}
            </div>
          </div>

          {/* Permissions Debug Info (remove in production) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="font-medium text-yellow-800 mb-1">
                Permissions:
              </div>
              <div className="space-y-1 text-yellow-700">
                <div>View Project: {canViewProject ? "✓" : "✗"}</div>
                <div>Edit Project: {canEditProject ? "✓" : "✗"}</div>
                <div>Manage Teams: {canManageTeams ? "✓" : "✗"}</div>
                <div>Create Cards: {canCreateCards ? "✓" : "✗"}</div>
                <div>Edit Cards: {canEditCards ? "✓" : "✗"}</div>
                <div>Delete Cards: {canDeleteCards ? "✓" : "✗"}</div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Views</h3>

            {/* Views Navigation - now permission-aware */}
            <div className="space-y-1">
              {views.map(({ id, label, icon: Icon, isActive, isEnabled }) => (
                <button
                  key={id}
                  type="button"
                  disabled={!isEnabled}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    isActive && isEnabled
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : isEnabled
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-400 cursor-not-allowed"
                  }`}
                  title={
                    !isEnabled
                      ? "You don't have permission to view this"
                      : undefined
                  }
                >
                  <Icon size={16} />
                  {label}
                  {!isEnabled && (
                    <span className="ml-auto text-xs text-gray-400">🔒</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions based on permissions */}
          <div className="border-t border-gray-200 pt-4 mt-6">
            <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {canCreateCards && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  + Add Card
                </button>
              )}
              {canEditProject && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Edit Project
                </button>
              )}
              {canManageTeams && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Manage Team Access
                </button>
              )}
            </div>
          </div>
        </>
      }
      right={
        <div className="p-6">
          {/* Permission-aware content */}
          {canViewProject ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Kanban className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Project View
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Project content will be displayed here
                </p>
                {canCreateCards && (
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create First Card
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-red-400 mb-4">🔒</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Access Denied
                </h3>
                <p className="text-sm text-gray-500">
                  You don't have permission to view this project
                </p>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
