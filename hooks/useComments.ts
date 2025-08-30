// hooks/useComments.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  updateComment,
  deleteComment,
  getCardComments,
} from "@/lib/services/comments";
import { useCommentsRealTime } from "./websocket/useCommentsRealTime";

export interface CreateCommentData {
  cardId: string;
  content: string;
  parentId?: string;
}

// Hook to get all comments for a card with real-time updates
export function useComments(cardId: string) {
  // Set up real-time listening
  useCommentsRealTime(cardId);

  return useQuery({
    queryKey: ["comments", cardId],
    queryFn: () => getCardComments(cardId),
    enabled: !!cardId,
  });
}

// Hook to create a new comment
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (data, variables) => {
      // Real-time will handle the update, but we can optionally invalidate for consistency
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.cardId],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create comment:", error);
    },
  });
}

// Hook to update a comment
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: () => {
      // Real-time will handle the update
      queryClient.invalidateQueries({
        queryKey: ["comments"],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update comment:", error);
    },
  });
}

// Hook to delete a comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      // Real-time will handle the update
      queryClient.invalidateQueries({
        queryKey: ["comments"],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to delete comment:", error);
    },
  });
}
