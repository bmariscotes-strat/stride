import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export function usePermissions(projectId: string) {
  const { user } = useUser();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions", user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(`/api/projects/${projectId}/permissions`);
      if (!response.ok) throw new Error("Failed to fetch permissions");

      return response.json();
    },
    enabled: !!user?.id && !!projectId,
  });

  return {
    permissions: permissions || {},
    isLoading,
    canViewProject: permissions?.canViewProject || false,
    canEditProject: permissions?.canEditProject || false,
    canCreateCards: permissions?.canCreateCards || false,
    canEditCards: permissions?.canEditCards || false,
    canDeleteCards: permissions?.canDeleteCards || false,
    canManageTeams: permissions?.canManageTeams || false,
  };
}

export function useTeamPermissions(teamId: string) {
  const { user } = useUser();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["team-permissions", user?.id, teamId],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(`/api/teams/${teamId}/permissions`);
      if (!response.ok) throw new Error("Failed to fetch team permissions");

      return response.json();
    },
    enabled: !!user?.id && !!teamId,
  });

  return {
    permissions: permissions || {},
    isLoading,
    canViewTeam: permissions?.canViewTeam || false,
    canEditTeam: permissions?.canEditTeam || false,
    canDeleteTeam: permissions?.canDeleteTeam || false,
    canManageMembers: permissions?.canManageMembers || false,
    canManageRoles: permissions?.canManageRoles || false,
    canInviteMembers: permissions?.canInviteMembers || false,
    canRemoveMembers: permissions?.canRemoveMembers || false,
    canLeaveTeam: permissions?.canLeaveTeam || false,
  };
}

// Combined hook for when you need both project and team permissions
export function useCombinedPermissions(projectId: string, teamId?: string) {
  const projectPermissions = usePermissions(projectId);
  const teamPermissions = useTeamPermissions(teamId || "");

  return {
    project: projectPermissions,
    team: teamPermissions,
    isLoading:
      projectPermissions.isLoading ||
      (teamId ? teamPermissions.isLoading : false),
  };
}
