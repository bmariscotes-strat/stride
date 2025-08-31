"use client";

import React, { useState, lazy, Suspense, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import {
  Settings,
  Calendar,
  Users,
  Crown,
  Kanban,
  Table,
  BarChart3,
} from "lucide-react";
import KanbanBoard from "@/components/views/KanbanBoard";
import CalendarView from "@/components/views/CalendarView";
import type { ProjectPageClientProps } from "@/types";
import { getRoleIcon, getRoleBadgeClass, getIcon } from "@/lib/ui/icons-colors";

// Lazy load the CreateTaskDialog
const CreateTaskDialog = lazy(
  () => import("@/components/tasks/CreateTaskDialog")
);

// View type definition - Add analytics
type ViewType = "kanban" | "calendar" | "table" | "analytics";

// Icon mapping to ensure correct icons are shown
const getViewIcon = (iconName: string) => {
  const iconMap = {
    Kanban: Kanban,
    Calendar: Calendar,
    Table: Table,
    BarChart3: BarChart3,
    Analytics: BarChart3,
  };

  return iconMap[iconName as keyof typeof iconMap] || getIcon(iconName);
};

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
  canViewAnalytics = true, // Add this prop to your interface
}: ProjectPageClientProps & { canViewAnalytics?: boolean }) {
  const router = useRouter();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<ViewType>("kanban");

  console.log("Project data:", {
    projectId: project.id,
    projectName: project.name,
    columns: project.columns,
    defaultColumnId,
    canCreateCards,
  });

  // Callback to trigger board refresh
  const triggerRefresh = useCallback(() => {
    console.log("Triggering refresh, current trigger:", refreshTrigger);
    setRefreshTrigger((prev) => {
      const newValue = prev + 1;
      console.log("New refresh trigger value:", newValue);
      return newValue;
    });
  }, [refreshTrigger]);

  // Handle successful card creation
  const handleCardCreated = useCallback(() => {
    console.log("Card created successfully, closing dialog and refreshing");
    setCreateTaskOpen(false);
    triggerRefresh();
  }, [triggerRefresh]);

  // Handle task dialog close
  const handleTaskDialogClose = useCallback(
    (open: boolean) => {
      console.log("Task dialog close handler called, open:", open);
      setCreateTaskOpen(open);
      if (!open) {
        // Add a small delay before triggering refresh to ensure the dialog is fully closed
        setTimeout(() => {
          console.log("Dialog closed, triggering refresh after delay");
          triggerRefresh();
        }, 100);
      }
    },
    [triggerRefresh]
  );

  // Handle view change - Updated to handle analytics navigation
  const handleViewChange = useCallback(
    (viewId: ViewType) => {
      console.log("Changing view to:", viewId);

      if (viewId === "analytics") {
        // Navigate to analytics page instead of changing local view
        router.push(`/projects/${project.slug}/analytics`);
        return;
      }

      setActiveView(viewId);
    },
    [project.slug, router]
  );

  // Add analytics to views if user has permission
  const allViews = [
    ...views,
    // Add analytics view if user has permission
    ...(canViewAnalytics
      ? [
          {
            id: "analytics",
            label: "Analytics",
            icon: "BarChart3",
            isActive: false, // Analytics is never active in this component since it navigates away
          },
        ]
      : []),
  ];

  // Updated views with active state management
  const updatedViews = allViews.map((view) => ({
    ...view,
    isActive: view.id === activeView && view.id !== "analytics", // Analytics is never active here
  }));

  console.log("Current active view:", activeView);
  console.log("Updated views:", updatedViews);

  // Render the appropriate view component
  const renderActiveView = () => {
    switch (activeView) {
      case "kanban":
        return (
          <div className="p-1 sm:p-1 md:p-6 lg:p-6 relative">
            <div className="flex items-center justify-center h-full">
              <div className="text-center w-full">
                <div className="flex flex-col items-start pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Kanban className="h-6 w-6 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Kanban Board
                    </h3>
                  </div>
                  <p className="text-gray-700 text-sm dark:text-gray-100">
                    Drag and drop your tasks.
                  </p>
                </div>

                <KanbanBoard
                  projectId={project.id}
                  projectSlug={project.slug}
                  userId={userId}
                  canEditCards={canCreateCards}
                  refreshTrigger={refreshTrigger}
                  onDataChange={() => {
                    console.log("Kanban board data updated");
                  }}
                />
              </div>
            </div>
          </div>
        );

      case "calendar":
        return (
          <div className="p-6 relative">
            <CalendarView
              projectId={project.id}
              projectSlug={project.slug}
              userId={userId}
              canEditCards={canCreateCards}
              refreshTrigger={refreshTrigger}
              onDataChange={() => {
                console.log("Calendar view data updated");
              }}
            />
          </div>
        );

      case "table":
        return (
          <div className="p-6 relative">
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">Table View</div>
                <p className="text-sm">Coming soon...</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DualPanelLayout
        left={
          <>
            <AppBreadcrumb />

            <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3 sm:gap-0">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <h2 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2 truncate">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 sm:line-clamp-none">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Settings button - only show if user has permission */}
              {showSettings && (
                <Link
                  href={`/projects/${project.slug}/settings`}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors shrink-0"
                  title="Project Settings"
                >
                  <Settings size={16} />
                </Link>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {project.teams && project.teams.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    <Users size={14} />
                    <span>Teams ({project.teams.length}):</span>
                  </div>
                  <div className="ml-5 space-y-2">
                    {project.teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
                      >
                        <Link
                          href={`/team/${team.slug}`}
                          className="text-blue-500 dark:text-blue-400 hover:underline text-sm truncate min-w-0 flex-1"
                          title={team.name}
                        >
                          {team.name}
                        </Link>
                        {team.role && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 ${getRoleBadgeClass(team.role)}`}
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

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar size={14} className="shrink-0" />
                <span className="truncate">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Crown size={14} className="shrink-0" />
                <span className="truncate">
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
                  onClick={() => {
                    console.log("Create task button clicked");
                    setCreateTaskOpen(true);
                  }}
                  className="w-full bg-blue-600 dark:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  Create New Card
                </button>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Views
              </h3>
              <div className="space-y-1">
                {updatedViews.map(({ id, label, icon, isActive }) => {
                  const Icon = getViewIcon(icon);
                  const isAnalytics = id === "analytics";

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleViewChange(id as ViewType)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors focus:outline-none   ${
                        isActive && !isAnalytics
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                      } ${isAnalytics ? "border-t border-gray-200 dark:border-gray-700 mt-2 pt-4" : ""}`}
                      title={
                        isAnalytics
                          ? "View project analytics and performance metrics"
                          : undefined
                      }
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate flex-1 min-w-0">{label}</span>
                      {isAnalytics && (
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        }
        right={renderActiveView()}
      />

      {canCreateCards && createTaskOpen && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-4">
              <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
          }
        >
          <CreateTaskDialog
            open={createTaskOpen}
            onOpenChange={handleTaskDialogClose}
            projectId={project.id}
            columnId={defaultColumnId}
            userId={userId}
            onSuccess={handleCardCreated}
          />
        </Suspense>
      )}
    </>
  );
}
