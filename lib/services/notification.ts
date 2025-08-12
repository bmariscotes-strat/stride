// lib/services/notification.ts
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
import { eq, gt, and, inArray, desc, not } from "drizzle-orm";
import { NotificationType, CreateNotification } from "@/types";
import { createNotificationContent } from "@/lib/utils/notif-helper";

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
      teamId?: string;
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
        teamId: recipient.teamId,
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
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    // Create notification content using template
    const notificationContent = createNotificationContent("task_created", {
      actorName,
      cardTitle,
      columnName,
    });

    const recipients = teamMembersResult.map((member) => ({
      userId: member.userId,
      type: "task_created" as NotificationType,
      title: notificationContent.title,
      message: notificationContent.message,
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
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    // Notify assignee if different from actor
    if (card?.assigneeId && card.assigneeId !== actorUserId) {
      const assigneeNotification = createNotificationContent("task_updated", {
        actorName,
        cardTitle,
        fromColumnName,
        toColumnName,
      });

      recipients.push({
        userId: card.assigneeId,
        type: "task_updated",
        title: assigneeNotification.title,
        message: assigneeNotification.message,
        cardId,
        projectId,
      });
    }

    // Notify team members (limit to avoid spam)
    const limitedTeamMembers = teamMembersResult.slice(0, 5); // Only notify first 5 team members
    limitedTeamMembers.forEach((member) => {
      if (member.userId !== card?.assigneeId) {
        // Don't duplicate assignee notification
        const teamNotification = createNotificationContent("task_moved", {
          actorName,
          cardTitle,
          toColumnName,
        });

        recipients.push({
          userId: member.userId,
          type: "task_moved",
          title: teamNotification.title,
          message: teamNotification.message,
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
    const actorName = `${actor?.firstName} ${actor?.lastName}`;
    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    // Notify new assignee (if not self-assigning)
    if (assigneeId !== actorUserId) {
      const assignmentNotification = createNotificationContent(
        "task_assigned",
        {
          actorName,
          cardTitle,
        }
      );

      recipients.push({
        userId: assigneeId,
        type: "task_assigned",
        title: assignmentNotification.title,
        message: assignmentNotification.message,
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
      const reassignmentNotification = createNotificationContent(
        "task_reassigned",
        {
          cardTitle,
          assigneeName,
        }
      );

      recipients.push({
        userId: previousAssigneeId,
        type: "task_reassigned",
        title: reassignmentNotification.title,
        message: reassignmentNotification.message,
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

    const card = await this.getCardWithAssignee(cardId);
    const actor = await this.getUser(actorUserId);
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const dueDateStr = dueDate.toLocaleDateString();
    const actionText = previousDueDate ? "changed" : "set";

    // Notify assignee
    if (card?.assigneeId && card.assigneeId !== actorUserId) {
      const dueDateNotification = createNotificationContent(
        "due_date_reminder",
        {
          actorName,
          cardTitle,
          dueDateStr,
          actionText,
        }
      );

      await this.createNotification({
        userId: card.assigneeId,
        type: "due_date_reminder",
        title: dueDateNotification.title,
        message: dueDateNotification.message,
        cardId,
        projectId,
      });
    }
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
    const actorName = `${actor?.firstName} ${actor?.lastName}`;
    const recipients: (NotificationRecipient & {
      cardId: string;
      projectId: string;
    })[] = [];

    // Notify mentioned users
    if (mentionedUserIds?.length) {
      const mentionNotification = createNotificationContent("mention", {
        actorName,
        cardTitle: card?.title || "a card",
      });

      mentionedUserIds.forEach((userId) => {
        if (userId !== actorUserId) {
          recipients.push({
            userId,
            type: "mention",
            title: mentionNotification.title,
            message: mentionNotification.message,
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
      const commentNotification = createNotificationContent("comment_added", {
        actorName,
        cardTitle: card.title,
      });

      recipients.push({
        userId: card.assigneeId,
        type: "comment_added",
        title: commentNotification.title,
        message: commentNotification.message,
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
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const teamInviteNotification = createNotificationContent(
      "team_invitation",
      {
        actorName,
        teamName: team?.name || "a team",
        role,
      }
    );

    await this.createNotification({
      userId: newMemberId,
      type: "team_invitation",
      title: teamInviteNotification.title,
      message: teamInviteNotification.message,
      teamId,
    });
  }

  static async notifyTeamMemberRoleChanged(
    teamId: string,
    memberId: string,
    oldRole: string,
    newRole: string
  ) {
    const team = await this.getTeam(teamId);

    const updateRoleNotification = createNotificationContent(
      "team_role_changed",
      {
        teamName: team?.name || "a team",
        oldRole,
        newRole,
      }
    );

    await this.createNotification({
      userId: memberId,
      type: "team_role_changed",
      title: updateRoleNotification.title,
      message: updateRoleNotification.message,
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
        teamId: notifications.teamId,
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
        teamId: notifications.teamId,
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

  /**
   * Delete selected notifications
   */
  static async deleteNotifications(notificationIds: number[]) {
    try {
      return await db
        .delete(notifications)
        .where(inArray(notifications.id, notificationIds))
        .returning();
    } catch (error) {
      console.error("Failed to delete notifications:", error);
      throw error;
    }
  }
  /**
   * Delete old notifications (cleanup job)
   */
  static async deleteOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      await db.delete(notifications).where(
        and(
          eq(notifications.isRead, true)
          // Assuming createdAt is a timestamp column
          // You might need to adjust this based on your schema
          // lt(notifications.createdAt, cutoffDate)
        )
      );
    } catch (error) {
      console.error("Failed to delete old notifications:", error);
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(userId: string) {
    const stats = await db
      .select({
        type: notifications.type,
        count: notifications.id,
        unreadCount: notifications.isRead,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    // Process the results to get counts by type
    const processed = stats.reduce(
      (acc, stat) => {
        if (!acc[stat.type]) {
          acc[stat.type] = { total: 0, unread: 0 };
        }
        acc[stat.type].total++;
        if (!stat.unreadCount) {
          acc[stat.type].unread++;
        }
        return acc;
      },
      {} as Record<string, { total: number; unread: number }>
    );

    return processed;
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

  // Add these methods to your NotificationService class

  /**
   * Get unread notifications created after a specific timestamp
   * This is more efficient for polling scenarios
   */
  static async getUnreadNotificationsSince(
    userId: string,
    since: Date,
    limit: number = 20
  ) {
    return await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        cardId: notifications.cardId,
        projectId: notifications.projectId,
        teamId: notifications.teamId,
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
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          gt(notifications.createdAt, since) // Only get notifications after the timestamp
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  /**
   * Check if there are any new unread notifications since a timestamp
   * Very lightweight query for quick polling checks
   */
  static async hasNewNotificationsSince(
    userId: string,
    since: Date
  ): Promise<boolean> {
    const result = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          gt(notifications.createdAt, since)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get the timestamp of the most recent notification for a user
   * Useful for establishing a baseline for polling
   */
  static async getMostRecentNotificationTimestamp(
    userId: string
  ): Promise<Date | null> {
    const result = await db
      .select({ createdAt: notifications.createdAt })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    return result[0]?.createdAt || null;
  }

  /**
   * Lightweight method to check unread count with caching potential
   * Returns both count and the timestamp of the most recent unread notification
   */
  static async getUnreadCountWithTimestamp(userId: string): Promise<{
    count: number;
    mostRecentUnread: Date | null;
  }> {
    const result = await db
      .select({
        id: notifications.id,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      )
      .orderBy(desc(notifications.createdAt));

    return {
      count: result.length,
      mostRecentUnread: result[0]?.createdAt || null,
    };
  }

  // Add these methods to your NotificationService class

  // =============================================================================
  // PROJECT NOTIFICATIONS (Missing Methods)
  // =============================================================================

  /**
   * Notify team members when a new project is created
   */
  static async notifyProjectCreated(
    actorUserId: string,
    projectId: string,
    projectName: string,
    teamId: string
  ) {
    // Log activity first
    await ActivityService.logProjectCreated(
      actorUserId,
      projectId,
      projectName
    );

    // Get team members to notify (exclude the creator)
    const teamMembers = await this.getTeamMembers(teamId, [actorUserId]);
    const actor = await this.getUser(actorUserId);
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const projectCreatedNotification = createNotificationContent(
      "project_created",
      {
        actorName,
        projectName,
      }
    );

    const recipients = teamMembers.map((member) => ({
      userId: member.userId,
      type: "project_created" as NotificationType,
      title: projectCreatedNotification.title,
      message: projectCreatedNotification.message,
      projectId,
      teamId,
    }));

    await this.createBulkNotifications(recipients);
  }

  /**
   * Notify team members when a project is updated
   */
  static async notifyProjectUpdated(
    actorUserId: string,
    projectId: string,
    projectName: string,
    teamId: string,
    updateSummary: string
  ) {
    // Get team members to notify (exclude the updater)
    const teamMembers = await this.getTeamMembers(teamId, [actorUserId]);
    const actor = await this.getUser(actorUserId);
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const projectUpdatedNotification = createNotificationContent(
      "project_updated",
      {
        actorName,
        projectName,
        updateSummary,
      }
    );

    const recipients = teamMembers.map((member) => ({
      userId: member.userId,
      type: "project_updated" as NotificationType,
      title: projectUpdatedNotification.title,
      message: projectUpdatedNotification.message,
      projectId,
      teamId,
    }));

    await this.createBulkNotifications(recipients);
  }

  /**
   * Notify team members when a project is archived
   */
  static async notifyProjectArchived(
    actorUserId: string,
    projectId: string,
    projectName: string,
    teamId: string
  ) {
    // Get team members to notify (exclude the actor)
    const teamMembers = await this.getTeamMembers(teamId, [actorUserId]);
    const actor = await this.getUser(actorUserId);
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const projectArchivedNotification = createNotificationContent(
      "project_archived",
      {
        actorName,
        projectName,
      }
    );

    const recipients = teamMembers.map((member) => ({
      userId: member.userId,
      type: "project_archived" as NotificationType,
      title: projectArchivedNotification.title,
      message: projectArchivedNotification.message,
      projectId,
      teamId,
    }));

    await this.createBulkNotifications(recipients);
  }

  /**
   * Notify team members when a project is permanently deleted
   */
  static async notifyProjectDeleted(
    actorUserId: string,
    projectId: string,
    projectName: string,
    teamId: string
  ) {
    // Get team members to notify (exclude the actor)
    const teamMembers = await this.getTeamMembers(teamId, [actorUserId]);
    const actor = await this.getUser(actorUserId);
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const projectDeletedNotification = createNotificationContent(
      "project_deleted",
      {
        actorName,
        projectName,
      }
    );

    const recipients = teamMembers.map((member) => ({
      userId: member.userId,
      type: "project_deleted" as NotificationType,
      title: projectDeletedNotification.title,
      message: projectDeletedNotification.message,
      projectId,
      teamId,
    }));

    await this.createBulkNotifications(recipients);
  }

  /**
   * Notify team members when a project is restored from archive
   */
  static async notifyProjectRestored(
    actorUserId: string,
    projectId: string,
    projectName: string,
    teamId: string
  ) {
    // Get team members to notify (exclude the actor)
    const teamMembers = await this.getTeamMembers(teamId, [actorUserId]);
    const actor = await this.getUser(actorUserId);
    const actorName = `${actor?.firstName} ${actor?.lastName}`;

    const projectRestoredNotification = createNotificationContent(
      "project_restored",
      {
        actorName,
        projectName,
      }
    );

    const recipients = teamMembers.map((member) => ({
      userId: member.userId,
      type: "project_restored" as NotificationType,
      title: projectRestoredNotification.title,
      message: projectRestoredNotification.message,
      projectId,
      teamId,
    }));

    await this.createBulkNotifications(recipients);
  }

  // =============================================================================
  // MISSING HELPER METHODS
  // =============================================================================

  /**
   * Get team members (improved version of getProjectTeamMembers)
   */
  private static async getTeamMembers(
    teamId: string,
    excludeUserIds: string[] = []
  ) {
    // Build the where conditions
    const whereConditions = [eq(teamMembers.teamId, teamId)];

    if (excludeUserIds.length > 0) {
      whereConditions.push(not(inArray(teamMembers.userId, excludeUserIds)));
    }

    return await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(and(...whereConditions));
  }
}
