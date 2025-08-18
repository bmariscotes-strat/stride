// projects/[slug]/page.tsx - Fixed with proper columns type
import React, { useState } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
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
import { getProjectBySlugForUser } from "@/lib/services/projects";
import type { ProjectWithPartialRelations } from "@/types";

// Extended interface to include columns
interface ProjectPageData extends ProjectWithPartialRelations {
  currentUserRole?: string;
  columns?: Array<{
    id: string;
    name: string;
    position: number;
    // Add other column properties as needed
  }>;
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

  const { slug } = await params;
  const project = (await getProjectBySlugForUser(
    slug,
    userId
  )) as ProjectPageData;

  if (!project) {
    notFound();
  }

  // Check permissions
  const permissionChecker = new ProjectPermissionChecker();
  await permissionChecker.loadContext(userId, project.id);

  const canEditProject = permissionChecker.canEditProject();
  const canManageTeams = permissionChecker.canManageTeams();
  const canCreateCards = permissionChecker.canCreateCards();
  const showSettings = canEditProject || canManageTeams;

  const isProjectOwner = project.ownerId === userId;

  // Get the first column for creating cards (you might want to make this configurable)
  const defaultColumnId = project.columns?.[0]?.id;

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

  const views = [
    { id: "kanban", label: "Kanban", icon: Kanban, isActive: true },
    { id: "list", label: "List", icon: List, isActive: false },
    { id: "table", label: "Table", icon: Table, isActive: false },
  ];

  return (
    <ProjectPageClient
      project={project}
      userId={userId}
      canCreateCards={canCreateCards}
      canEditProject={canEditProject}
      canManageTeams={canManageTeams}
      showSettings={showSettings}
      isProjectOwner={isProjectOwner}
      defaultColumnId={defaultColumnId}
      views={views}
      getRoleIcon={getRoleIcon}
      getRoleBadgeClass={getRoleBadgeClass}
    />
  );
}

// Client component to handle dialog state
function ProjectPageClient({
  project,
  userId,
  canCreateCards,
  canEditProject,
  canManageTeams,
  showSettings,
  isProjectOwner,
  defaultColumnId,
  views,
  getRoleIcon,
  getRoleBadgeClass,
}: {
  project: ProjectPageData;
  userId: string;
  canCreateCards: boolean;
  canEditProject: boolean;
  canManageTeams: boolean;
  showSettings: boolean;
  isProjectOwner: boolean;
  defaultColumnId?: string;
  views: any[];
  getRoleIcon: (role: "admin" | "editor" | "viewer") => React.ReactNode;
  getRoleBadgeClass: (role: "admin" | "editor" | "viewer") => string;
}) {
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

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

            {project.projectTeamMembers &&
              project.projectTeamMembers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Users size={16} />
                    Team Members ({project.projectTeamMembers.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {project.projectTeamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {member.teamMember?.user?.avatarUrl ? (
                            <img
                              src={member.teamMember.user.avatarUrl}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                              {member.teamMember?.user?.firstName?.charAt(0)}
                              {member.teamMember?.user?.lastName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.teamMember?.user?.firstName}{" "}
                              {member.teamMember?.user?.lastName}
                              {member.teamMember?.user?.id === userId &&
                                " (You)"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.teamMember?.user?.email}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(member.role)}`}
                        >
                          {getRoleIcon(member.role)}
                          {member.role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="mb-6 space-y-2">
              {/* Create card button - only show if user can create cards */}
              {canCreateCards && defaultColumnId && (
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
                {views.map(({ id, label, icon: Icon, isActive }) => (
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
                ))}
              </div>
            </div>
          </>
        }
        right={
          <div className="p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Kanban className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Project View
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Project content will be displayed here
                </p>
                {/* Create first card button - only show if user can create cards */}
                {canCreateCards && defaultColumnId && (
                  <button
                    type="button"
                    onClick={() => setCreateTaskOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create First Card
                  </button>
                )}
              </div>
            </div>
          </div>
        }
      />

      {/* Create Task Dialog */}
      {canCreateCards && defaultColumnId && (
        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          columnId={defaultColumnId}
          projectId={project.id}
          userId={userId}
        />
      )}
    </>
  );
}
