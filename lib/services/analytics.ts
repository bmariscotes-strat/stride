// lib/services/analytics.ts

import { db } from "@/lib/db/db";
import {
  cards,
  columns,
  users,
  activityLog,
  teamMembers,
  projectTeamMembers,
} from "@/lib/db/schema";
import { eq, and, sql, desc, gte, isNotNull, count } from "drizzle-orm";

export interface ProjectAnalyticsData {
  overview: {
    totalCards: number;
    completedCards: number;
    averageCompletionTime: number;
    activeMembers: number;
    overdueTasks: number;
  };
  cardsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  cardsByPriority: Array<{
    priority: string;
    count: number;
    color: string;
  }>;
  cardsByAssignee: Array<{
    assigneeName: string;
    assigned: number;
    completed: number;
    overdue: number;
  }>;
  activityTrend: Array<{
    date: string;
    cardsCreated: number;
    cardsCompleted: number;
    cardsMoved: number;
  }>;
  completionTrend: Array<{
    week: string;
    completionRate: number;
    totalCards: number;
  }>;
  averageTimeInColumn: Array<{
    columnName: string;
    averageDays: number;
  }>;
  teamProductivity: Array<{
    memberName: string;
    tasksCompleted: number;
    averageTaskTime: number;
    productivity: number;
  }>;
}

export async function getProjectAnalytics(
  projectId: string,
  timeRange: "7d" | "30d" | "90d" | "1y" = "30d"
): Promise<ProjectAnalyticsData> {
  const now = new Date();
  const daysMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const daysBack = daysMap[timeRange];
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  try {
    // Get all project columns for status mapping
    const projectColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.projectId, projectId))
      .orderBy(columns.position);

    // Overview metrics
    const overviewData = await db
      .select({
        totalCards: count(),
        completedCards: sql<number>`SUM(CASE WHEN ${columns.name} ILIKE '%done%' OR ${columns.name} ILIKE '%complete%' THEN 1 ELSE 0 END)`,
        overdueTasks: sql<number>`SUM(CASE WHEN ${cards.dueDate} < NOW() AND ${columns.name} NOT ILIKE '%done%' AND ${columns.name} NOT ILIKE '%complete%' THEN 1 ELSE 0 END)`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(
        and(eq(columns.projectId, projectId), eq(cards.isArchived, false))
      );

    // Active members count
    const activeMembersData = await db
      .select({
        activeMembers: sql<number>`COUNT(DISTINCT ${cards.assigneeId})`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(
        and(
          eq(columns.projectId, projectId),
          gte(cards.updatedAt, startDate),
          isNotNull(cards.assigneeId),
          eq(cards.isArchived, false)
        )
      );

    // Average completion time (simplified calculation)
    const completionTimeData = await db
      .select({
        avgDays: sql<number>`AVG(EXTRACT(DAY FROM (${cards.updatedAt} - ${cards.createdAt})))`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(
        and(
          eq(columns.projectId, projectId),
          sql`${columns.name} ILIKE '%done%' OR ${columns.name} ILIKE '%complete%'`,
          gte(cards.updatedAt, startDate)
        )
      );

    // Cards by status (column)
    const cardsByStatusData = await db
      .select({
        status: columns.name,
        count: count(),
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(and(eq(columns.projectId, projectId), eq(cards.isArchived, false)))
      .groupBy(columns.name, columns.position)
      .orderBy(columns.position);

    const totalCardsForPercentage = overviewData[0]?.totalCards || 0;
    const cardsByStatus = cardsByStatusData.map((item) => ({
      status: item.status,
      count: item.count,
      percentage:
        totalCardsForPercentage > 0
          ? Math.round((item.count / totalCardsForPercentage) * 100)
          : 0,
    }));

    // Cards by priority
    const cardsByPriorityData = await db
      .select({
        priority: cards.priority,
        count: count(),
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(
        and(
          eq(columns.projectId, projectId),
          eq(cards.isArchived, false),
          isNotNull(cards.priority)
        )
      )
      .groupBy(cards.priority);

    const priorityColors = {
      high: "#EF4444",
      medium: "#F59E0B",
      low: "#10B981",
    };

    const cardsByPriority = cardsByPriorityData.map((item) => ({
      priority: item.priority || "none",
      count: item.count,
      color:
        priorityColors[item.priority as keyof typeof priorityColors] ||
        "#6B7280",
    }));

    // Cards by assignee
    const cardsByAssigneeData = await db
      .select({
        assigneeName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unassigned')`,
        assigned: count(),
        completed: sql<number>`SUM(CASE WHEN ${columns.name} ILIKE '%done%' OR ${columns.name} ILIKE '%complete%' THEN 1 ELSE 0 END)`,
        overdue: sql<number>`SUM(CASE WHEN ${cards.dueDate} < NOW() AND ${columns.name} NOT ILIKE '%done%' AND ${columns.name} NOT ILIKE '%complete%' THEN 1 ELSE 0 END)`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .leftJoin(users, eq(cards.assigneeId, users.id))
      .where(and(eq(columns.projectId, projectId), eq(cards.isArchived, false)))
      .groupBy(users.id, users.firstName, users.lastName)
      .orderBy(desc(count()));

    // Activity trend (last 30 days)
    const activityTrendData = await db
      .select({
        date: sql<string>`DATE(${activityLog.createdAt})`,
        cardsCreated: sql<number>`SUM(CASE WHEN ${activityLog.actionType} = 'card_created' THEN 1 ELSE 0 END)`,
        cardsCompleted: sql<number>`SUM(CASE WHEN ${activityLog.actionType} = 'card_moved' AND ${activityLog.newValue} ILIKE '%done%' THEN 1 ELSE 0 END)`,
        cardsMoved: sql<number>`SUM(CASE WHEN ${activityLog.actionType} = 'card_moved' THEN 1 ELSE 0 END)`,
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.projectId, projectId),
          gte(activityLog.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${activityLog.createdAt})`)
      .orderBy(sql`DATE(${activityLog.createdAt})`);

    // Completion trend (weekly)
    const completionTrendData = await db
      .select({
        week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${cards.updatedAt}), 'YYYY-"W"WW')`,
        totalCards: count(),
        completedCards: sql<number>`SUM(CASE WHEN ${columns.name} ILIKE '%done%' OR ${columns.name} ILIKE '%complete%' THEN 1 ELSE 0 END)`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(
        and(
          eq(columns.projectId, projectId),
          gte(cards.updatedAt, startDate),
          eq(cards.isArchived, false)
        )
      )
      .groupBy(sql`DATE_TRUNC('week', ${cards.updatedAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${cards.updatedAt})`);

    const completionTrend = completionTrendData.map((item) => ({
      week: item.week,
      completionRate:
        item.totalCards > 0
          ? Math.round((item.completedCards / item.totalCards) * 100)
          : 0,
      totalCards: item.totalCards,
    }));

    // Average time in columns (simplified - using creation to update time)
    const averageTimeInColumnData = await db
      .select({
        columnName: columns.name,
        averageDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${cards.updatedAt} - ${cards.createdAt})) / 86400)`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .where(
        and(
          eq(columns.projectId, projectId),
          gte(cards.updatedAt, startDate),
          eq(cards.isArchived, false)
        )
      )
      .groupBy(columns.name, columns.position)
      .orderBy(columns.position);

    const averageTimeInColumn = averageTimeInColumnData.map((item) => ({
      columnName: item.columnName,
      averageDays: Math.round(item.averageDays || 0), // Keep the calculation but rename the property
    }));

    // Team productivity (individual performance metrics)
    const teamProductivityData = await db
      .select({
        memberName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        tasksCompleted: sql<number>`COUNT(CASE WHEN ${columns.name} ILIKE '%done%' OR ${columns.name} ILIKE '%complete%' THEN 1 END)`,
        totalTasks: count(),
        averageTaskTime: sql<number>`AVG(EXTRACT(DAY FROM (${cards.updatedAt} - ${cards.createdAt})))`,
      })
      .from(cards)
      .innerJoin(columns, eq(cards.columnId, columns.id))
      .innerJoin(users, eq(cards.assigneeId, users.id))
      .where(
        and(
          eq(columns.projectId, projectId),
          gte(cards.updatedAt, startDate),
          eq(cards.isArchived, false),
          isNotNull(cards.assigneeId)
        )
      )
      .groupBy(users.id, users.firstName, users.lastName)
      .orderBy(
        desc(
          sql`COUNT(CASE WHEN ${columns.name} ILIKE '%done%' OR ${columns.name} ILIKE '%complete%' THEN 1 END)`
        )
      );

    const teamProductivity = teamProductivityData.map((item) => {
      const completionRate =
        item.totalTasks > 0 ? (item.tasksCompleted / item.totalTasks) * 100 : 0;
      const timeEfficiency = item.averageTaskTime
        ? Math.max(0, 100 - item.averageTaskTime * 5)
        : 50;
      const productivity = Math.round(
        completionRate * 0.7 + timeEfficiency * 0.3
      );

      return {
        memberName: item.memberName,
        tasksCompleted: item.tasksCompleted,
        averageTaskTime: item.averageTaskTime || 0,
        productivity: Math.min(100, Math.max(0, productivity)),
      };
    });

    const cardsByAssignee = cardsByAssigneeData.map((item) => ({
      assigneeName: item.assigneeName,
      assigned: item.assigned,
      completed: item.completed,
      overdue: item.overdue,
    }));

    // Format activity trend data with proper date formatting
    const activityTrend = activityTrendData.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      cardsCreated: item.cardsCreated,
      cardsCompleted: item.cardsCompleted,
      cardsMoved: item.cardsMoved,
    }));

    return {
      overview: {
        totalCards: overviewData[0]?.totalCards || 0,
        completedCards: overviewData[0]?.completedCards || 0,
        averageCompletionTime: Math.round(completionTimeData[0]?.avgDays || 0),
        activeMembers: activeMembersData[0]?.activeMembers || 0,
        overdueTasks: overviewData[0]?.overdueTasks || 0,
      },
      cardsByStatus,
      cardsByPriority,
      cardsByAssignee,
      activityTrend,
      completionTrend,
      averageTimeInColumn,
      teamProductivity,
    };
  } catch (error) {
    console.error("Error fetching project analytics:", error);

    // Return empty data structure on error
    return {
      overview: {
        totalCards: 0,
        completedCards: 0,
        averageCompletionTime: 0,
        activeMembers: 0,
        overdueTasks: 0,
      },
      cardsByStatus: [],
      cardsByPriority: [],
      cardsByAssignee: [],
      activityTrend: [],
      completionTrend: [],
      averageTimeInColumn: [],
      teamProductivity: [],
    };
  }
}

// Helper function to get project analytics with caching (optional)
export async function getProjectAnalyticsWithCache(
  projectId: string,
  timeRange: "7d" | "30d" | "90d" | "1y" = "30d"
): Promise<ProjectAnalyticsData> {
  // You can implement caching here if needed (Redis, etc.)
  return await getProjectAnalytics(projectId, timeRange);
}

// Helper function to get analytics summary for dashboard
export async function getProjectAnalyticsSummary(projectId: string) {
  try {
    const analytics = await getProjectAnalytics(projectId, "30d");

    return {
      projectId,
      totalCards: analytics.overview.totalCards,
      completedCards: analytics.overview.completedCards,
      completionRate:
        analytics.overview.totalCards > 0
          ? Math.round(
              (analytics.overview.completedCards /
                analytics.overview.totalCards) *
                100
            )
          : 0,
      activeMembers: analytics.overview.activeMembers,
      overdueTasks: analytics.overview.overdueTasks,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error fetching project analytics summary:", error);
    return null;
  }
}
