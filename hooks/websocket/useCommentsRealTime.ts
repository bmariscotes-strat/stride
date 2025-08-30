// hooks/websocket/useCommentsRealTime.ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePusher } from "./usePusher";
import { CommentWithReplies } from "@/lib/services/comments";

interface CommentCreatedEvent {
  comment: CommentWithReplies;
  cardId: string;
}

interface CommentUpdatedEvent {
  commentId: number;
  content: string;
  cardId: string;
}

interface CommentDeletedEvent {
  commentId: number;
  cardId: string;
}

export function useCommentsRealTime(cardId: string) {
  const queryClient = useQueryClient();

  // Listen for comment created
  usePusher<CommentCreatedEvent>(
    `card-${cardId}`,
    "comment-created",
    (data) => {
      queryClient.setQueryData<CommentWithReplies[]>(
        ["comments", cardId],
        (oldComments) => {
          if (!oldComments) return [data.comment];

          // If it's a reply, we need to update the parent's replies
          if (data.comment.parentId) {
            return updateNestedComment(
              oldComments,
              data.comment.parentId,
              (parent) => ({
                ...parent,
                replies: [data.comment, ...parent.replies],
              })
            );
          }

          // If it's a top-level comment, add to the beginning
          return [data.comment, ...oldComments];
        }
      );
    }
  );

  // Listen for comment updated
  usePusher<CommentUpdatedEvent>(
    `card-${cardId}`,
    "comment-updated",
    (data) => {
      queryClient.setQueryData<CommentWithReplies[]>(
        ["comments", cardId],
        (oldComments) => {
          if (!oldComments) return [];

          return updateNestedComment(
            oldComments,
            data.commentId,
            (comment) => ({
              ...comment,
              content: data.content,
              updatedAt: new Date(),
            })
          );
        }
      );
    }
  );

  // Listen for comment deleted
  usePusher<CommentDeletedEvent>(
    `card-${cardId}`,
    "comment-deleted",
    (data) => {
      queryClient.setQueryData<CommentWithReplies[]>(
        ["comments", cardId],
        (oldComments) => {
          if (!oldComments) return [];

          return removeNestedComment(oldComments, data.commentId);
        }
      );
    }
  );
}

// Helper function to update a nested comment
function updateNestedComment(
  comments: CommentWithReplies[],
  commentId: number,
  updateFn: (comment: CommentWithReplies) => CommentWithReplies
): CommentWithReplies[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updateFn(comment);
    }

    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateNestedComment(comment.replies, commentId, updateFn),
      };
    }

    return comment;
  });
}

// Helper function to remove a nested comment
function removeNestedComment(
  comments: CommentWithReplies[],
  commentId: number
): CommentWithReplies[] {
  return comments.filter((comment) => {
    if (comment.id === commentId) {
      return false;
    }

    if (comment.replies.length > 0) {
      comment.replies = removeNestedComment(comment.replies, commentId);
    }

    return true;
  });
}
