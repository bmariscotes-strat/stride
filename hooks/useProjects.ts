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
  assignProjectTeamMemberRoleAction,
} from "@/lib/services/projects";
import type {
  CreateProject,
  UpdateProject,
  ProjectWithPartialRelations,
  ProjectsListOptions,
  AssignProjectRoleParams,
} from "@/types";

// Local helper type for create (matches service signature)
type CreateProjectManyToMany = CreateProject & {
  teamIds: string[];
  teamRoles?: Record<string, "admin" | "editor" | "viewer">;
};

// Query keys for consistent caching
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: ProjectsListOptions) =>
    [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  bySlug: (slug: string) => [...projectKeys.all, "bySlug", slug] as const,
  team: (teamId: string) => [...projectKeys.all, "team", teamId] as const,
};

/**
 * Hook for fetching team projects with optional filtering and pagination
 * (service still accepts a single teamId)
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
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a project by slug (global uniqueness)
 */
export function useProjectBySlug(slug?: string) {
  return useQuery({
    queryKey: projectKeys.bySlug(slug || ""),
    queryFn: () => (slug ? getProjectBySlugAction(slug) : null),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Standalone hook for assigning project team member roles
 */
export function useAssignProjectRole() {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  return useMutation({
    mutationFn: ({ projectId, memberId, newRole }: AssignProjectRoleParams) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return assignProjectTeamMemberRoleAction(
        projectId,
        memberId,
        newRole,
        currentUserId
      );
    },
    onSuccess: (result, { projectId }) => {
      if (result.success) {
        // Invalidate project details to refresh member roles
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(projectId),
        });

        // Invalidate project lists to ensure consistent data
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });

        // If we have cached project data, we can try to get team info for additional invalidation
        const cachedProject =
          queryClient.getQueryData<ProjectWithPartialRelations>(
            projectKeys.detail(projectId)
          );

        // Invalidate team-specific queries if we know which teams are involved
        cachedProject?.teams?.forEach((team) => {
          queryClient.invalidateQueries({
            queryKey: projectKeys.team(team.id),
          });
        });
      }
    },
    onError: (error) => {
      console.error("Error assigning project role:", error);
    },
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

  // Fetch projects for a team
  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: projectKeys.list({ teamId, ...options }),
    queryFn: () => (teamId ? getTeamProjectsAction(teamId, options) : []),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  // Create project (many-to-many)
  const createProjectMutation = useMutation({
    mutationFn: (
      data: CreateProject & {
        teamIds: string[];
        memberRoles: Record<string, "admin" | "editor" | "viewer">;
      }
    ) => createProjectAction(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate each related team list
        variables.teamIds?.forEach((tid) => {
          queryClient.invalidateQueries({ queryKey: projectKeys.team(tid) });
        });
        // Invalidate generic lists
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

        // Seed detail cache
        if (result.project) {
          queryClient.setQueryData(
            projectKeys.detail(result.project.id),
            result.project
          );
        }
      }
    },
  });

  // Update project (uses cached teams for invalidation)
  const updateProjectMutation = useMutation({
    mutationFn: (data: UpdateProject) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return updateProjectAction({ ...data, userId: currentUserId });
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({
        queryKey: projectKeys.detail(newData.id),
      });

      const previousProject =
        queryClient.getQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(newData.id)
        );

      // Optimistic update; preserve teams array if present
      if (previousProject) {
        queryClient.setQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(newData.id),
          {
            ...previousProject,
            ...newData,
            teams: previousProject.teams ?? [], // keep M2M relations
            updatedAt: new Date(),
          }
        );
      }

      return { previousProject };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(context.previousProject.id),
          context.previousProject
        );
      }
    },
    onSuccess: (result, variables) => {
      if (result.success && result.project) {
        // Update detail cache
        const prev = queryClient.getQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(variables.id)
        );

        queryClient.setQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(variables.id),
          {
            ...(result.project as any),
            // keep teams from cache if service doesn't return them
            ...(prev?.teams ? { teams: prev.teams } : {}),
          } as ProjectWithPartialRelations
        );

        // Invalidate lists
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

        // Fan-out invalidate for all related teams (from cached version)
        prev?.teams?.forEach((t) =>
          queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
        );
      }
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
    },
  });

  // Hard delete project (use cached teams for invalidation)
  const deleteProjectMutation = useMutation({
    mutationFn: ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => hardDeleteProjectAction(projectId, userId),
    onMutate: async ({ projectId }) => {
      await queryClient.cancelQueries({
        queryKey: projectKeys.detail(projectId),
      });

      const previousProject =
        queryClient.getQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(projectId)
        );

      // Optimistically drop from any lists in cache
      queryClient.setQueriesData<ProjectWithPartialRelations[]>(
        { queryKey: projectKeys.lists() },
        (old) => (old ? old.filter((p) => p.id !== projectId) : [])
      );

      return { previousProject };
    },
    onError: (_error, { projectId }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(projectId),
          context.previousProject
        );
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      }
    },
    onSuccess: (_result, { projectId }) => {
      // Remove detail cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });

      // Invalidate lists + all potentially related teams (from last cached value)
      const prev = queryClient.getQueryData<ProjectWithPartialRelations>(
        projectKeys.detail(projectId)
      );
      prev?.teams?.forEach((t) =>
        queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
      );

      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: ({ projectId, memberId, newRole }: AssignProjectRoleParams) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return assignProjectTeamMemberRoleAction(
        projectId,
        memberId,
        newRole,
        currentUserId
      );
    },
    onSuccess: (result, { projectId }) => {
      if (result.success) {
        // Invalidate project details to refresh member roles
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(projectId),
        });

        // Invalidate project lists
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });

        // Invalidate team-specific queries
        const cachedProject =
          queryClient.getQueryData<ProjectWithPartialRelations>(
            projectKeys.detail(projectId)
          );
        cachedProject?.teams?.forEach((team) => {
          queryClient.invalidateQueries({
            queryKey: projectKeys.team(team.id),
          });
        });
      }
    },
  });

  return {
    // Data
    projects,
    isLoading,
    error,

    // Actions
    refetch,

    // Create project (many-to-many)
    createProject: createProjectMutation.mutate,
    createProjectAsync: createProjectMutation.mutateAsync,
    isCreating: createProjectMutation.isPending,
    createError: createProjectMutation.error,

    // Update project
    updateProject: updateProjectMutation.mutate,
    updateProjectAsync: updateProjectMutation.mutateAsync,
    isUpdating: updateProjectMutation.isPending,
    updateError: updateProjectMutation.error,

    // Delete project (hard delete)
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

    // Assign project role
    assignProjectRole: assignRoleMutation.mutate,
    assignProjectRoleAsync: assignRoleMutation.mutateAsync,
    isAssigningRole: assignRoleMutation.isPending,
    assignRoleError: assignRoleMutation.error,

    // Combined loading state
    isBusy:
      isLoading ||
      createProjectMutation.isPending ||
      updateProjectMutation.isPending ||
      deleteProjectMutation.isPending ||
      assignRoleMutation.isPending,
  };
}

/**
 * Standalone: create (many-to-many)
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: CreateProject & {
        teamIds: string[];
        memberRoles: Record<string, "admin" | "editor" | "viewer">;
      }
    ) => createProjectAction(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        variables.teamIds?.forEach((tid) =>
          queryClient.invalidateQueries({ queryKey: projectKeys.team(tid) })
        );
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

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
 * Standalone: update
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
        const prev = queryClient.getQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(variables.id)
        );

        queryClient.setQueryData<ProjectWithPartialRelations>(
          projectKeys.detail(variables.id),
          {
            ...(result.project as any),
            ...(prev?.teams ? { teams: prev.teams } : {}),
          } as ProjectWithPartialRelations
        );

        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        prev?.teams?.forEach((t) =>
          queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
        );
      }
    },
  });
}

/**
 * Standalone: soft delete
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
      const prev = queryClient.getQueryData<ProjectWithPartialRelations>(
        projectKeys.detail(projectId)
      );

      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      prev?.teams?.forEach((t) =>
        queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
      );
    },
  });
}

/**
 * Standalone: hard delete
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
      const prev = queryClient.getQueryData<ProjectWithPartialRelations>(
        projectKeys.detail(projectId)
      );

      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      prev?.teams?.forEach((t) =>
        queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
      );
    },
  });
}
