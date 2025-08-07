// =============================================================================
// NOTIFICATION SERVICE - Integrates with ActivityService
// =============================================================================

import { db } from "@/lib/db/db";
import {
  notifications,
  users,
  cards,
  projects,
  teams,
  teamMembers,
} from "@/lib/db/schema";
import { ActivityService } from "@/lib/services/activity";
import { eq, and, inArray, desc, not } from "drizzle-orm";
import { NotificationType, CreateNotification } from "@/types";

export type NotificationRecipient = {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
};

export class NotificationService {
  // =============================================================================
  // CORE NOTIFICATION METHODS
  // =============================================================================

  /**
   * Create a notification for a user
   */
  private static async createNotification({
    userId,
    type,
    title,
    message,
    cardId,
    projectId,
    teamId,
  }: CreateNotification) {
    try {
      await db.insert(notifications).values({
        userId,
        type,
        title,
        message,
        cardId,
        projectId,
        teamId,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  /**
   * Create notifications for multiple users
   */
  private static async createBulkNotifications(
    recipients: (NotificationRecipient & {
      cardId?: string;
      projectId?: string;
    })[]
  ) {
    try {
      const notificationValues = recipients.map((recipient) => ({
        userId: recipient.userId,
        type: recipient.type,
        title: recipient.title,
        message: recipient.message,
        cardId: recipient.cardId,
        projectId: recipient.projectId,
        isRead: false,
        createdAt: new Date(),
      }));

      await db.insert(notifications).values(notificationValues);
    } catch (error) {
      console.error("Failed to create bulk notifications:", error);
    }
  }

  // =============================================================================
  // CARD ACTIVITY NOTIFICATIONS
  // =============================================================================

  static async notifyCardCreated(
    actorUserId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    columnName: string
  ) {
    // Log activity first
    await ActivityService.logCardCreated(
      actorUserId,
      projectId,
      cardId,
      cardTitle,
      columnName
    );

    // Get team members to notify (exclude the actor)
    const teamMembersResult = await this.getProjectTeamMembers(projectId, [
      actorUserId,
    ]);
    const actor = await this.getUser(actorUserId);

    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = teamMembersResult.map((member) => ({
      userId: member.userId,
      type: "task_assigned" as const,
      title: `New card created`,
      message: `${actor?.firstName} ${actor?.lastName} created "${cardTitle}" in ${columnName}`,
      cardId,
      projectId,
    }));

    await this.createBulkNotifications(recipients);
  }

  static async notifyCardMoved(
    actorUserId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    fromColumnId: string,
    toColumnId: string,
    fromColumnName: string,
    toColumnName: string
  ) {
    // Log activity first
    await ActivityService.logCardMoved(
      actorUserId,
      projectId,
      cardId,
      cardTitle,
      fromColumnId,
      toColumnId,
      fromColumnName,
      toColumnName
    );

    // Get interested users (assignee + team members)
    const card = await this.getCardWithAssignee(cardId);
    const teamMembersResult = await this.getProjectTeamMembers(projectId, [
      actorUserId,
    ]);
    const actor = await this.getUser(actorUserId);

    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    // Notify assignee if different from actor
    if (card?.assigneeId && card.assigneeId !== actorUserId) {
      recipients.push({
        userId: card.assigneeId,
        type: "task_updated",
        title: `Your card was moved`,
        message: `${actor?.firstName} ${actor?.lastName} moved "${cardTitle}" from ${fromColumnName} to ${toColumnName}`,
        cardId,
        projectId,
      });
    }

    // Notify team members (limit to avoid spam)
    const limitedTeamMembers = teamMembersResult.slice(0, 5); // Only notify first 5 team members
    limitedTeamMembers.forEach((member) => {
      if (member.userId !== card?.assigneeId) {
        // Don't duplicate assignee notification
        recipients.push({
          userId: member.userId,
          type: "task_updated",
          title: `Card moved`,
          message: `${actor?.firstName} ${actor?.lastName} moved "${cardTitle}" to ${toColumnName}`,
          cardId,
          projectId,
        });
      }
    });

    await this.createBulkNotifications(recipients);
  }

  static async notifyCardAssigned(
    actorUserId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    assigneeId: string,
    assigneeName: string,
    previousAssigneeId?: string,
    previousAssigneeName?: string
  ) {
    // Log activity first
    await ActivityService.logCardAssigned(
      actorUserId,
      projectId,
      cardId,
      cardTitle,
      assigneeId,
      assigneeName,
      previousAssigneeId,
      previousAssigneeName
    );

    const actor = await this.getUser(actorUserId);
    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    // Notify new assignee (if not self-assigning)
    if (assigneeId !== actorUserId) {
      recipients.push({
        userId: assigneeId,
        type: "task_assigned",
        title: `You were assigned to a card`,
        message: `${actor?.firstName} ${actor?.lastName} assigned you to "${cardTitle}"`,
        cardId,
        projectId,
      });
    }

    // Notify previous assignee if being reassigned
    if (
      previousAssigneeId &&
      previousAssigneeId !== actorUserId &&
      previousAssigneeId !== assigneeId
    ) {
      recipients.push({
        userId: previousAssigneeId,
        type: "task_updated",
        title: `Card reassigned`,
        message: `"${cardTitle}" has been reassigned to ${assigneeName}`,
        cardId,
        projectId,
      });
    }

    await this.createBulkNotifications(recipients);
  }

  static async notifyCardDueDateChanged(
    actorUserId: string,
    projectId: string,
    cardId: string,
    cardTitle: string,
    dueDate: Date,
    previousDueDate?: Date
  ) {
    // Log activity first
    await ActivityService.logCardDueDateSet(
      actorUserId,
      projectId,
      cardId,
      cardTitle,
      dueDate,
      previousDueDate
    );

    // Notify assignee and team members about due date change
    const card = await this.getCardWithAssignee(cardId);
    const actor = await this.getUser(actorUserId);
    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    const dueDateStr = dueDate.toLocaleDateString();
    const actionText = previousDueDate ? "changed" : "set";

    // Notify assignee
    if (card?.assigneeId && card.assigneeId !== actorUserId) {
      recipients.push({
        userId: card.assigneeId,
        type: "due_date_reminder",
        title: `Due date ${actionText}`,
        message: `${actor?.firstName} ${actor?.lastName} ${actionText} the due date for "${cardTitle}" to ${dueDateStr}`,
        cardId,
        projectId,
      });
    }

    await this.createBulkNotifications(recipients);
  }

  // =============================================================================
  // COMMENT NOTIFICATIONS
  // =============================================================================

  static async notifyCommentCreated(
    actorUserId: string,
    projectId: string,
    cardId: string,
    commentContent: string,
    mentionedUserIds?: string[]
  ) {
    // Log activity first
    await ActivityService.logCommentCreated(
      actorUserId,
      projectId,
      cardId,
      commentContent,
      mentionedUserIds
    );

    const actor = await this.getUser(actorUserId);
    const card = await this.getCardWithAssignee(cardId);
    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    // Notify mentioned users
    if (mentionedUserIds?.length) {
      mentionedUserIds.forEach((userId) => {
        if (userId !== actorUserId) {
          recipients.push({
            userId,
            type: "mention",
            title: `You were mentioned`,
            message: `${actor?.firstName} ${actor?.lastName} mentioned you in a comment on "${card?.title}"`,
            cardId,
            projectId,
          });
        }
      });
    }

    // Notify card assignee (if not mentioned and not the commenter)
    if (
      card?.assigneeId &&
      card.assigneeId !== actorUserId &&
      !mentionedUserIds?.includes(card.assigneeId)
    ) {
      recipients.push({
        userId: card.assigneeId,
        type: "comment_added",
        title: `New comment on your card`,
        message: `${actor?.firstName} ${actor?.lastName} commented on "${card.title}"`,
        cardId,
        projectId,
      });
    }

    await this.createBulkNotifications(recipients);
  }

  // =============================================================================
  // TEAM NOTIFICATIONS
  // =============================================================================

  static async notifyTeamMemberAdded(
    actorUserId: string,
    teamId: string,
    newMemberId: string,
    newMemberName: string,
    role: string
  ) {
    const actor = await this.getUser(actorUserId);
    const team = await this.getTeam(teamId);

    // Notify the new member
    await this.createNotification({
      userId: newMemberId,
      type: "team_invitation",
      title: `Added to team`,
      message: `${actor?.firstName} ${actor?.lastName} added you to "${team?.name}" as ${role}`,
      teamId,
    });
  }

  // =============================================================================
  // NOTIFICATION QUERIES
  // =============================================================================

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userId: string, limit: number = 20) {
    return await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        cardId: notifications.cardId,
        projectId: notifications.projectId,
        createdAt: notifications.createdAt,
        card: {
          id: cards.id,
          title: cards.title,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(notifications)
      .leftJoin(cards, eq(notifications.cardId, cards.id))
      .leftJoin(projects, eq(notifications.projectId, projects.id))
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  /**
   * Get all notifications for a user (with pagination)
   */
  static async getAllNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        cardId: notifications.cardId,
        projectId: notifications.projectId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        card: {
          id: cards.id,
          title: cards.title,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(notifications)
      .leftJoin(cards, eq(notifications.cardId, cards.id))
      .leftJoin(projects, eq(notifications.projectId, projects.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(notificationIds: number[]) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(inArray(notifications.id, notificationIds));
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );

    return result.length;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private static async getUser(userId: string) {
    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0] || null;
  }

  private static async getProject(projectId: string) {
    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return result[0] || null;
  }

  private static async getTeam(teamId: string) {
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    return result[0] || null;
  }

  private static async getCardWithAssignee(cardId: string) {
    const result = await db
      .select({
        id: cards.id,
        title: cards.title,
        assigneeId: cards.assigneeId,
      })
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    return result[0] || null;
  }

  private static async getProjectTeamMembers(
    projectId: string,
    excludeUserIds: string[] = []
  ) {
    // First get the project's team ID
    const project = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project[0]) return [];

    // Build the where conditions
    const whereConditions = [eq(teamMembers.teamId, project[0].teamId)];

    if (excludeUserIds.length > 0) {
      whereConditions.push(not(inArray(teamMembers.userId, excludeUserIds)));
    }

    // Execute the query with all conditions
    return await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(and(...whereConditions));
  }
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// In your card service methods:

// When creating a card
await NotificationService.notifyCardCreated(
  userId, projectId, cardId, cardTitle, columnName
);

// When moving a card
await NotificationService.notifyCardMoved(
  userId, projectId, cardId, cardTitle,
  fromColumnId, toColumnId, fromColumnName, toColumnName
);

// In your API routes:

// Get unread notifications
const unreadNotifications = await NotificationService.getUnreadNotifications(userId);

// Mark specific notifications as read
await NotificationService.markAsRead([1, 2, 3]);

// Get unread count for badge
const unreadCount = await NotificationService.getUnreadCount(userId);
*/
