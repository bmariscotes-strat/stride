"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getProjectsForUser } from "@/lib/services/projects";
import { FolderKanban, Plus, Calendar, Users } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import Button from "@/components/ui/Button";
import type { ProjectWithPartialRelations } from "@/types";

export default function ProjectsPage() {
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <div className="flex items-center justify-between mt-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage projects from your teams
            </p>
          </div>

          {userProjects.length !== 0 && (
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
          )}
        </div>

        {userProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No projects
            </h3>
            <p className="mt-1 text-sm text-gray-500">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {project.team?.name}
                      </p>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>
                        {project.owner?.firstName} {project.owner?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>
                        Created{" "}
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {project.team?.name}
                    </span>
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
