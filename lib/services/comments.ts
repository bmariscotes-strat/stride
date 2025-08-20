"use server";

import { db } from "@/lib/db/db";
import { cardComments, mentions } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
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
        // Convert string parentId to number since the schema expects integer
        parentId: parentId ? parseInt(parentId, 10) : null,
      })
      .returning();

    // Process mentions in the content
    const mentionRegex = /@(\w+)/g;
    const mentionsList = []; // Renamed from 'mentions' to avoid conflict with imported table
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
    // Convert commentId to integer since the schema expects integer
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

export async function getCardComments(cardId: string) {
  try {
    const comments = await db.query.cardComments.findMany({
      where: (comments, { eq, isNull }) =>
        and(
          eq(comments.cardId, cardId),
          isNull(comments.parentId) // Only get top-level comments
        ),
      orderBy: [desc(cardComments.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            username: true,
          },
        },
        replies: {
          orderBy: [cardComments.createdAt],
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                username: true,
              },
            },
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
              },
            },
          },
        },
      },
    });

    return comments;
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    throw new Error("Failed to fetch comments");
  }
}
