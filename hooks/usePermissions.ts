import React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import type {
  TeamPermissionsResponse,
  ProjectPermissionsResponse,
} from "@/types/enums/permissions";
import useSWR from "swr";

/**
 * Hook to fetch project permissions with caching
 *
 * @param projectId - The project ID to fetch permissions for
 * @param options - Configuration options
 * @returns Project permissions, role, and loading state
 */
export function useProjectPermissions(
  projectId?: string,
  options: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  } = {}
) {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000,
  } = options;

  const { data, error, isLoading, mutate } = useSWR<ProjectPermissionsResponse>(
    projectId && enabled ? `/api/projects/${projectId}/permissions` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch permissions: ${res.status}`);
      }
      return res.json();
    },
    {
      revalidateOnFocus: refetchOnWindowFocus,
      dedupingInterval: staleTime,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  // Helper functions for common permission checks
  const helpers = {
    canEdit: () => data?.permissions.canEditProject ?? false,
    canManageTeams: () => data?.permissions.canManageTeams ?? false,
    canCreateContent: () => data?.permissions.canCreateCards ?? false,
    canDeleteContent: () => data?.permissions.canDeleteCards ?? false,
    isOwner: () => data?.role === "owner",
    isAdmin: () => data?.role === "admin" || data?.role === "owner",
    hasWriteAccess: () =>
      ["owner", "admin", "editor"].includes(data?.role ?? "viewer"),
    hasFullAccess: () => ["owner", "admin"].includes(data?.role ?? "viewer"),
  };

  return {
    role: data?.role ?? "viewer",
    permissions:
      data?.permissions ?? ({} as ProjectPermissionsResponse["permissions"]),
    isProjectOwner: data?.isProjectOwner ?? false,
    teamMemberships: data?.teamMemberships ?? 0,
    isLoading,
    error,
    refetch: mutate,
    ...helpers,
  };
}

/**
 * Hook to fetch team permissions with React Query
 *
 * @param teamId - The team ID to fetch permissions for
 * @param options - Configuration options
 * @returns Team permissions, role, and loading state
 */
export function useTeamPermissions(
  teamId?: string,
  options: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  } = {}
) {
  const { user } = useUser();
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["team-permissions", user?.id, teamId],
    queryFn: async (): Promise<TeamPermissionsResponse> => {
      if (!user?.id || !teamId) {
        throw new Error("User or team ID not available");
      }

      const response = await fetch(`/api/team/${teamId}/permissions`);

      if (!response.ok) {
        throw new Error(`Failed to fetch team permissions: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!user?.id && !!teamId && enabled,
    staleTime,
    refetchOnWindowFocus,
    retry: 2,
    retryDelay: 1000,
  });

  // Helper functions for common permission checks
  const helpers = {
    canManage: () => data?.permissions.canManageMembers ?? false,
    canInvite: () => data?.permissions.canInviteMembers ?? false,
    canEdit: () => data?.permissions.canEditTeam ?? false,
    canDelete: () => data?.permissions.canDeleteTeam ?? false,
    isCreator: () => data?.isTeamCreator ?? false,
    isOwner: () => data?.role === "owner",
    isAdmin: () => ["owner", "admin"].includes(data?.role ?? "viewer"),
    hasManageAccess: () => ["owner", "admin"].includes(data?.role ?? "viewer"),
  };

  return {
    role: data?.role ?? "viewer",
    permissions:
      data?.permissions ?? ({} as TeamPermissionsResponse["permissions"]),
    isTeamCreator: data?.isTeamCreator ?? false,
    isLoading,
    error,
    refetch,
    ...helpers,
  };
}

/**
 * Hook for permission-based conditional rendering
 *
 * @param permission - Permission check function
 * @param fallback - Fallback component when permission is denied
 * @returns Conditional render helper
 */
export function usePermissionGuard(
  permission: () => boolean,
  fallback?: React.ReactNode
) {
  const hasPermission = permission();

  const Guard = ({ children }: { children: React.ReactNode }) => {
    if (!hasPermission) {
      return fallback || null;
    }
    return React.createElement(React.Fragment, null, children);
  };

  return { hasPermission, Guard };
}

/**
 * Combined hook for projects that need both project and team permissions
 *
 * @param projectId - Project ID
 * @param teamId - Team ID
 * @returns Combined permissions and helpers
 */
export function useCombinedPermissions(projectId?: string, teamId?: string) {
  const projectPerms = useProjectPermissions(projectId);
  const teamPerms = useTeamPermissions(teamId);

  const isLoading = projectPerms.isLoading || teamPerms.isLoading;
  const error = projectPerms.error || teamPerms.error;

  return {
    project: projectPerms,
    team: teamPerms,
    isLoading,
    error,
    // Combined helpers
    canManageProject: () =>
      projectPerms.canEdit() || projectPerms.canManageTeams(),
    hasAnyAdminAccess: () => projectPerms.isAdmin() || teamPerms.isAdmin(),
    canAccessSettings: () => projectPerms.canEdit() || teamPerms.canManage(),
  };
}
