"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getProjectsForUser } from "@/lib/services/projects";
import { FolderKanban, Plus, Calendar, Users } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import Button from "@/components/ui/Button";
import type { ProjectWithPartialRelations } from "@/types";

export default function ProjectsClient() {
  const { userData, clerkUser, loading } = useUserContext();
  const [userProjects, setUserProjects] = useState<
    ProjectWithPartialRelations[]
  >([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const currentUserId = userData?.id || clerkUser?.id;

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUserId) return;
      try {
        const projects = await getProjectsForUser(currentUserId);
        setUserProjects(projects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [currentUserId]);

  if (loading || loadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-6 md:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
              Projects
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View and manage projects from your teams
            </p>
          </div>

          {userProjects.length !== 0 && (
            <Link href="/projects/create" className="flex-shrink-0">
              <Button
                leftIcon={<Plus />}
                variant="primary"
                style="filled"
                size="sm"
              >
                <span className="hidden sm:inline">Create Project</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </Link>
          )}
        </div>

        {userProjects.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <FolderKanban className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
              No projects
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Get started by creating your first project or joining a team.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
            {userProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md dark:hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 group"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </h3>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users size={14} className="flex-shrink-0" />
                      <span>
                        {project.teams?.length === 1
                          ? "1 team"
                          : `${project.teams?.length || 0} teams`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        Created{" "}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap gap-1">
                      {project.teams?.slice(0, 2).map((team, index) => (
                        <span
                          key={team.id || index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 transition-colors"
                        >
                          {team.name}
                        </span>
                      ))}
                      {project.teams && project.teams.length > 2 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                          +{project.teams.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
