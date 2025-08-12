// hooks/useProject

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  hardDeleteProjectAction,
  getTeamProjectsAction,
  getProjectAction,
  getProjectBySlugAction,
} from "@/lib/services/projects";
import type {
  CreateProject,
  UpdateProject,
  ProjectWithPartialRelations,
  ProjectsListOptions,
} from "@/types";

// Query keys for consistent caching
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: ProjectsListOptions) =>
    [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  bySlug: (teamId: string, slug: string) =>
    [...projectKeys.all, "bySlug", teamId, slug] as const,
  team: (teamId: string) => [...projectKeys.all, "team", teamId] as const,
};

/**
 * Hook for fetching team projects with optional filtering and pagination
 */
export function useTeamProjects(
  teamId: string,
  options: ProjectsListOptions = {}
) {
  return useQuery({
    queryKey: projectKeys.list({ teamId, ...options }),
    queryFn: () => getTeamProjectsAction(teamId, options),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single project by ID
 */
export function useProject(projectId?: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId || ""),
    queryFn: () => (projectId ? getProjectAction(projectId) : null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a project by team and slug
 */
export function useProjectBySlug(teamId?: string, slug?: string) {
  return useQuery({
    queryKey: projectKeys.bySlug(teamId || "", slug || ""),
    queryFn: () =>
      teamId && slug ? getProjectBySlugAction(teamId, slug) : null,
    enabled: !!(teamId && slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Main projects hook with CRUD operations
 */
export function useProjects(
  teamId?: string,
  options: ProjectsListOptions = {}
) {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  // Fetch projects query
  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: projectKeys.list({ teamId, ...options }),
    queryFn: () => (teamId ? getTeamProjectsAction(teamId, options) : []),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProject) => createProjectAction(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate and refetch team projects
        queryClient.invalidateQueries({
          queryKey: projectKeys.team(variables.teamId),
        });
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });

        // Add the new project to the cache optimistically
        if (result.project) {
          queryClient.setQueryData(
            projectKeys.detail(result.project.id),
            result.project
          );
        }
      }
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (data: UpdateProject) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return updateProjectAction({ ...data, userId: currentUserId });
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: projectKeys.detail(newData.id),
      });

      // Snapshot the previous value
      const previousProject =
        queryClient.getQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(newData.id)
        );

      // Optimistically update the cache
      if (previousProject) {
        queryClient.setQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(newData.id),
          {
            ...previousProject,
            ...newData,
            updatedAt: new Date(),
          }
        );
      }

      return { previousProject };
    },
    onError: (_error, _variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(context.previousProject.id),
          context.previousProject
        );
      }
    },
    onSuccess: (result, variables) => {
      if (result.success && result.project) {
        // Update the cache with the server response
        queryClient.setQueryData(
          projectKeys.detail(variables.id),
          result.project
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });
        if (result.project.teamId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.team(result.project.teamId),
          });
        }
      }
    },
    onSettled: (_result, _error, variables) => {
      // Always refetch after mutation settles (success or error)
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => hardDeleteProjectAction(projectId, userId),
    onMutate: async ({ projectId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: projectKeys.detail(projectId),
      });

      // Snapshot the previous value
      const previousProject =
        queryClient.getQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(projectId)
        );

      // Optimistically remove from lists
      queryClient.setQueriesData<ProjectWithPartialRelations[]>(
        { queryKey: projectKeys.lists() },
        (old) => (old ? old.filter((p) => p.id !== projectId) : [])
      );

      return { previousProject };
    },
    onError: (_error, { projectId }, context) => {
      // Revert the optimistic update on error
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(projectId),
          context.previousProject
        );
        // Refetch lists to restore the item
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });
      }
    },
    onSuccess: (_result, { projectId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: projectKeys.detail(projectId),
      });

      // Invalidate all project lists
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
      });
    },
  });

  return {
    // Data
    projects,
    isLoading,
    error,

    // Actions
    refetch,

    // Create project
    createProject: createProjectMutation.mutate,
    createProjectAsync: createProjectMutation.mutateAsync,
    isCreating: createProjectMutation.isPending,
    createError: createProjectMutation.error,

    // Update project
    updateProject: updateProjectMutation.mutate,
    updateProjectAsync: updateProjectMutation.mutateAsync,
    isUpdating: updateProjectMutation.isPending,
    updateError: updateProjectMutation.error,

    // Delete project
    deleteProject: (projectId: string) => {
      if (!currentUserId) return;
      return deleteProjectMutation.mutate({ projectId, userId: currentUserId });
    },
    deleteProjectAsync: (projectId: string) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return deleteProjectMutation.mutateAsync({
        projectId,
        userId: currentUserId,
      });
    },
    isDeleting: deleteProjectMutation.isPending,
    deleteError: deleteProjectMutation.error,

    // Combined loading state
    isBusy:
      isLoading ||
      createProjectMutation.isPending ||
      updateProjectMutation.isPending ||
      deleteProjectMutation.isPending,
  };
}

/**
 * Hook for creating projects (can be used independently)
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProject) => createProjectAction(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate and refetch team projects
        queryClient.invalidateQueries({
          queryKey: projectKeys.team(variables.teamId),
        });
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });

        // Add the new project to the cache
        if (result.project) {
          queryClient.setQueryData(
            projectKeys.detail(result.project.id),
            result.project
          );
        }
      }
    },
  });
}

/**
 * Hook for updating projects (can be used independently)
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  return useMutation({
    mutationFn: (data: UpdateProject) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return updateProjectAction({ ...data, userId: currentUserId });
    },
    onSuccess: (result, variables) => {
      if (result.success && result.project) {
        // Update the cache
        queryClient.setQueryData(
          projectKeys.detail(variables.id),
          result.project
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });
      }
    },
  });
}

/**
 * Hook for deleting projects (can be used independently)
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  return useMutation({
    mutationFn: (projectId: string) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return deleteProjectAction(projectId, currentUserId);
    },
    onSuccess: (_result, projectId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: projectKeys.detail(projectId),
      });

      // Invalidate all project lists
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
      });
    },
  });
}

/**
 * Hook for hard deletion
 */
export function useHardDeleteProject() {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  return useMutation({
    mutationFn: (projectId: string) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return hardDeleteProjectAction(projectId, currentUserId);
    },
    onSuccess: (_result, projectId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: projectKeys.detail(projectId),
      });

      // Invalidate all project lists
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
      });
    },
  });
}
