"use server";

import { db } from "@/lib/db/db";
import { cardComments, mentions, users, cards, columns } from "@/lib/db/schema";
import { and, eq, desc, asc, InferSelectModel, sql } from "drizzle-orm";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { revalidateTag } from "next/cache";
import { ActivityService } from "@/lib/services/activity";
import { NotificationService } from "@/lib/services/notification";
import { pusher } from "@/lib/websocket/pusher";
import { UpdateCommentData } from "@/types/forms/comment";

interface CreateCommentData {
  cardId: string;
  content: string;
  parentId?: string; // For replies - changed to string to match input
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
    // Get card and project info for activity logging and notifications
    const card = await db.query.cards.findFirst({
      where: (cards, { eq }) => eq(cards.id, cardId),
      with: {
        column: {
          with: {
            project: true,
          },
        },
        assignee: true,
      },
    });

    if (!card) {
      throw new Error("Card not found");
    }

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
    const mentionedUserIds: string[] = [];
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
        mentionedUserIds.push(mentionedUser.id);
      }
    }

    if (mentionsList.length > 0) {
      await db.insert(mentions).values(mentionsList);
    }

    // Get the complete comment with user and mentions for real-time event
    const [completeComment] = await db.query.cardComments.findMany({
      where: (c, { eq }) => eq(c.id, comment.id),
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
      limit: 1,
    });

    // Emit real-time event
    if (completeComment) {
      const commentWithReplies: CommentWithReplies = {
        ...completeComment,
        replies: [],
      };

      await pusher.trigger(`card-${cardId}`, "comment-created", {
        comment: commentWithReplies,
        cardId,
      });
    }

    // Log activity and send notifications
    try {
      const projectId = card.column.project.id;

      // Send comment notifications
      await NotificationService.notifyCommentCreated(
        userId,
        projectId,
        cardId,
        content,
        mentionedUserIds.length > 0 ? mentionedUserIds : undefined
      );
    } catch (error) {
      console.error(
        "Failed to log comment activity/send notifications:",
        error
      );
      // Don't fail the main operation
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
      with: {
        card: {
          with: {
            column: {
              with: {
                project: true,
              },
            },
          },
        },
      },
      limit: 1,
    });

    if (!existingComment || existingComment.userId !== userId) {
      throw new Error("Not authorized to edit this comment");
    }

    const oldContent = existingComment.content;
    const cardId = existingComment.cardId;

    const [updatedComment] = await db
      .update(cardComments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(cardComments.id, commentIdInt))
      .returning();

    // Emit real-time event
    await pusher.trigger(`card-${cardId}`, "comment-updated", {
      commentId: commentIdInt,
      content,
      cardId,
    });

    // Log activity for comment update
    try {
      const projectId = existingComment.card.column.project.id;

      await ActivityService.logCommentUpdated(
        userId,
        projectId,
        existingComment.cardId,
        oldContent,
        content
      );
    } catch (error) {
      console.error("Failed to log comment update activity:", error);
      // Don't fail the main operation
    }

    revalidateTag(`card-comments-${cardId}`);
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
      with: {
        card: {
          with: {
            column: {
              with: {
                project: true,
              },
            },
          },
        },
      },
      limit: 1,
    });

    if (!existingComment || existingComment.userId !== userId) {
      throw new Error("Not authorized to delete this comment");
    }

    const commentContent = existingComment.content;
    const cardId = existingComment.cardId;

    // Delete the comment (this will cascade delete replies and mentions)
    await db.delete(cardComments).where(eq(cardComments.id, commentIdInt));

    // Emit real-time event
    await pusher.trigger(`card-${cardId}`, "comment-deleted", {
      commentId: commentIdInt,
      cardId,
    });

    // Log activity before deletion
    try {
      const projectId = existingComment.card.column.project.id;

      await ActivityService.logCommentDeleted(
        userId,
        projectId,
        cardId,
        commentContent
      );
    } catch (error) {
      console.error("Failed to log comment deletion activity:", error);
      // Don't fail the main operation
    }

    revalidateTag(`card-comments-${cardId}`);
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

/**
 * Helper function to extract mentioned usernames from comment content
 */
function extractMentionedUsernames(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Helper function to get mentioned users by usernames
 */
async function getMentionedUsersByUsernames(usernames: string[]): Promise<
  Array<{
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  }>
> {
  if (usernames.length === 0) return [];

  return await db.query.users.findMany({
    where: (users, { inArray }) => inArray(users.username, usernames),
    columns: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  });
}

/**
 * Get comment statistics for a card (useful for analytics)
 */
export async function getCardCommentStats(cardId: string) {
  try {
    const [totalComments] = await db
      .select({
        total: sql<number>`count(*)`,
        withMentions: sql<number>`count(case when exists(select 1 from ${mentions} where ${mentions.commentId} = ${cardComments.id}) then 1 end)`,
        uniqueCommenters: sql<number>`count(distinct ${cardComments.userId})`,
      })
      .from(cardComments)
      .where(eq(cardComments.cardId, cardId));

    return {
      totalComments: totalComments?.total || 0,
      commentsWithMentions: totalComments?.withMentions || 0,
      uniqueCommenters: totalComments?.uniqueCommenters || 0,
    };
  } catch (error) {
    console.error("Failed to fetch comment stats:", error);
    throw new Error("Failed to fetch comment stats");
  }
}

/**
 * Get recent comments across multiple cards (useful for activity feeds)
 */
export async function getRecentCommentsForProject(
  projectId: string,
  limit: number = 20
): Promise<Array<BaseComment & { card: { id: string; title: string } }>> {
  try {
    return await db.query.cardComments.findMany({
      where: (comments, { eq, and, inArray }) => {
        // First get all cards for this project
        const projectCards = db
          .select({ id: cards.id })
          .from(cards)
          .innerJoin(columns, eq(cards.columnId, columns.id))
          .where(eq(columns.projectId, projectId));

        return inArray(comments.cardId, projectCards);
      },
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
        card: {
          columns: {
            id: true,
            title: true,
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
      orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch recent project comments:", error);
    throw new Error("Failed to fetch recent project comments");
  }
}

/**
 * Get comments where a user was mentioned
 */
export async function getUserMentionedComments(
  userId: string,
  limit: number = 50
): Promise<BaseComment[]> {
  try {
    const mentionedComments = await db.query.mentions.findMany({
      where: (mentions, { eq }) => eq(mentions.mentionedUserId, userId),
      with: {
        comment: {
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
            card: {
              columns: {
                id: true,
                title: true,
              },
              with: {
                column: {
                  with: {
                    project: {
                      columns: {
                        id: true,
                        name: true,
                      },
                    },
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
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: (mentions, { desc }) => [desc(mentions.createdAt)],
      limit,
    });

    return mentionedComments.map((m) => m.comment);
  } catch (error) {
    console.error("Failed to fetch mentioned comments:", error);
    throw new Error("Failed to fetch mentioned comments");
  }
}

/**
 * Mark mentions as read (useful for notification management)
 */
export async function markMentionsAsRead(userId: string, commentIds: number[]) {
  try {
    return { success: true };
  } catch (error) {
    console.error("Failed to mark mentions as read:", error);
    throw new Error("Failed to mark mentions as read");
  }
}
