// lib/services/tasks/base.ts
import { db } from "@/lib/db/db";
import {
  cards,
  columns,
  projects,
  users,
  projectTeamMembers,
  teamMembers,
} from "@/lib/db/schema";
import { and, eq, desc, asc, sql, inArray } from "drizzle-orm";
import type { Card, CardWithRelations } from "@/types";

export interface CreateCardInput {
  columnId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: "high" | "medium" | "low" | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  ownerId?: string | null;
  position?: number;
  status?: string | null;
}

export interface UpdateCardInput {
  id: string;
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: "high" | "medium" | "low" | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  position?: number;
  status?: string | null;
  columnId?: string;
}

export interface MoveCardInput {
  cardId: string;
  newColumnId: string;
  newPosition: number;
}

export interface CardFilters {
  projectId?: string;
  columnId?: string;
  assigneeId?: string;
  priority?: "high" | "medium" | "low";
  isArchived?: boolean;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
}

export class BaseTaskService {
  /**
   * Get the next position for a card in a column
   */
  static async getNextCardPosition(columnId: string): Promise<number> {
    const result = await db
      .select({
        maxPosition: sql<number>`COALESCE(MAX(${cards.position}), -1)`,
      })
      .from(cards)
      .where(and(eq(cards.columnId, columnId), eq(cards.isArchived, false)));

    return (result[0]?.maxPosition ?? -1) + 1;
  }

  /**
   * Check if user has permission to create cards in the project
   */
  static async canUserCreateCardsInProject(
    userId: string,
    projectId: string
  ): Promise<boolean> {
    // Check if user is project owner
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    });

    if (project) return true;

    // Check if user has editor or admin role in any team assigned to the project
    const userProjectAccess = await db
      .select({
        role: projectTeamMembers.role,
      })
      .from(projectTeamMembers)
      .innerJoin(
        teamMembers,
        eq(teamMembers.id, projectTeamMembers.teamMemberId)
      )
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(teamMembers.userId, userId),
          inArray(projectTeamMembers.role, ["admin", "editor"])
        )
      );

    return userProjectAccess.length > 0;
  }

  /**
   * Check if user can edit a specific card
   */
  static async canUserEditCard(
    userId: string,
    cardId: string
  ): Promise<boolean> {
    const cardWithProject = await db
      .select({
        projectId: columns.projectId,
        projectOwnerId: projects.ownerId,
        assigneeId: cards.assigneeId,
      })
      .from(cards)
      .innerJoin(columns, eq(columns.id, cards.columnId))
      .innerJoin(projects, eq(projects.id, columns.projectId))
      .where(eq(cards.id, cardId));

    if (!cardWithProject[0]) return false;

    const { projectId, projectOwnerId, assigneeId } = cardWithProject[0];

    // Project owner can edit any card
    if (projectOwnerId === userId) return true;

    // Card assignee can edit their own card
    if (assigneeId === userId) return true;

    // Check if user has editor or admin role in the project
    return this.canUserCreateCardsInProject(userId, projectId);
  }

  /**
   * Get available assignees for a project
   */
  static async getProjectAssignees(projectId: string) {
    const assignees = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(projectTeamMembers)
      .innerJoin(
        teamMembers,
        eq(teamMembers.id, projectTeamMembers.teamMemberId)
      )
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(eq(projectTeamMembers.projectId, projectId))
      .groupBy(
        users.id,
        users.firstName,
        users.lastName,
        users.email,
        users.avatarUrl
      );

    return assignees;
  }

  /**
   * Update card positions when moving cards
   */
  static async updateCardPositions(
    columnId: string,
    startPosition: number,
    increment: number
  ): Promise<void> {
    await db
      .update(cards)
      .set({
        position: sql`${cards.position} + ${increment}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cards.columnId, columnId),
          sql`${cards.position} >= ${startPosition}`,
          eq(cards.isArchived, false)
        )
      );
  }
}
