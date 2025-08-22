"use server";

import { db } from "@/lib/db/db";
import { cardComments, mentions } from "@/lib/db/schema";
import { and, eq, desc, asc, InferSelectModel } from "drizzle-orm";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { revalidateTag } from "next/cache";

interface CreateCommentData {
  cardId: string;
  content: string;
  parentId?: string; // For replies - changed to string to match input
}

interface UpdateCommentData {
  commentId: string;
  content: string;
}

type BaseComment = InferSelectModel<typeof cardComments> & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    username: string | null;
    email: string | null;
  };
  mentions: {
    id: number;
    createdAt: Date;
    commentId: number;
    mentionedUserId: string;
    mentionedBy: string;
    mentionedUser: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      avatarUrl: string | null;
      email: string | null;
    };
  }[];
};

export type CommentWithReplies = BaseComment & {
  replies: CommentWithReplies[];
};

export async function createComment({
  cardId,
  content,
  parentId,
}: CreateCommentData) {
  const userId = await getRequiredUserId();

  try {
    const [comment] = await db
      .insert(cardComments)
      .values({
        cardId,
        userId,
        content,
        parentId: parentId ? parseInt(parentId, 10) : null,
      })
      .returning();

    // Process mentions in the content
    const mentionRegex = /@(\w+)/g;
    const mentionsList = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      // Find user by username and create mention
      const [mentionedUser] = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.username, username),
        limit: 1,
      });

      if (mentionedUser) {
        mentionsList.push({
          commentId: comment.id,
          mentionedUserId: mentionedUser.id,
          mentionedBy: userId,
        });
      }
    }

    if (mentionsList.length > 0) {
      await db.insert(mentions).values(mentionsList);
    }

    revalidateTag(`card-comments-${cardId}`);
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to create comment:", error);
    throw new Error("Failed to create comment");
  }
}

export async function updateComment({ commentId, content }: UpdateCommentData) {
  const userId = await getRequiredUserId();

  try {
    const commentIdInt = parseInt(commentId, 10);

    // Check if user owns the comment
    const [existingComment] = await db.query.cardComments.findMany({
      where: (comments, { eq }) => eq(comments.id, commentIdInt),
      limit: 1,
    });

    if (!existingComment || existingComment.userId !== userId) {
      throw new Error("Not authorized to edit this comment");
    }

    const [updatedComment] = await db
      .update(cardComments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(cardComments.id, commentIdInt))
      .returning();

    revalidateTag(`card-comments-${existingComment.cardId}`);
    return { success: true, comment: updatedComment };
  } catch (error) {
    console.error("Failed to update comment:", error);
    throw new Error("Failed to update comment");
  }
}

export async function deleteComment(commentId: string) {
  const userId = await getRequiredUserId();

  try {
    // Convert commentId to integer since the schema expects integer
    const commentIdInt = parseInt(commentId, 10);

    // Check if user owns the comment
    const [existingComment] = await db.query.cardComments.findMany({
      where: (comments, { eq }) => eq(comments.id, commentIdInt),
      limit: 1,
    });

    if (!existingComment || existingComment.userId !== userId) {
      throw new Error("Not authorized to delete this comment");
    }

    // Delete the comment (this will cascade delete replies and mentions)
    await db.delete(cardComments).where(eq(cardComments.id, commentIdInt));

    revalidateTag(`card-comments-${existingComment.cardId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete comment:", error);
    throw new Error("Failed to delete comment");
  }
}

export async function getCardComments(
  cardId: string
): Promise<CommentWithReplies[]> {
  try {
    // 1. Fetch all comments flat
    const comments: BaseComment[] = await db.query.cardComments.findMany({
      where: (c, { eq }) => eq(c.cardId, cardId),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            username: true,
            email: true,
          },
        },
        mentions: {
          with: {
            mentionedUser: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    // 2. Build threaded tree
    function buildTree(parentId: number | null = null): CommentWithReplies[] {
      const children = comments
        .filter((c) => c.parentId === parentId)
        .map((c) => ({
          ...c,
          replies: buildTree(c.id),
        }));

      // Sort replies oldest → newest
      if (parentId !== null) {
        children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }

      return children;
    }

    return buildTree(null);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    throw new Error("Failed to fetch comments");
  }
}
