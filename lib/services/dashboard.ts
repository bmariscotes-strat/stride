import { db } from "@/lib/db/db";
import {
  projects,
  cards,
  columns,
  users,
  teamMembers,
  teams,
  projectTeams,
  activityLog,
} from "@/lib/db/schema";
import { eq, and, desc, count, isNull, gte, lte, or } from "drizzle-orm";

export class DashboardService {
  // Helper method to get all project IDs a user has access to
  static async getUserAccessibleProjectIds(userId: string): Promise<string[]> {
    try {
      // Get projects where user is owner
      const ownedProjects = await db
        .select({ projectId: projects.id })
        .from(projects)
        .where(eq(projects.ownerId, userId));

      // Get projects where user is a team member
      const teamProjects = await db
        .select({ projectId: projectTeams.projectId })
        .from(teamMembers)
        .leftJoin(teams, eq(teamMembers.teamId, teams.id))
        .leftJoin(projectTeams, eq(teams.id, projectTeams.teamId))
        .where(
          and(eq(teamMembers.userId, userId), eq(teams.isArchived, false))
        );

      // Combine both arrays and remove duplicates and nulls with proper type guard
      const allProjectIds = [
        ...ownedProjects.map((p) => p.projectId),
        ...teamProjects.map((p) => p.projectId),
      ].filter((id): id is string => id !== null && id !== undefined);

      return [...new Set(allProjectIds)]; // Remove duplicates
    } catch (error) {
      console.error("Error fetching user accessible project IDs:", error);
      return [];
    }
  }

  // Main dashboard data aggregation
  static async getDashboardData(userId: string) {
    try {
      const [stats, recentProjects, recentActivity, upcomingDeadlines] =
        await Promise.all([
          this.getUserStats(userId),
          this.getUserRecentProjects(userId, 5),
          this.getUserRecentActivity(userId, 5),
          this.getUpcomingDeadlines(userId, 2),
        ]);

      return {
        stats,
        recentProjects,
        recentActivity,
        upcomingDeadlines,
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return {
        stats: {
          totalProjects: 0,
          activeCards: 0,
          completedTasks: 0,
          teamMembers: 0,
        },
        recentProjects: [],
        recentActivity: [],
        upcomingDeadlines: [],
      };
    }
  }

  // Get user statistics with period comparisons
  static async getUserStats(userId: string) {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all accessible project IDs
      const accessibleProjectIds =
        await this.getUserAccessibleProjectIds(userId);

      if (accessibleProjectIds.length === 0) {
        return {
          totalProjects: 0,
          activeCards: 0,
          completedTasks: 0,
          teamMembers: 0,
          changes: {
            projects: "No change",
            cards: "No change",
            tasks: "No change",
            teamMembers: "No change",
          },
        };
      }

      // Create proper OR conditions for accessible projects
      const projectAccessCondition =
        accessibleProjectIds.length === 1
          ? eq(projects.id, accessibleProjectIds[0])
          : or(...accessibleProjectIds.map((id) => eq(projects.id, id)));

      // Get current stats
      const [
        totalProjectsResult,
        activeCardsResult,
        completedTasksResult,
        userTeamsResult,
        // Get stats from one week ago for comparison
        projectsWeekAgoResult,
        cardsWeekAgoResult,
        tasksWeekAgoResult,
        teamsWeekAgoResult,
        // Get stats from one month ago for comparison
        projectsMonthAgoResult,
      ] = await Promise.all([
        // Current stats
        db
          .select({ count: count() })
          .from(projects)
          .where(and(projectAccessCondition, eq(projects.isArchived, false))),

        db
          .select({ count: count() })
          .from(cards)
          .leftJoin(columns, eq(cards.columnId, columns.id))
          .leftJoin(projects, eq(columns.projectId, projects.id))
          .where(and(projectAccessCondition, eq(cards.isArchived, false))),

        db
          .select({ count: count() })
          .from(cards)
          .leftJoin(columns, eq(cards.columnId, columns.id))
          .leftJoin(projects, eq(columns.projectId, projects.id))
          .where(and(projectAccessCondition, eq(cards.status, "completed"))),

        // Count teams the user is a member of (excluding archived teams)
        db
          .select({ count: count() })
          .from(teamMembers)
          .leftJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(
            and(eq(teamMembers.userId, userId), eq(teams.isArchived, false))
          ),

        // Week ago stats
        db
          .select({ count: count() })
          .from(projects)
          .where(
            and(
              projectAccessCondition,
              eq(projects.isArchived, false),
              lte(projects.createdAt, oneWeekAgo)
            )
          ),

        db
          .select({ count: count() })
          .from(cards)
          .leftJoin(columns, eq(cards.columnId, columns.id))
          .leftJoin(projects, eq(columns.projectId, projects.id))
          .where(
            and(
              projectAccessCondition,
              eq(cards.isArchived, false),
              lte(cards.createdAt, oneWeekAgo)
            )
          ),

        db
          .select({ count: count() })
          .from(cards)
          .leftJoin(columns, eq(cards.columnId, columns.id))
          .leftJoin(projects, eq(columns.projectId, projects.id))
          .where(
            and(
              projectAccessCondition,
              eq(cards.status, "completed"),
              lte(cards.updatedAt, oneWeekAgo)
            )
          ),

        // Teams the user was a member of one week ago
        db
          .select({ count: count() })
          .from(teamMembers)
          .leftJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(
            and(
              eq(teamMembers.userId, userId),
              eq(teams.isArchived, false),
              lte(teamMembers.joinedAt, oneWeekAgo)
            )
          ),

        // Month ago stats
        db
          .select({ count: count() })
          .from(projects)
          .where(
            and(
              projectAccessCondition,
              eq(projects.isArchived, false),
              lte(projects.createdAt, oneMonthAgo)
            )
          ),
      ]);

      // Calculate changes
      const currentStats = {
        totalProjects: totalProjectsResult[0]?.count || 0,
        activeCards: activeCardsResult[0]?.count || 0,
        completedTasks: completedTasksResult[0]?.count || 0,
        teamMembers: userTeamsResult[0]?.count || 0,
      };

      const weekAgoStats = {
        projects: projectsWeekAgoResult[0]?.count || 0,
        cards: cardsWeekAgoResult[0]?.count || 0,
        tasks: tasksWeekAgoResult[0]?.count || 0,
        teams: teamsWeekAgoResult[0]?.count || 0,
      };

      const monthAgoStats = {
        projects: projectsMonthAgoResult[0]?.count || 0,
      };

      // Calculate changes
      const projectChange = currentStats.totalProjects - monthAgoStats.projects;
      const cardChange = currentStats.activeCards - weekAgoStats.cards;
      const taskChange = currentStats.completedTasks - weekAgoStats.tasks;
      const teamChange = currentStats.teamMembers - weekAgoStats.teams;

      return {
        ...currentStats,
        changes: {
          projects:
            projectChange > 0
              ? `+${projectChange} this month`
              : projectChange < 0
                ? `${projectChange} this month`
                : "No change",
          cards:
            cardChange > 0
              ? `+${cardChange} this week`
              : cardChange < 0
                ? `${cardChange} this week`
                : "No change",
          tasks:
            taskChange > 0
              ? `+${taskChange} this week`
              : taskChange < 0
                ? `${taskChange} this week`
                : "No change",
          teamMembers:
            teamChange > 0
              ? `+${teamChange} this week`
              : teamChange < 0
                ? `${teamChange} this week`
                : "No change",
        },
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return {
        totalProjects: 0,
        activeCards: 0,
        completedTasks: 0,
        teamMembers: 0,
        changes: {
          projects: null,
          cards: null,
          tasks: null,
          teamMembers: null,
        },
      };
    }
  }

  // Get user's recent projects
  static async getUserRecentProjects(userId: string, limit: number = 5) {
    try {
      const accessibleProjectIds =
        await this.getUserAccessibleProjectIds(userId);

      if (accessibleProjectIds.length === 0) {
        return [];
      }

      // Create proper OR conditions for accessible projects
      const projectAccessCondition =
        accessibleProjectIds.length === 1
          ? eq(projects.id, accessibleProjectIds[0])
          : or(...accessibleProjectIds.map((id) => eq(projects.id, id)));

      return await db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          description: projects.description,
          colorTheme: projects.colorTheme,
          isArchived: projects.isArchived,
          updatedAt: projects.updatedAt,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(projectAccessCondition, eq(projects.isArchived, false)))
        .orderBy(desc(projects.updatedAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching recent projects:", error);
      return [];
    }
  }

  // Get user's recent activity
  static async getUserRecentActivity(userId: string, limit: number = 10) {
    try {
      return await db
        .select({
          id: activityLog.id,
          actionType: activityLog.actionType,
          oldValue: activityLog.oldValue,
          newValue: activityLog.newValue,
          createdAt: activityLog.createdAt,
          projectId: activityLog.projectId,
          cardId: activityLog.cardId,
          teamId: activityLog.teamId,
          // Add user data
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            avatarUrl: users.avatarUrl,
          },
          // Add card data if needed
          card: {
            id: cards.id,
            title: cards.title,
          },
          // Add team data if needed
          team: {
            id: teams.id,
            name: teams.name,
          },
        })
        .from(activityLog)
        .leftJoin(users, eq(activityLog.userId, users.id))
        .leftJoin(cards, eq(activityLog.cardId, cards.id))
        .leftJoin(teams, eq(activityLog.teamId, teams.id))
        .where(eq(activityLog.userId, userId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return [];
    }
  }

  // Get upcoming deadlines for user's cards
  static async getUpcomingDeadlines(userId: string, limit: number = 5) {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      const accessibleProjectIds =
        await this.getUserAccessibleProjectIds(userId);

      if (accessibleProjectIds.length === 0) {
        return [];
      }

      // Create proper OR conditions for accessible projects
      const projectAccessCondition =
        accessibleProjectIds.length === 1
          ? eq(projects.id, accessibleProjectIds[0])
          : or(...accessibleProjectIds.map((id) => eq(projects.id, id)));

      return await db
        .select({
          id: cards.id,
          title: cards.title,
          description: cards.description,
          dueDate: cards.dueDate,
          priority: cards.priority,
          status: cards.status,
          projectName: projects.name,
          projectSlug: projects.slug,
        })
        .from(cards)
        .leftJoin(columns, eq(cards.columnId, columns.id))
        .leftJoin(projects, eq(columns.projectId, projects.id))
        .where(
          and(
            projectAccessCondition,
            eq(cards.isArchived, false),
            gte(cards.dueDate, now),
            lte(cards.dueDate, thirtyDaysFromNow)
          )
        )
        .orderBy(cards.dueDate)
        .limit(limit);
    } catch (error) {
      console.error("Error fetching upcoming deadlines:", error);
      return [];
    }
  }

  // Get project-specific dashboard data (for project detail pages)
  static async getProjectDashboardData(projectId: string, userId: string) {
    try {
      const [projectInfo, stats, recentCards, recentActivity] =
        await Promise.all([
          this.getProjectInfo(projectId, userId),
          this.getProjectStats(projectId),
          this.getProjectRecentCards(projectId, 5),
          this.getProjectRecentActivity(projectId, 10),
        ]);

      return {
        project: projectInfo,
        stats,
        recentCards,
        recentActivity,
      };
    } catch (error) {
      console.error("Error fetching project dashboard data:", error);
      return null;
    }
  }

  // Get project information
  static async getProjectInfo(projectId: string, userId: string) {
    try {
      const accessibleProjectIds =
        await this.getUserAccessibleProjectIds(userId);

      if (!accessibleProjectIds.includes(projectId)) {
        return null;
      }

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));

      return project || null;
    } catch (error) {
      console.error("Error fetching project info:", error);
      return null;
    }
  }

  // Get project-specific statistics
  static async getProjectStats(projectId: string) {
    try {
      const [totalCards, completedCards, activeMembers] = await Promise.all([
        db
          .select({ count: count() })
          .from(cards)
          .leftJoin(columns, eq(cards.columnId, columns.id))
          .where(
            and(eq(columns.projectId, projectId), eq(cards.isArchived, false))
          ),

        db
          .select({ count: count() })
          .from(cards)
          .leftJoin(columns, eq(cards.columnId, columns.id))
          .where(
            and(eq(columns.projectId, projectId), eq(cards.status, "completed"))
          ),

        db
          .select({ count: count() })
          .from(projectTeams)
          .where(eq(projectTeams.projectId, projectId)),
      ]);

      return {
        totalCards: totalCards[0]?.count || 0,
        completedCards: completedCards[0]?.count || 0,
        activeMembers: activeMembers[0]?.count || 0,
        completionRate: totalCards[0]?.count
          ? Math.round(
              ((completedCards[0]?.count || 0) / totalCards[0].count) * 100
            )
          : 0,
      };
    } catch (error) {
      console.error("Error fetching project stats:", error);
      return {
        totalCards: 0,
        completedCards: 0,
        activeMembers: 0,
        completionRate: 0,
      };
    }
  }

  // Get recent cards for a project
  static async getProjectRecentCards(projectId: string, limit: number = 5) {
    try {
      return await db
        .select({
          id: cards.id,
          title: cards.title,
          description: cards.description,
          priority: cards.priority,
          status: cards.status,
          dueDate: cards.dueDate,
          updatedAt: cards.updatedAt,
          assigneeId: cards.assigneeId,
          columnName: columns.name,
        })
        .from(cards)
        .leftJoin(columns, eq(cards.columnId, columns.id))
        .where(
          and(eq(columns.projectId, projectId), eq(cards.isArchived, false))
        )
        .orderBy(desc(cards.updatedAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching project recent cards:", error);
      return [];
    }
  }

  // Get recent activity for a project
  static async getProjectRecentActivity(projectId: string, limit: number = 10) {
    try {
      return await db
        .select({
          id: activityLog.id,
          actionType: activityLog.actionType,
          oldValue: activityLog.oldValue,
          newValue: activityLog.newValue,
          createdAt: activityLog.createdAt,
          cardId: activityLog.cardId,
          userName: users.firstName,
          userLastName: users.lastName,
        })
        .from(activityLog)
        .leftJoin(users, eq(activityLog.userId, users.id))
        .where(eq(activityLog.projectId, projectId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching project recent activity:", error);
      return [];
    }
  }

  // Get overdue tasks for user
  static async getOverdueTasks(userId: string) {
    try {
      const now = new Date();
      const accessibleProjectIds =
        await this.getUserAccessibleProjectIds(userId);

      if (accessibleProjectIds.length === 0) {
        return [];
      }

      // Create proper OR conditions for accessible projects
      const projectAccessCondition =
        accessibleProjectIds.length === 1
          ? eq(projects.id, accessibleProjectIds[0])
          : or(...accessibleProjectIds.map((id) => eq(projects.id, id)));

      return await db
        .select({
          id: cards.id,
          title: cards.title,
          dueDate: cards.dueDate,
          priority: cards.priority,
          projectName: projects.name,
          projectSlug: projects.slug,
        })
        .from(cards)
        .leftJoin(columns, eq(cards.columnId, columns.id))
        .leftJoin(projects, eq(columns.projectId, projects.id))
        .where(
          and(
            projectAccessCondition,
            eq(cards.isArchived, false),
            lte(cards.dueDate, now)
          )
        )
        .orderBy(cards.dueDate);
    } catch (error) {
      console.error("Error fetching overdue tasks:", error);
      return [];
    }
  }
}
