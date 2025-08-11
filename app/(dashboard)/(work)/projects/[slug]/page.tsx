// projects/[slug]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import { Settings, Calendar, Users, Kanban, List, Table } from "lucide-react";
import { getProjectBySlugForUser } from "@/lib/services/projects";
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

  // Check if current user is the project owner
  const isProjectOwner = project.ownerId === userId;

  // Views configuration
  const views = [
    { id: "kanban", label: "Kanban", icon: Kanban, isActive: true },
    { id: "list", label: "List", icon: List, isActive: false },
    { id: "table", label: "Table", icon: Table, isActive: false },
  ];

  return (
    <DualPanelLayout
      left={
        <div className="p-4 h-full">
          <AppBreadcrumb />

          {/* Project Info Section */}
          <div className="mt-6">
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
              {isProjectOwner && (
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

            {/* Divider */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Views</h3>

              {/* Views Navigation */}
              <div className="space-y-1">
                {views.map(({ id, label, icon: Icon, isActive }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={!isActive && id !== "kanban"}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : id === "kanban"
                          ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
      right={
        <div className="p-6">
          {/* Empty state for now */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Kanban className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Project View
              </h3>
              <p className="text-sm text-gray-500">
                Project content will be displayed here
              </p>
            </div>
          </div>
        </div>
      }
    />
  );
}
