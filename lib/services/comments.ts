// lib/services/comments.ts
import { db } from "@/lib/db/db";
import { cardComments, users, cards } from "@/lib/db/schema";
import { eq, desc, and, ilike } from "drizzle-orm";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";

export interface CreateCommentInput {
  cardId: string;
  content: string;
}

export interface UpdateCommentInput {
  id: number;
  content: string;
}

export interface CommentWithUser {
  id: number;
  cardId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export class CommentService {
  /**
   * Check if user can access card (and thus its comments)
   */
  private static async canAccessCard(
    userId: string,
    cardId: string
  ): Promise<boolean> {
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
      with: {
        column: {
          with: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return false;
    }

    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, card.column.project.id);

    return permissionChecker.canViewProject();
  }

  /**
   * Check if user can edit card (and thus add comments)
   */
  private static async canEditCard(
    userId: string,
    cardId: string
  ): Promise<boolean> {
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
      with: {
        column: {
          with: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return false;
    }

    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, card.column.project.id);

    return permissionChecker.canCreateCards(); // Users who can create cards can also comment
  }

  /**
   * Get all comments for a card
   */
  static async getCardComments(
    cardId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CommentWithUser[]> {
    // Check permissions
    const canAccess = await this.canAccessCard(userId, cardId);
    if (!canAccess) {
      throw new Error("Insufficient permissions to view comments");
    }

    const comments = await db.query.cardComments.findMany({
      where: eq(cardComments.cardId, cardId),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: desc(cardComments.createdAt),
      limit,
      offset,
    });

    return comments as CommentWithUser[];
  }

  /**
   * Add a comment to a card
   */
  static async addComment(
    input: CreateCommentInput,
    userId: string
  ): Promise<CommentWithUser> {
    // Check permissions
    const canEdit = await this.canEditCard(userId, input.cardId);
    if (!canEdit) {
      throw new Error("Insufficient permissions to add comments");
    }

    // Create the comment
    const [newComment] = await db
      .insert(cardComments)
      .values({
        cardId: input.cardId,
        userId,
        content: input.content,
      })
      .returning();

    // Get the comment with user data
    const commentWithUser = await db.query.cardComments.findFirst({
      where: eq(cardComments.id, newComment.id),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!commentWithUser) {
      throw new Error("Failed to retrieve created comment");
    }

    return commentWithUser as CommentWithUser;
  }

  /**
   * Update a comment
   */
  static async updateComment(
    input: UpdateCommentInput,
    userId: string
  ): Promise<CommentWithUser> {
    // Get the existing comment
    const existingComment = await db.query.cardComments.findFirst({
      where: eq(cardComments.id, input.id),
      with: {
        user: true,
      },
    });

    if (!existingComment) {
      throw new Error("Comment not found");
    }

    // Check if user owns the comment
    if (existingComment.userId !== userId) {
      throw new Error("You can only edit your own comments");
    }

    // Check if user still has access to the card
    const canAccess = await this.canAccessCard(userId, existingComment.cardId);
    if (!canAccess) {
      throw new Error("Insufficient permissions to edit this comment");
    }

    // Update the comment
    const [updatedComment] = await db
      .update(cardComments)
      .set({
        content: input.content,
        updatedAt: new Date(),
      })
      .where(eq(cardComments.id, input.id))
      .returning();

    // Get the updated comment with user data
    const commentWithUser = await db.query.cardComments.findFirst({
      where: eq(cardComments.id, updatedComment.id),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return commentWithUser as CommentWithUser;
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: number, userId: string): Promise<void> {
    // Get the existing comment
    const existingComment = await db.query.cardComments.findFirst({
      where: eq(cardComments.id, commentId),
    });

    if (!existingComment) {
      throw new Error("Comment not found");
    }

    // Check if user owns the comment or has admin permissions
    if (existingComment.userId !== userId) {
      // Check if user has admin permissions on the project
      const card = await db.query.cards.findFirst({
        where: eq(cards.id, existingComment.cardId),
        with: {
          column: {
            with: {
              project: true,
            },
          },
        },
      });

      if (card) {
        const permissionChecker = new ProjectPermissionChecker();
        await permissionChecker.loadContext(userId, card.column.project.id);

        if (!permissionChecker.canEditProject()) {
          throw new Error("You can only delete your own comments");
        }
      } else {
        throw new Error("You can only delete your own comments");
      }
    }

    // Delete the comment
    await db.delete(cardComments).where(eq(cardComments.id, commentId));
  }

  /**
   * Get comment count for a card
   */
  static async getCommentCount(
    cardId: string,
    userId: string
  ): Promise<number> {
    // Check permissions
    const canAccess = await this.canAccessCard(userId, cardId);
    if (!canAccess) {
      throw new Error("Insufficient permissions to view comment count");
    }

    const comments = await db.query.cardComments.findMany({
      where: eq(cardComments.cardId, cardId),
    });

    return comments.length;
  }

  /**
   * Get recent comments for a user across all accessible projects
   */
  static async getUserRecentComments(
    userId: string,
    limit: number = 10
  ): Promise<CommentWithUser[]> {
    // This would need more complex logic to check permissions across multiple projects
    // For now, just return comments by the user
    const comments = await db.query.cardComments.findMany({
      where: eq(cardComments.userId, userId),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: desc(cardComments.createdAt),
      limit,
    });

    return comments as CommentWithUser[];
  }

  /**
   * Search comments within a card
   */
  static async searchCardComments(
    cardId: string,
    query: string,
    userId: string,
    limit: number = 20
  ): Promise<CommentWithUser[]> {
    // Check permissions
    const canAccess = await this.canAccessCard(userId, cardId);
    if (!canAccess) {
      throw new Error("Insufficient permissions to search comments");
    }

    if (!query.trim()) {
      return this.getCardComments(cardId, userId, limit);
    }

    // Use ilike for case-insensitive search
    const comments = await db.query.cardComments.findMany({
      where: and(
        eq(cardComments.cardId, cardId),
        ilike(cardComments.content, `%${query.trim()}%`)
      ),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: desc(cardComments.createdAt),
      limit,
    });

    return comments as CommentWithUser[];
  }
}
