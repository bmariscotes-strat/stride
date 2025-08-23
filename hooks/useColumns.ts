// hooks/useColumns.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useKanbanStore } from "@/stores/views/board-store";
import { Column } from "@/types";

interface CreateColumnInput {
  name: string;
  color?: string;
  position?: number;
}

interface UpdateColumnInput {
  id: string;
  name?: string;
  color?: string;
  position?: number;
}

async function apiCall(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Query Keys
export const columnKeys = {
  all: ["columns"] as const,
  project: (projectSlug: string) =>
    [...columnKeys.all, "project", projectSlug] as const,
  column: (columnId: string) =>
    [...columnKeys.all, "column", columnId] as const,
};

// Hook for getting columns by project
export function useProjectColumns(
  projectSlug: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: columnKeys.project(projectSlug),
    queryFn: () => apiCall(`/api/projects/${projectSlug}/columns`),
    enabled,
    staleTime: 60000, // 1 minute
  });
}

// Hook for creating a new column
export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateColumnInput & { projectSlug: string }) => {
      return apiCall(`/api/projects/${input.projectSlug}/columns`, {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          color: input.color,
          position: input.position,
        }),
      });
    },
    onSuccess: (newColumn, variables) => {
      // Invalidate project columns query
      queryClient.invalidateQueries({
        queryKey: columnKeys.project(variables.projectSlug),
      });

      // Also invalidate any task-related queries since the board structure changed
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });

      toast.success("Column created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create column");
    },
  });
}

// Hook for updating a column
export function useUpdateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateColumnInput & { projectSlug: string }) => {
      return apiCall(`/api/columns/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: input.name,
          color: input.color,
          position: input.position,
        }),
      });
    },
    onSuccess: (updatedColumn, variables) => {
      // Update the specific column cache
      queryClient.setQueryData(columnKeys.column(variables.id), updatedColumn);

      // Invalidate project columns query
      queryClient.invalidateQueries({
        queryKey: columnKeys.project(variables.projectSlug),
      });

      toast.success("Column updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update column");
    },
  });
}

// Hook for deleting a column
export function useDeleteColumn() {
  const queryClient = useQueryClient();
  const { removeColumn } = useKanbanStore();

  return useMutation({
    mutationFn: async (input: { columnId: string; projectSlug: string }) => {
      const response = await apiCall(`/api/columns/${input.columnId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (_, variables) => {
      // Update Zustand store
      removeColumn(variables.projectSlug, variables.columnId);

      // Remove from React Query cache
      queryClient.removeQueries({
        queryKey: columnKeys.column(variables.columnId),
      });

      // Invalidate project columns query
      queryClient.invalidateQueries({
        queryKey: columnKeys.project(variables.projectSlug),
      });

      // Invalidate task queries since cards in the column are affected
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });

      toast.success("Column deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete column");
    },
  });
}

// Hook for reordering columns
export function useReorderColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectSlug: string;
      columnOrders: Array<{ id: string; position: number }>;
    }) => {
      return apiCall(`/api/projects/${input.projectSlug}/columns/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          columnOrders: input.columnOrders,
        }),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate project columns query
      queryClient.invalidateQueries({
        queryKey: columnKeys.project(variables.projectSlug),
      });

      toast.success("Columns reordered successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reorder columns");
    },
  });
}
