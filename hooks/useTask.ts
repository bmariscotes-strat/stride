// hooks/useTask.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TaskService,
  type CreateCardInput,
  type UpdateCardInput,
  type MoveCardInput,
  type CardFilters,
  type PaginationOptions,
  type SortOptions,
} from "@/lib/services/tasks";
import { toast } from "sonner";

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
};

// Hook for getting a single task
export function useTask(cardId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: taskKeys.card(cardId),
    queryFn: () => TaskService.getCardById(cardId),
    enabled,
  });
}

// Hook for getting tasks by project
export function useProjectTasks(
  projectId: string,
  userId: string,
  filters?: CardFilters,
  pagination?: PaginationOptions,
  sort?: SortOptions,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [...taskKeys.projects(projectId), filters, pagination, sort],
    queryFn: () =>
      TaskService.getCardsByProject(
        projectId,
        userId,
        filters,
        pagination,
        sort
      ),
    enabled,
    staleTime: 30000, // 30 seconds
  });
}

// Hook for getting tasks by column (for Kanban)
export function useColumnTasks(
  columnId: string,
  userId: string,
  includeArchived: boolean = false,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [...taskKeys.columns(columnId), includeArchived],
    queryFn: () =>
      TaskService.getCardsByColumn(columnId, userId, includeArchived),
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
  return useQuery({
    queryKey: [...taskKeys.assigned(userId), projectId, pagination],
    queryFn: () =>
      TaskService.getCardsAssignedToUser(userId, projectId, pagination),
    enabled,
  });
}

// Hook for getting overdue tasks
export function useOverdueTasks(
  userId?: string,
  projectId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: taskKeys.overdue(userId, projectId),
    queryFn: () => TaskService.getOverdueCards(userId, projectId),
    enabled,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for searching tasks
export function useSearchTasks(
  query: string,
  userId: string,
  projectId?: string,
  pagination?: PaginationOptions,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [...taskKeys.search(query, projectId), pagination],
    queryFn: () =>
      TaskService.searchCards(query, userId, projectId, pagination),
    enabled: enabled && query.length > 2, // Only search if query is more than 2 characters
    staleTime: 30000,
  });
}

// Hook for project statistics
export function useProjectStats(
  projectId: string,
  userId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: taskKeys.stats(projectId),
    queryFn: () => TaskService.getProjectCardsStats(projectId, userId),
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
    queryFn: () => TaskService.getProjectAssignees(projectId),
    enabled,
    staleTime: 300000, // 5 minutes
  });
}

// Mutations
export function useCreateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCardInput) =>
      TaskService.createCard(input, userId),
    onSuccess: (newCard) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(newCard.columnId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.projects(newCard.column.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.stats(newCard.column.projectId),
      });

      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

export function useUpdateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCardInput) =>
      TaskService.updateCard(input, userId),
    onSuccess: (updatedCard) => {
      // Update the specific card cache
      queryClient.setQueryData(taskKeys.card(updatedCard.id), updatedCard);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: taskKeys.columns(updatedCard.columnId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.projects(updatedCard.column.projectId),
      });

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

export function useMoveTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveCardInput) => TaskService.moveCard(input, userId),
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

export function useArchiveTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => TaskService.archiveCard(cardId, userId),
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

export function useRestoreTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => TaskService.restoreCard(cardId, userId),
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

export function useDeleteTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => TaskService.deleteCard(cardId, userId),
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

export function useBulkUpdateTasks(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardIds,
      updates,
    }: {
      cardIds: string[];
      updates: Partial<UpdateCardInput>;
    }) => TaskService.bulkUpdateCards(cardIds, updates, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Tasks updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update tasks");
    },
  });
}

export function useBulkArchiveTasks(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardIds: string[]) =>
      TaskService.bulkArchiveCards(cardIds, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Tasks archived successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive tasks");
    },
  });
}

export function useDuplicateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      overrides,
    }: {
      cardId: string;
      overrides?: Partial<CreateCardInput>;
    }) => TaskService.duplicateCard(cardId, userId, overrides),
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
