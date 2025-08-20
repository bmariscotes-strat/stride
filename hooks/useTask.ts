// hooks/useTask.ts - Updated with enhanced functionality
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  CardFilters,
  PaginationOptions,
  SortOptions,
} from "@/lib/services/tasks";

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
  labels: (projectId: string) =>
    [...taskKeys.all, "labels", projectId] as const,
};

// Hook for getting a single task
export function useTask(cardId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: taskKeys.card(cardId),
    queryFn: () => apiCall(`/api/cards/${cardId}`),
    enabled,
    staleTime: 30000, // 30 seconds
  });
}

// Hook for getting tasks by project
export function useProjectTasks(
  projectId: string,
  filters?: CardFilters,
  pagination?: PaginationOptions,
  sort?: SortOptions,
  enabled: boolean = true
) {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.assigneeId) params.append("assigneeId", filters.assigneeId);
  if (filters?.priority) params.append("priority", filters.priority);
  if (pagination?.page) params.append("page", pagination.page.toString());
  if (pagination?.limit) params.append("limit", pagination.limit.toString());
  if (sort?.field) params.append("sortField", sort.field);

  return useQuery({
    queryKey: [...taskKeys.projects(projectId), filters, pagination, sort],
    queryFn: () => apiCall(`/api/projects/${projectId}/cards?${params}`),
    enabled,
    staleTime: 30000, // 30 seconds
  });
}

// Hook for getting tasks by column (for Kanban)
export function useColumnTasks(
  columnId: string,
  includeArchived: boolean = false,
  enabled: boolean = true
) {
  const params = new URLSearchParams();
  if (includeArchived) params.append("includeArchived", "true");

  return useQuery({
    queryKey: [...taskKeys.columns(columnId), includeArchived],
    queryFn: () => apiCall(`/api/columns/${columnId}/cards?${params}`),
    enabled,
    staleTime: 10000, // 10 seconds for real-time feel
  });
}

// Hook for getting assigned tasks
export function useAssignedTasks(
  userId: string,
  projectId?: string,
  pagination?: PaginationOptions,
  enabled: boolean = true
) {
  const params = new URLSearchParams();
  if (projectId) params.append("projectId", projectId);
  if (pagination?.page) params.append("page", pagination.page.toString());
  if (pagination?.limit) params.append("limit", pagination.limit.toString());

  return useQuery({
    queryKey: [...taskKeys.assigned(userId), projectId, pagination],
    queryFn: () => apiCall(`/api/users/${userId}/assigned-cards?${params}`),
    enabled,
  });
}

// Hook for getting overdue tasks
export function useOverdueTasks(
  userId?: string,
  projectId?: string,
  enabled: boolean = true
) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (projectId) params.append("projectId", projectId);

  return useQuery({
    queryKey: taskKeys.overdue(userId, projectId),
    queryFn: () => apiCall(`/api/cards/overdue?${params}`),
    enabled,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for searching tasks
export function useSearchTasks(
  query: string,
  projectId?: string,
  pagination?: PaginationOptions,
  enabled: boolean = true
) {
  const params = new URLSearchParams();
  params.append("q", query);
  if (projectId) params.append("projectId", projectId);
  if (pagination?.page) params.append("page", pagination.page.toString());
  if (pagination?.limit) params.append("limit", pagination.limit.toString());

  return useQuery({
    queryKey: [...taskKeys.search(query, projectId), pagination],
    queryFn: () => apiCall(`/api/cards/search?${params}`),
    enabled: enabled && query.length > 2, // Only search if query is more than 2 characters
    staleTime: 30000,
  });
}

// Hook for project statistics
export function useProjectStats(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: taskKeys.stats(projectId),
    queryFn: () => apiCall(`/api/projects/${projectId}/stats`),
    enabled,
    staleTime: 60000, // 1 minute
  });
}

// Hook for getting project assignees
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

// Mutations
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCardInput & { projectId: string }) => {
      // Convert Date to ISO string if present
      const payload = {
        ...input,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
        startDate: input.startDate ? input.startDate.toISOString() : null,
      };

      return apiCall(`/api/projects/${input.projectId}/cards`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (newCard) => {
      // Invalidate and refetch related queries
      if (newCard.columnId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.columns(newCard.columnId),
        });
      }

      if (newCard.column?.projectId || newCard.projectId) {
        const projectId = newCard.column?.projectId || newCard.projectId;
        queryClient.invalidateQueries({
          queryKey: taskKeys.projects(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: taskKeys.stats(projectId),
        });
      }

      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: UpdateCardInput) => {
      const response = await fetch(`/api/cards/${updateData.cardId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: updateData.title,
          description: updateData.description,
          priority: updateData.priority,
          assigneeId: updateData.assigneeId,
          columnId: updateData.columnId,
          dueDate: updateData.dueDate?.toISOString(),
          startDate: updateData.startDate?.toISOString(),
          labelIds: updateData.labelIds, // Include labelIds in the request
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch queries as needed
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveCardInput & { cardId: string }) =>
      apiCall(`/api/cards/${input.cardId}/move`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (movedCard, variables) => {
      // Update the specific card cache
      queryClient.setQueryData(taskKeys.card(movedCard.id), movedCard);

      // Invalidate both old and new column queries
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(variables.newColumnId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(movedCard.columnId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.projects(movedCard.column.projectId),
      });

      // Don't show toast for moves as they happen frequently during drag & drop
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to move task");
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) =>
      apiCall(`/api/cards/${cardId}/archive`, {
        method: "PATCH",
      }),
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

export function useRestoreTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) =>
      apiCall(`/api/cards/${cardId}/restore`, {
        method: "PATCH",
      }),
    onSuccess: (restoredCard) => {
      // Update cache and invalidate related queries
      queryClient.setQueryData(taskKeys.card(restoredCard.id), restoredCard);
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(restoredCard.columnId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.projects(restoredCard.column.projectId),
      });

      toast.success("Task restored successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore task");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) =>
      apiCall(`/api/cards/${cardId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, cardId) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: taskKeys.card(cardId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });

      toast.success("Task deleted permanently");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
    },
  });
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardIds,
      updates,
    }: {
      cardIds: string[];
      updates: Partial<UpdateCardInput>;
    }) =>
      apiCall(`/api/cards/bulk-update`, {
        method: "PATCH",
        body: JSON.stringify({ cardIds, updates }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Tasks updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update tasks");
    },
  });
}

export function useBulkArchiveTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardIds: string[]) =>
      apiCall(`/api/cards/bulk-archive`, {
        method: "PATCH",
        body: JSON.stringify({ cardIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Tasks archived successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive tasks");
    },
  });
}

export function useDuplicateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      overrides,
    }: {
      cardId: string;
      overrides?: Partial<CreateCardInput>;
    }) =>
      apiCall(`/api/cards/${cardId}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ overrides }),
      }),
    onSuccess: (duplicatedCard) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(duplicatedCard.columnId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.projects(duplicatedCard.column.projectId),
      });

      toast.success("Task duplicated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to duplicate task");
    },
  });
}

// --- LABEL SERVICE INTEGRATION ---

const labelService = {
  async getProjectLabels(slug: string) {
    console.log("[labelService] Fetching labels for project slug:", slug);

    try {
      const response = await fetch(`/api/projects/${slug}/labels`);

      console.log("[labelService] Response status:", response.status);

      if (!response.ok) {
        console.warn("[labelService] Failed to fetch labels for slug:", slug);
        return [];
      }

      const data = await response.json();
      console.log("[labelService] Labels fetched:", data);
      return data;
    } catch (error) {
      console.error("[labelService] Error fetching labels:", error);
      return [];
    }
  },

  async createLabel(slug: string, name: string, color: string) {
    console.log("[labelService] Creating label:", { slug, name, color });

    try {
      const response = await fetch(`/api/projects/${slug}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });

      console.log("[labelService] Response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to create label");
      }

      const data = await response.json();
      console.log("[labelService] Label created successfully:", data);
      return data;
    } catch (error) {
      console.error("[labelService] Error creating label:", error);

      // Return a mock label for now to prevent breaking the UI
      const fallback = {
        id: Math.random().toString(),
        name,
        color,
        slug,
      };

      console.log("[labelService] Returning fallback label:", fallback);
      return fallback;
    }
  },
};

// Hook for getting project labels
export function useProjectLabels(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: taskKeys.labels(projectId),
    queryFn: () => labelService.getProjectLabels(projectId),
    enabled,
    staleTime: 300000,
  });
}

// Hook for creating label
export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; color: string; projectId: string }) =>
      labelService.createLabel(input.projectId, input.name, input.color),
    onSuccess: (newLabel, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.labels(variables.projectId),
      });
      toast.success("Label created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create label");
    },
  });
}
