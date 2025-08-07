// =============================================================================
// ACTIVITY SERVICE - Business logic for activity logging
// =============================================================================

import { db } from "@/lib/db/db"; // Adjust path to your database instance
import { activityLog, users, cards } from "@/lib/db/schema";
import {
  ActivityLogParams,
  FieldChange,
  ActivityLogResult,
} from "@/types/enums/activity";
import { eq } from "drizzle-orm";

export class ActivityService {
  /**
   * Core method to log any activity with comprehensive context
   */
  static async log({
    userId,
    actionType,
    projectId,
    cardId,
    oldValue,
    newValue,
    metadata = {},
  }: ActivityLogParams): Promise<void> {
    try {
      await db.insert(activityLog).values({
        userId,
        actionType,
        projectId,
        cardId,
        oldValue: oldValue
          ? JSON.stringify({ value: oldValue, metadata })
          : null,
        newValue: newValue
          ? JSON.stringify({ value: newValue, metadata })
          : JSON.stringify({ metadata }),
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
      // Don't throw - activity logging should not break main operations
    }
  }

  // =============================================================================
  // PROJECT ACTIVITY LOGGERS
  // =============================================================================

  static async logProjectCreated(
    userId: string,
    projectId: string,
    projectName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "project_created",
      projectId,
      newValue: projectName,
    });
  }

  static async logProjectUpdated(
    userId: string,
    projectId: string,
    changes: FieldChange[]
  ): Promise<void> {
    for (const change of changes) {
      await this.log({
        userId,
        actionType: "project_updated",
        projectId,
        oldValue: String(change.oldValue),
        newValue: String(change.newValue),
        metadata: { reason: `Updated ${change.field}` },
      });
    }
  }

  static async logProjectArchived(
    userId: string,
    projectId: string,
    projectName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "project_archived",
      projectId,
      oldValue: projectName,
    });
  }

  static async logProjectDeleted(
    userId: string,
    projectId: string,
    projectName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "project_deleted",
      projectId,
      oldValue: projectName,
    });
  }

  // =============================================================================
  // CARD ACTIVITY LOGGERS
  // =============================================================================

  static async logCardCreated(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    columnName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_created",
      projectId,
      cardId,
      newValue: cardTitle,
      metadata: { toColumnName: columnName },
    });
  }

  static async logCardMoved(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    fromColumnId: string,
    toColumnId: string,
    fromColumnName: string,
    toColumnName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_moved",
      projectId,
      cardId,
      oldValue: fromColumnName,
      newValue: toColumnName,
      metadata: {
        fromColumnId,
        toColumnId,
        fromColumnName,
        toColumnName,
      },
    });
  }

  static async logCardAssigned(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    assigneeId: string,
    assigneeName: string,
    previousAssigneeId?: string,
    previousAssigneeName?: string
  ): Promise<void> {
    const actionType = previousAssigneeId ? "card_updated" : "card_assigned";

    await this.log({
      userId,
      actionType,
      projectId,
      cardId,
      oldValue: previousAssigneeName || null,
      newValue: assigneeName,
      metadata: {
        previousAssigneeId,
        newAssigneeId: assigneeId,
        previousAssigneeName,
        newAssigneeName: assigneeName,
      },
    });
  }

  static async logCardUnassigned(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    previousAssigneeId: string,
    previousAssigneeName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_unassigned",
      projectId,
      cardId,
      oldValue: previousAssigneeName,
      metadata: {
        previousAssigneeId,
        previousAssigneeName,
      },
    });
  }

  static async logCardPriorityChanged(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    oldPriority: string,
    newPriority: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_priority_changed",
      projectId,
      cardId,
      oldValue: oldPriority,
      newValue: newPriority,
    });
  }

  static async logCardDueDateSet(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    dueDate: Date,
    previousDueDate?: Date
  ): Promise<void> {
    const actionType = previousDueDate
      ? "card_due_date_changed"
      : "card_due_date_set";

    await this.log({
      userId,
      actionType,
      projectId,
      cardId,
      oldValue: previousDueDate?.toISOString() || null,
      newValue: dueDate.toISOString(),
    });
  }

  static async logCardDueDateRemoved(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    previousDueDate: Date
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_due_date_removed",
      projectId,
      cardId,
      oldValue: previousDueDate.toISOString(),
    });
  }

  static async logCardUpdated(
    userId: string,
    projectId: string,
    cardId: string,
    changes: FieldChange[]
  ): Promise<void> {
    for (const change of changes) {
      await this.log({
        userId,
        actionType: "card_updated",
        projectId,
        cardId,
        oldValue: String(change.oldValue),
        newValue: String(change.newValue),
        metadata: { reason: `Updated ${change.field}` },
      });
    }
  }

  static async logCardDeleted(
    userId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    columnName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_deleted",
      projectId,
      cardId,
      oldValue: cardTitle,
      metadata: { fromColumnName: columnName },
    });
  }

  // =============================================================================
  // LABEL ACTIVITY LOGGERS
  // =============================================================================

  static async logCardLabelAdded(
    userId: string,
    projectId: string,
    cardId: string,
    labelId: string,
    labelName: string,
    labelColor: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_label_added",
      projectId,
      cardId,
      newValue: labelName,
      metadata: { labelId, labelName, labelColor },
    });
  }

  static async logCardLabelRemoved(
    userId: string,
    projectId: string,
    cardId: string,
    labelId: string,
    labelName: string,
    labelColor: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "card_label_removed",
      projectId,
      cardId,
      oldValue: labelName,
      metadata: { labelId, labelName, labelColor },
    });
  }

  // =============================================================================
  // COMMENT ACTIVITY LOGGERS
  // =============================================================================

  static async logCommentCreated(
    userId: string,
    projectId: string,
    cardId: string,
    commentContent: string,
    mentionedUserIds?: string[]
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "comment_created",
      projectId,
      cardId,
      newValue:
        commentContent.substring(0, 100) +
        (commentContent.length > 100 ? "..." : ""),
      metadata: { mentionedUserIds },
    });

    // Log mentions separately
    if (mentionedUserIds?.length) {
      await this.logUserMentioned(userId, projectId, cardId, mentionedUserIds);
    }
  }

  static async logCommentUpdated(
    userId: string,
    projectId: string,
    cardId: string,
    oldContent: string,
    newContent: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "comment_updated",
      projectId,
      cardId,
      oldValue:
        oldContent.substring(0, 100) + (oldContent.length > 100 ? "..." : ""),
      newValue:
        newContent.substring(0, 100) + (newContent.length > 100 ? "..." : ""),
    });
  }

  static async logCommentDeleted(
    userId: string,
    projectId: string,
    cardId: string,
    commentContent: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "comment_deleted",
      projectId,
      cardId,
      oldValue:
        commentContent.substring(0, 100) +
        (commentContent.length > 100 ? "..." : ""),
    });
  }

  // =============================================================================
  // ATTACHMENT ACTIVITY LOGGERS
  // =============================================================================

  static async logAttachmentUploaded(
    userId: string,
    projectId: string,
    cardId: string,
    fileName: string,
    fileSize?: number
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "attachment_uploaded",
      projectId,
      cardId,
      newValue: fileName,
      metadata: { fileName, fileSize },
    });
  }

  static async logAttachmentDeleted(
    userId: string,
    projectId: string,
    cardId: string,
    fileName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "attachment_deleted",
      projectId,
      cardId,
      oldValue: fileName,
      metadata: { fileName },
    });
  }

  // =============================================================================
  // TEAM ACTIVITY LOGGERS
  // =============================================================================

  static async logTeamMemberAdded(
    userId: string,
    projectId: string | null,
    newMemberId: string,
    newMemberName: string,
    role: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "team_member_invited",
      projectId,
      newValue: newMemberName,
      metadata: { newRole: role },
    });
  }

  static async logTeamMemberRoleChanged(
    userId: string,
    projectId: string | null,
    memberId: string,
    memberName: string,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "team_member_role_changed",
      projectId,
      oldValue: `${memberName} (${oldRole})`,
      newValue: `${memberName} (${newRole})`,
      metadata: { previousRole: oldRole, newRole },
    });
  }

  static async logTeamMemberRemoved(
    userId: string,
    projectId: string | null,
    removedMemberId: string,
    removedMemberName: string,
    role: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "team_member_removed",
      projectId,
      oldValue: `${removedMemberName} (${role})`,
      metadata: { previousRole: role },
    });
  }

  // =============================================================================
  // COLUMN ACTIVITY LOGGERS
  // =============================================================================

  static async logColumnCreated(
    userId: string,
    projectId: string,
    columnName: string,
    position: number
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "column_created",
      projectId,
      newValue: columnName,
      metadata: { newPosition: position },
    });
  }

  static async logColumnUpdated(
    userId: string,
    projectId: string,
    columnId: string,
    changes: FieldChange[]
  ): Promise<void> {
    for (const change of changes) {
      await this.log({
        userId,
        actionType: "column_updated",
        projectId,
        oldValue: String(change.oldValue),
        newValue: String(change.newValue),
        metadata: { reason: `Updated ${change.field}` },
      });
    }
  }

  static async logColumnReordered(
    userId: string,
    projectId: string,
    columnName: string,
    oldPosition: number,
    newPosition: number
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "column_reordered",
      projectId,
      oldValue: `${columnName} (position ${oldPosition})`,
      newValue: `${columnName} (position ${newPosition})`,
      metadata: { oldPosition, newPosition },
    });
  }

  static async logColumnDeleted(
    userId: string,
    projectId: string,
    columnName: string
  ): Promise<void> {
    await this.log({
      userId,
      actionType: "column_deleted",
      projectId,
      oldValue: columnName,
    });
  }

  // =============================================================================
  // MENTION ACTIVITY LOGGERS
  // =============================================================================

  private static async logUserMentioned(
    userId: string,
    projectId: string,
    cardId: string,
    mentionedUserIds: string[]
  ): Promise<void> {
    // Get mentioned user names for context
    const mentionedUsers = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(
        mentionedUserIds.length > 0
          ? mentionedUserIds
              .map((id) => eq(users.id, id))
              .reduce((acc, curr) => acc || curr)
          : eq(users.id, "")
      );

    const mentionedUsernames = mentionedUsers.map((u) => u.username);

    await this.log({
      userId,
      actionType: "user_mentioned",
      projectId,
      cardId,
      newValue: mentionedUsernames.join(", "),
      metadata: {
        mentionedUserIds,
        mentionedUsernames,
      },
    });
  }

  // =============================================================================
  // QUERY METHODS
  // =============================================================================

  /**
   * Get activity history for a project with pagination
   */
  static async getProjectActivity(
    projectId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ActivityLogResult[]> {
    return await db
      .select({
        id: activityLog.id,
        actionType: activityLog.actionType,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
        },
        card: {
          id: cards.id,
          title: cards.title,
        },
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .leftJoin(cards, eq(activityLog.cardId, cards.id))
      .where(eq(activityLog.projectId, projectId))
      .orderBy(activityLog.createdAt)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get activity history for a specific card
   */
  static async getCardActivity(cardId: string): Promise<ActivityLogResult[]> {
    return await db
      .select({
        id: activityLog.id,
        actionType: activityLog.actionType,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(eq(activityLog.cardId, cardId))
      .orderBy(activityLog.createdAt);
  }

  /**
   * Get recent activity across all projects for a user's dashboard
   */
  static async getUserRecentActivity(
    userId: string,
    limit: number = 20
  ): Promise<ActivityLogResult[]> {
    return await db
      .select({
        id: activityLog.id,
        actionType: activityLog.actionType,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
        },
        card: {
          id: cards.id,
          title: cards.title,
        },
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .leftJoin(cards, eq(activityLog.cardId, cards.id))
      .where(eq(activityLog.userId, userId))
      .orderBy(activityLog.createdAt)
      .limit(limit);
  }
}
