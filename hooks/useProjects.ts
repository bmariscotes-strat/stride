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
  getProjectsForUser,
  assignProjectTeamMemberRoleAction,
} from "@/lib/services/projects";
import type {
  CreateProject,
  UpdateProject,
  ProjectWithPartialRelations,
  ProjectsListOptions,
  AssignProjectRoleParams,
} from "@/types";

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
  user: (userId: string) => [...projectKeys.all, "user", userId] as const,
};

/*
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

        // Invalidate user projects if we have current user
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }

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
 * Main projects hook with CRUD operations - Updated to use the new user projects function
 */
export function useProjects(
  teamId?: string,
  options: ProjectsListOptions = {}
) {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  // If teamId is provided, use team-specific query, otherwise use user projects
  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: teamId
      ? projectKeys.list({ teamId, ...options })
      : projectKeys.user(currentUserId || ""),
    queryFn: () => {
      if (teamId) {
        return getTeamProjectsAction(teamId, options);
      } else if (currentUserId) {
        return getProjectsForUser(currentUserId, options);
      }
      return [];
    },
    enabled: !!(teamId || currentUserId),
    staleTime: 5 * 60 * 1000,
  });

  // Create project (many-to-many) - Fixed to handle undefined memberRoles
  const createProjectMutation = useMutation({
    mutationFn: (
      data: CreateProject & {
        teamIds: string[];
        memberRoles?: Record<string, "admin" | "editor" | "viewer">; // Make optional
      }
    ) =>
      createProjectAction({
        ...data,
        memberRoles: data.memberRoles || {}, // Provide default empty object
      }),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate each related team list
        variables.teamIds?.forEach((tid) => {
          queryClient.invalidateQueries({ queryKey: projectKeys.team(tid) });
        });
        // Invalidate generic lists
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

        // Invalidate user projects
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }

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

  // Update project (uses cached teams for invalidation) - FIXED to handle team updates properly
  const updateProjectMutation = useMutation({
    mutationFn: (
      data: UpdateProject & {
        teamIds?: string[];
        memberRoles?: Record<string, "admin" | "editor" | "viewer">;
      }
    ) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return updateProjectAction({
        ...data,
        userId: currentUserId,
        teamIds: data.teamIds,
        memberRoles: data.memberRoles || {},
      });
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

        // Invalidate lists and user projects
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }

        // Fan-out invalidate for all related teams (from cached version AND new teams if provided)
        prev?.teams?.forEach((t) =>
          queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
        );

        // Also invalidate new teams if teamIds were provided
        if (variables.teamIds) {
          variables.teamIds.forEach((teamId) => {
            queryClient.invalidateQueries({
              queryKey: projectKeys.team(teamId),
            });
          });
        }
      }
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
    },
  });

  // Hard delete project (use cached teams for invalidation) - FIXED to properly handle cascade deletion
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

      // Also remove from user projects
      if (currentUserId) {
        queryClient.setQueriesData<ProjectWithPartialRelations[]>(
          { queryKey: projectKeys.user(currentUserId) },
          (old) => (old ? old.filter((p) => p.id !== projectId) : [])
        );
      }

      return { previousProject };
    },
    onError: (_error, { projectId }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(projectId),
          context.previousProject
        );
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }
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
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.user(currentUserId),
        });
      }
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

        // Invalidate user projects
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }

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
 * Standalone: create (many-to-many) - Fixed memberRoles handling
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  return useMutation({
    mutationFn: (
      data: CreateProject & {
        teamIds: string[];
        memberRoles?: Record<string, "admin" | "editor" | "viewer">; // Make optional
      }
    ) =>
      createProjectAction({
        ...data,
        memberRoles: data.memberRoles || {}, // Provide default empty object
      }),
    onSuccess: (result, variables) => {
      if (result.success) {
        variables.teamIds?.forEach((tid) =>
          queryClient.invalidateQueries({ queryKey: projectKeys.team(tid) })
        );
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

        // Invalidate user projects
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }

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
 * Standalone: update - FIXED to properly handle team updates
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { userData, clerkUser } = useUserContext();
  const currentUserId = userData?.id || clerkUser?.id;

  return useMutation({
    mutationFn: (
      data: UpdateProject & {
        teamIds?: string[];
        memberRoles?: Record<string, "admin" | "editor" | "viewer">;
      }
    ) => {
      if (!currentUserId) throw new Error("User not authenticated");
      return updateProjectAction({
        ...data,
        userId: currentUserId,
        teamIds: data.teamIds,
        memberRoles: data.memberRoles || {},
      });
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

        // Invalidate user projects
        if (currentUserId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.user(currentUserId),
          });
        }

        // Invalidate both old and new teams if team changes were made
        if (variables.teamIds) {
          variables.teamIds.forEach((teamId) => {
            queryClient.invalidateQueries({
              queryKey: projectKeys.team(teamId),
            });
          });
        }

        // Also invalidate previous teams
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

      // Invalidate user projects
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.user(currentUserId),
        });
      }

      prev?.teams?.forEach((t) =>
        queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
      );
    },
  });
}

/**
 * Standalone: hard delete - FIXED to properly handle cascade deletion
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

      // Invalidate user projects
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.user(currentUserId),
        });
      }

      prev?.teams?.forEach((t) =>
        queryClient.invalidateQueries({ queryKey: projectKeys.team(t.id) })
      );
    },
  });
}
/*
 * Hook for fetching all projects for a user (across all their teams)
 */
export function useUserProjects(
  userId?: string,
  options: Omit<ProjectsListOptions, "teamId"> = {}
) {
  return useQuery({
    queryKey: projectKeys.user(userId || ""),
    queryFn: () => (userId ? getProjectsForUser(userId, options) : []),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

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
