// team/[slug]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import Button from "@/components/ui/Button";
import { ProjectCard } from "@/components/projects";
import {
  Users,
  Settings,
  Calendar,
  Plus,
  FolderOpen,
  Link as LinkIcon,
} from "lucide-react";
import { getTeamBySlug } from "@/lib/services/teams";
import { getTeamProjectsAction } from "@/lib/services/projects";
import type {
  TeamWithRelations,
  TeamMemberWithRelations,
} from "@/types/relations";
import UserAvatar from "@/components/shared/UserAvatar";

// Define the expected team type with members that include user data
interface TeamPageData extends TeamWithRelations {
  members: TeamMemberWithRelations[];
  currentUserRole?: string;
}

export default async function TeamPage({
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
  const team = (await getTeamBySlug(slug, userId)) as TeamPageData;

  if (!team) {
    notFound();
  }

  const canEdit =
    team.currentUserRole === "owner" || team.currentUserRole === "admin";

  // Fetch team projects
  const projects = await getTeamProjectsAction(team.id, {
    isArchived: false,
    orderBy: "updatedAt",
    orderDirection: "desc",
  });

  return (
    <DualPanelLayout
      left={
        <div className="p-4 h-full">
          <AppBreadcrumb />

          {/* Team Info Section */}
          <div className="mt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="font-bold text-xl text-gray-900">
                    {team.name}
                  </h2>
                  {/* {team.isPrivate ? (
                    <Lock size={16} className="text-gray-400" />
                  ) : (
                    <Globe size={16} className="text-gray-400" />
                  )} */}
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <LinkIcon className="w-4 h-4 text-blue-500" />
                  <Link
                    href={`/team/${team.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-500"
                  >
                    {team.slug}
                  </Link>
                </p>
              </div>
              {canEdit && (
                <Link
                  href={`/team/${team.slug}/settings`}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Team Settings"
                >
                  <Settings size={16} />
                </Link>
              )}
            </div>

            {team.description && (
              <p className="text-sm text-gray-700 mb-4">{team.description}</p>
            )}

            {/* Team Stats */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} />
                <span>{team.members?.length || 0} members</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FolderOpen size={14} />
                <span>{projects.length} projects</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Members Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Members</h3>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {team.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0">
                      {member.user?.avatarUrl ? (
                        <img
                          className="h-8 w-8 rounded-full"
                          src={member.user.avatarUrl}
                          alt=""
                        />
                      ) : (
                        <UserAvatar
                          name={
                            [member.user?.firstName, member.user?.lastName]
                              .filter(Boolean)
                              .join(" ") ||
                            member.user?.email ||
                            "Unknown"
                          }
                          src={member.user?.avatarUrl}
                          size="32"
                          useContext={false}
                          className="h-8 w-8"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.user?.firstName && member.user?.lastName
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : member.user?.username ||
                            member.user?.email ||
                            "Unknown User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.role}
                      </p>
                    </div>
                  </div>
                )) || <p className="text-sm text-gray-500">No members found</p>}
              </div>
            </div>
          </div>
        </div>
      }
      right={
        <div className="p-6">
          {/* Projects Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your team's projects and collaborations
              </p>
            </div>

            {/* Show create button when there are projects or user can edit */}
            {(projects.length > 0 || canEdit) && projects.length !== 0 && (
              <Link href="/projects/create">
                <Button
                  leftIcon={<Plus />}
                  variant="primary"
                  style="filled"
                  size="sm"
                >
                  New Project
                </Button>
              </Link>
            )}
          </div>

          {/* Projects Content */}
          {projects.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No projects yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first project for this team.
              </p>
              <div className="mt-6">
                <Link href="/projects/create">
                  <Button
                    leftIcon={<Plus />}
                    variant="primary"
                    style="filled"
                    size="sm"
                  >
                    Create Project
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}
