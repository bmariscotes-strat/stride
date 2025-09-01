// lib/services/tasks/queries.ts
import { db } from "@/lib/db/db";
import {
  cards,
  columns,
  users,
  cardComments,
  cardLabels,
  projects,
  projectTeamMembers,
  teamMembers,
  cardAttachments,
} from "@/lib/db/schema";
import {
  and,
  eq,
  desc,
  asc,
  sql,
  inArray,
  count,
  isNull,
  isNotNull,
  ilike,
  or,
} from "drizzle-orm";
import { BaseTaskService } from "./base";
import type {
  CardFilters,
  PaginationOptions,
  SortOptions,
  CardQueryResult,
  CardWithServiceRelations,
} from "@/types";

export class TaskQueryService extends BaseTaskService {
  /**
   * Get cards by project with filters and pagination
   */
  static async getCardsByProject(
    projectId: string,
    userId: string,
    filters: CardFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 50 },
    sort: SortOptions = { field: "position", direction: "asc" }
  ): Promise<CardQueryResult> {
    // Check if user has access to the project
    const hasAccess = await this.canUserCreateCardsInProject(userId, projectId);
    if (!hasAccess) {
      // Check if user is project owner
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
      });

      if (!project) {
        throw new Error("Access denied to this project");
      }
    }

    // Ensure pagination values are defined with defaults
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(columns.projectId, projectId),
      eq(cards.isArchived, filters.isArchived ?? false),
    ];

    if (filters.columnId) {
      conditions.push(eq(cards.columnId, filters.columnId));
    }

    if (filters.assigneeId) {
      conditions.push(eq(cards.assigneeId, filters.assigneeId));
    }

    if (filters.priority) {
      conditions.push(eq(cards.priority, filters.priority));
    }

    if (filters.status) {
      conditions.push(eq(cards.status, filters.status));
    }

    if (filters.dueDateBefore) {
      conditions.push(sql`${cards.dueDate} <= ${filters.dueDateBefore}`);
    }

    if (filters.dueDateAfter) {
      conditions.push(sql`${cards.dueDate} >= ${filters.dueDateAfter}`);
    }

    if (filters.startDateBefore) {
      conditions.push(sql`${cards.startDate} <= ${filters.startDateBefore}`);
    }

    if (filters.startDateAfter) {
      conditions.push(sql`${cards.startDate} >= ${filters.startDateAfter}`);
    }

    if (filters.isOverdue) {
      conditions.push(sql`${cards.dueDate} < ${new Date()}`);
      conditions.push(isNotNull(cards.dueDate));
    }

    if (filters.hasDescription !== undefined) {
      if (filters.hasDescription) {
        conditions.push(isNotNull(cards.description));
        conditions.push(sql`${cards.description} != ''`);
      } else {
        conditions.push(
          or(isNull(cards.description), sql`${cards.description} = ''`)!
        );
      }
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(cards.title, `%${filters.search}%`),
          ilike(cards.description, `%${filters.search}%`)
        )!
      );
    }

    // Handle label filtering
    if (filters.labelIds && filters.labelIds.length > 0) {
      const cardsWithLabels = db
        .select({ cardId: cardLabels.cardId })
        .from(cardLabels)
        .where(inArray(cardLabels.labelId, filters.labelIds));

      conditions.push(inArray(cards.id, cardsWithLabels));
    }

    // Get total count first
    const [totalResult] = await db
      .select({ count: count() })
      .from(cards)
      .innerJoin(columns, eq(columns.id, cards.columnId))
      .where(and(...conditions));

    // Fix the orderBy clause to ensure the field exists and is properly typed
    const getSortColumn = (field: string) => {
      switch (field) {
        case "createdAt":
          return cards.createdAt;
        case "updatedAt":
          return cards.updatedAt;
        case "dueDate":
          return cards.dueDate;
        case "priority":
          return cards.priority;
        case "position":
          return cards.position;
        case "title":
          return cards.title;
        default:
          return cards.position; // fallback
      }
    };

    // Get cards with basic joins
    const cardsResult = await db
      .select({
        card: cards,
        column: columns,
        assignee: users,
      })
      .from(cards)
      .innerJoin(columns, eq(columns.id, cards.columnId))
      .leftJoin(users, eq(users.id, cards.assigneeId))
      .where(and(...conditions))
      .orderBy(
        sort.direction === "asc"
          ? asc(getSortColumn(sort.field))
          : desc(getSortColumn(sort.field))
      )
      .limit(limit)
      .offset(offset);

    // Get additional relations for each card
    const cardsWithRelations: CardWithServiceRelations[] = await Promise.all(
      cardsResult.map(async (row) => {
        // Get comments count
        const [commentsCount] = await db
          .select({ count: count() })
          .from(cardComments)
          .where(eq(cardComments.cardId, row.card.id));

        // Get labels
        const labels = await db.query.cardLabels.findMany({
          where: eq(cardLabels.cardId, row.card.id),
          with: {
            label: true,
          },
        });

        // Get attachments - Fixed the table reference
        const attachments = await db.query.cardAttachments.findMany({
          where: eq(cardAttachments.cardId, row.card.id),
          with: {
            uploader: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Get recent comments
        const comments = await db.query.cardComments.findMany({
          where: eq(cardComments.cardId, row.card.id),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: desc(cardComments.createdAt),
          limit: 5,
        });

        // Get project info
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, row.column.projectId),
        });

        return {
          ...row.card,
          column: {
            ...row.column,
            project: project!,
          },
          assignee: row.assignee
            ? {
                id: row.assignee.id,
                firstName: row.assignee.firstName,
                lastName: row.assignee.lastName,
                email: row.assignee.email,
                avatarUrl: row.assignee.avatarUrl,
              }
            : null,
          labels,
          comments,
          attachments: attachments || [],
          commentsCount: commentsCount?.count || 0,
        };
      })
    );

    const total = totalResult?.count || 0;
    const hasMore = offset + limit < total;

    return {
      cards: cardsWithRelations,
      total,
      hasMore,
    };
  }

  /**
   * Get cards by column (for kanban view)
   */
  static async getCardsByColumn(
    columnId: string,
    userId: string,
    includeArchived: boolean = false
  ): Promise<CardWithServiceRelations[]> {
    // Get column info to check project access
    const column = await db.query.columns.findFirst({
      where: eq(columns.id, columnId),
      with: {
        project: true,
      },
    });

    if (!column) {
      throw new Error("Column not found");
    }

    // Check permissions
    const canAccess = await this.canUserCreateCardsInProject(
      userId,
      column.project.id
    );

    if (!canAccess && column.project.ownerId !== userId) {
      throw new Error("Access denied to this column");
    }

    const conditions = [eq(cards.columnId, columnId)];

    if (!includeArchived) {
      conditions.push(eq(cards.isArchived, false));
    }

    const cardsResult = await db.query.cards.findMany({
      where: and(...conditions),
      orderBy: asc(cards.position),
      with: {
        assignee: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        labels: {
          with: {
            label: true,
          },
        },
        comments: {
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: desc(cardComments.createdAt),
          limit: 5,
        },
        attachments: {
          with: {
            uploader: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Add comments count and column info for each card
    const cardsWithCommentsCount: CardWithServiceRelations[] =
      await Promise.all(
        cardsResult.map(async (card) => {
          const [commentsCount] = await db
            .select({ count: count() })
            .from(cardComments)
            .where(eq(cardComments.cardId, card.id));

          return {
            ...card,
            column: {
              ...column,
              project: column.project,
            },
            commentsCount: commentsCount?.count || 0,
          };
        })
      );

    return cardsWithCommentsCount;
  }

  /**
   * Get cards assigned to a user
   */
  static async getCardsAssignedToUser(
    userId: string,
    projectId?: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<CardQueryResult> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(cards.assigneeId, userId),
      eq(cards.isArchived, false),
    ];

    if (projectId) {
      conditions.push(eq(columns.projectId, projectId));
    }

    const [cardsResult, totalResult] = await Promise.all([
      db
        .select({
          card: cards,
          column: columns,
          project: projects,
        })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .innerJoin(projects, eq(projects.id, columns.projectId))
        .where(and(...conditions))
        .orderBy(desc(cards.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...conditions)),
    ]);

    const cardsWithRelations: CardWithServiceRelations[] = await Promise.all(
      cardsResult.map(async (row) => {
        const [commentsCount] = await db
          .select({ count: count() })
          .from(cardComments)
          .where(eq(cardComments.cardId, row.card.id));

        const labels = await db.query.cardLabels.findMany({
          where: eq(cardLabels.cardId, row.card.id),
          with: {
            label: true,
          },
        });

        const comments = await db.query.cardComments.findMany({
          where: eq(cardComments.cardId, row.card.id),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: desc(cardComments.createdAt),
          limit: 5,
        });

        // Get assignee info (current user)
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        });

        return {
          ...row.card,
          column: {
            ...row.column,
            project: row.project,
          },
          assignee: assignee!,
          labels,
          comments,
          attachments: [],
          commentsCount: commentsCount?.count || 0,
        };
      })
    );

    const total = totalResult[0]?.count || 0;
    const hasMore = offset + limit < total;

    return {
      cards: cardsWithRelations,
      total,
      hasMore,
    };
  }

  /**
   * Get overdue cards
   */
  static async getOverdueCards(
    userId?: string,
    projectId?: string
  ): Promise<CardWithServiceRelations[]> {
    const now = new Date();
    const conditions = [
      sql`${cards.dueDate} < ${now}`,
      eq(cards.isArchived, false),
      isNotNull(cards.dueDate),
    ];

    if (userId) {
      conditions.push(eq(cards.assigneeId, userId));
    }

    if (projectId) {
      conditions.push(eq(columns.projectId, projectId));
    }

    const cardsResult = await db
      .select({
        card: cards,
        column: columns,
        project: projects,
        assignee: users,
      })
      .from(cards)
      .innerJoin(columns, eq(columns.id, cards.columnId))
      .innerJoin(projects, eq(projects.id, columns.projectId))
      .leftJoin(users, eq(users.id, cards.assigneeId))
      .where(and(...conditions))
      .orderBy(asc(cards.dueDate));

    const cardsWithRelations: CardWithServiceRelations[] = await Promise.all(
      cardsResult.map(async (row) => {
        const [commentsCount] = await db
          .select({ count: count() })
          .from(cardComments)
          .where(eq(cardComments.cardId, row.card.id));

        const labels = await db.query.cardLabels.findMany({
          where: eq(cardLabels.cardId, row.card.id), // Fixed: was cardComments.cardId
          with: {
            label: true,
          },
        });

        const comments = await db.query.cardComments.findMany({
          where: eq(cardComments.cardId, row.card.id),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: desc(cardComments.createdAt),
          limit: 5,
        });

        return {
          ...row.card,
          column: {
            ...row.column,
            project: row.project,
          },
          assignee: row.assignee
            ? {
                id: row.assignee.id,
                firstName: row.assignee.firstName,
                lastName: row.assignee.lastName,
                email: row.assignee.email,
                avatarUrl: row.assignee.avatarUrl,
              }
            : null,
          labels,
          comments,
          attachments: [],
          commentsCount: commentsCount?.count || 0,
        };
      })
    );

    return cardsWithRelations;
  }

  /**
   * Search cards by title and description
   */
  static async searchCards(
    query: string,
    userId: string,
    projectId?: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<CardQueryResult> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = (page - 1) * limit;

    const searchConditions = [
      or(
        ilike(cards.title, `%${query}%`),
        ilike(cards.description, `%${query}%`)
      )!,
      eq(cards.isArchived, false),
    ];

    if (projectId) {
      searchConditions.push(eq(columns.projectId, projectId));

      // Check permissions for specific project
      const canAccess = await this.canUserCreateCardsInProject(
        userId,
        projectId
      );
      if (!canAccess) {
        const project = await db.query.projects.findFirst({
          where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
        });
        if (!project) {
          throw new Error("Access denied to this project");
        }
      }
    } else {
      // If no specific project, only show cards from projects user has access to
      const userProjects = await db
        .select({ projectId: projectTeamMembers.projectId })
        .from(projectTeamMembers)
        .innerJoin(
          teamMembers,
          eq(teamMembers.id, projectTeamMembers.teamMemberId)
        )
        .where(eq(teamMembers.userId, userId))
        .groupBy(projectTeamMembers.projectId);

      const ownedProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.ownerId, userId));

      const accessibleProjectIds = [
        ...userProjects.map((p) => p.projectId),
        ...ownedProjects.map((p) => p.id),
      ];

      if (accessibleProjectIds.length > 0) {
        searchConditions.push(inArray(columns.projectId, accessibleProjectIds));
      } else {
        // User has no project access, return empty result
        return {
          cards: [],
          total: 0,
          hasMore: false,
        };
      }
    }

    const [cardsResult, totalResult] = await Promise.all([
      db
        .select({
          card: cards,
          column: columns,
          project: projects,
          assignee: users,
        })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .innerJoin(projects, eq(projects.id, columns.projectId))
        .leftJoin(users, eq(users.id, cards.assigneeId))
        .where(and(...searchConditions))
        .orderBy(desc(cards.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...searchConditions)),
    ]);

    const cardsWithRelations: CardWithServiceRelations[] = await Promise.all(
      cardsResult.map(async (row) => {
        const [commentsCount] = await db
          .select({ count: count() })
          .from(cardComments)
          .where(eq(cardComments.cardId, row.card.id));

        const labels = await db.query.cardLabels.findMany({
          where: eq(cardLabels.cardId, row.card.id),
          with: {
            label: true,
          },
        });

        const comments = await db.query.cardComments.findMany({
          where: eq(cardComments.cardId, row.card.id),
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: desc(cardComments.createdAt),
          limit: 5,
        });

        return {
          ...row.card,
          column: {
            ...row.column,
            project: row.project,
          },
          assignee: row.assignee
            ? {
                id: row.assignee.id,
                firstName: row.assignee.firstName,
                lastName: row.assignee.lastName,
                email: row.assignee.email,
                avatarUrl: row.assignee.avatarUrl,
              }
            : null,
          labels,
          comments,
          attachments: [],
          commentsCount: commentsCount?.count || 0,
        };
      })
    );

    const total = totalResult[0]?.count || 0;
    const hasMore = offset + limit < total;

    return {
      cards: cardsWithRelations,
      total,
      hasMore,
    };
  }

  /**
   * Get cards statistics for a project
   */
  static async getProjectCardsStats(projectId: string, userId: string) {
    // Check permissions
    const canAccess = await this.canUserCreateCardsInProject(userId, projectId);
    if (!canAccess) {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
      });
      if (!project) {
        throw new Error("Access denied to this project");
      }
    }

    const baseConditions = [
      eq(columns.projectId, projectId),
      eq(cards.isArchived, false),
    ];

    const [
      totalCards,
      completedCards,
      overdueCards,
      highPriorityCards,
      mediumPriorityCards,
      lowPriorityCards,
      unassignedCards,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...baseConditions)),

      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(
          and(
            ...baseConditions,
            or(
              ilike(columns.name, "%done%"),
              ilike(columns.name, "%complete%"),
              ilike(columns.name, "%finished%")
            )!
          )
        ),

      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(
          and(
            ...baseConditions,
            sql`${cards.dueDate} < ${new Date()}`,
            isNotNull(cards.dueDate)
          )
        ),

      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...baseConditions, eq(cards.priority, "high"))),

      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...baseConditions, eq(cards.priority, "medium"))),

      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...baseConditions, eq(cards.priority, "low"))),

      db
        .select({ count: count() })
        .from(cards)
        .innerJoin(columns, eq(columns.id, cards.columnId))
        .where(and(...baseConditions, isNull(cards.assigneeId))),
    ]);

    return {
      total: totalCards?.[0]?.count || 0,
      completed: completedCards?.[0]?.count || 0,
      overdue: overdueCards?.[0]?.count || 0,
      byPriority: {
        high: highPriorityCards?.[0]?.count || 0,
        medium: mediumPriorityCards?.[0]?.count || 0,
        low: lowPriorityCards?.[0]?.count || 0,
      },
      unassigned: unassignedCards?.[0]?.count || 0,
    };
  }
}
