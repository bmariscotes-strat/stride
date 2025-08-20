// hooks/useComments.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  updateComment,
  deleteComment,
  getCardComments,
} from "@/lib/services/comments";
import { toast } from "sonner";

export interface Comment {
  id: number;
  cardId: string;
  userId: string;
  content: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    username: string;
  };
  replies?: Comment[];
  mentions?: Array<{
    id: number;
    mentionedUser: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
    };
  }>;
}

export interface CreateCommentData {
  cardId: string;
  content: string;
  parentId?: number; // Changed from string to number
}

export interface UpdateCommentData {
  commentId: number; // Changed from string to number
  content: string;
}

// Hook to get all comments for a card
export function useComments(cardId: string) {
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
      // Invalidate and refetch comments for the card
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.cardId],
      });
      toast.success("Comment added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });
}

// Hook to update a comment
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: (data) => {
      // Invalidate all comment queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["comments"],
      });
      toast.success("Comment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update comment");
    },
  });
}

// Hook to delete a comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      // Invalidate all comment queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["comments"],
      });
      toast.success("Comment deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });
}
