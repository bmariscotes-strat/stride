import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import useSWR from "swr";

interface ProjectPermissionsResponse {
  role: "owner" | "admin" | "editor" | "viewer";
  permissions: Record<string, boolean>;
}

/**
 * Hook to fetch project permissions (including role)
 */
export function useProjectPermissions(projectId?: string) {
  const { data, error, isLoading } = useSWR<ProjectPermissionsResponse>(
    projectId ? `/api/projects/${projectId}/permissions` : null,
    (url: any) => fetch(url).then((res) => res.json())
  );

  return {
    role: data?.role ?? "viewer",
    permissions: data?.permissions ?? {},
    isLoading,
    error,
  };
}

/**
 * Hook to fetch team permissions (optional)
 */
export function useTeamPermissions(teamId?: string) {
  const { user } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team-permissions", user?.id, teamId],
    queryFn: async () => {
      if (!user?.id || !teamId) return null;
      const response = await fetch(`/api/teams/${teamId}/permissions`);
      if (!response.ok) throw new Error("Failed to fetch team permissions");
      return response.json();
    },
    enabled: !!user?.id && !!teamId,
  });

  return {
    permissions: (data as Record<string, boolean>) || {},
    isLoading,
    error,
  };
}
