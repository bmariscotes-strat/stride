// hooks/useTask.ts - Updated for API routes
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  CardFilters,
  PaginationOptions,
  SortOptions,
} from "@/types";

// Query Keys (unchanged)
export const taskKeys = {
  all: ["tasks"] as const,
  projects: (projectId: string) =>
    [...taskKeys.all, "project", projectId] as const,
  columns: (columnId: string) => [...taskKeys.all, "column", columnId] as const,
  card: (cardId: string) => [...taskKeys.all, "card", cardId] as const,
  assigned: (userId: string) => [...taskKeys.all, "assigned", userId] as const,
  overdue: (userId?: string, projectId?: string) =>
    [...taskKeys.all, "overdue", userId, projectId] as const,
  search: (query: string, projectId?: string) =>
    [...taskKeys.all, "search", query, projectId] as const,
  stats: (projectId: string) => [...taskKeys.all, "stats", projectId] as const,
  assignees: (projectId: string) =>
    [...taskKeys.all, "assignees", projectId] as const,
};

// Helper function for API calls
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

// Hook for getting project assignees (UPDATED)
export function useProjectAssignees(
  projectId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: taskKeys.assignees(projectId),
    queryFn: () => apiCall(`/api/projects/${projectId}/assignees`),
    enabled,
    staleTime: 300000, // 5 minutes
  });
}

// Hook for creating tasks (UPDATED - removed userId parameter)
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCardInput & { projectId: string }) => {
      return apiCall(`/api/projects/${input.projectId}/cards`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: (newCard) => {
      // Invalidate and refetch related queries
      if (newCard.columnId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.columns(newCard.columnId),
        });
      }

      if (newCard.column?.projectId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.projects(newCard.column.projectId),
        });
        queryClient.invalidateQueries({
          queryKey: taskKeys.stats(newCard.column.projectId),
        });
      }

      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

// Other existing hooks can be updated similarly...
// For now, keeping the rest as-is since they might need server implementation

// Hook for getting a single task (can be updated later)
export function useTask(cardId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: taskKeys.card(cardId),
    queryFn: () => apiCall(`/api/cards/${cardId}`),
    enabled,
  });
}

// Hook for updating tasks (can be updated later)
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCardInput) => {
      return apiCall(`/api/cards/${input.id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },
    onSuccess: (updatedCard) => {
      // Update the specific card cache
      queryClient.setQueryData(taskKeys.card(updatedCard.id), updatedCard);

      // Invalidate related queries
      if (updatedCard.columnId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.columns(updatedCard.columnId),
        });
      }

      if (updatedCard.column?.projectId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.projects(updatedCard.column.projectId),
        });
      }

      if (updatedCard.assigneeId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.assigned(updatedCard.assigneeId),
        });
      }

      toast.success("Task updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}

// Hook for moving tasks (can be updated later)
export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MoveCardInput) => {
      return apiCall(`/api/cards/${input.cardId}/move`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: (movedCard, variables) => {
      // Update the specific card cache
      queryClient.setQueryData(taskKeys.card(movedCard.id), movedCard);

      // Invalidate both old and new column queries
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(variables.newColumnId),
      });

      if (movedCard.columnId !== variables.newColumnId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.columns(movedCard.columnId),
        });
      }

      if (movedCard.column?.projectId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.projects(movedCard.column.projectId),
        });
      }

      // Don't show toast for moves as they happen frequently during drag & drop
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to move task");
    },
  });
}

// Archive, delete, and other hooks can be updated similarly
// For now, keeping them as placeholders that will throw errors
// This will help you identify which ones need API routes next

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      return apiCall(`/api/cards/${cardId}/archive`, {
        method: "POST",
      });
    },
    onSuccess: (_, cardId) => {
      // Remove from cache and invalidate related queries
      queryClient.removeQueries({ queryKey: taskKeys.card(cardId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });

      toast.success("Task archived successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive task");
    },
  });
}
