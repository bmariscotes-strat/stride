"use server";

import { db } from "@/lib/db/db";
import {
  users,
  teams,
  projects,
  columns,
  cards,
  labels,
  teamMembers,
  cardLabels,
  cardComments,
  cardAttachments,
  activityLog,
  notifications,
  mentions,
} from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// =============================================================================
// USERS CRUD
// =============================================================================

// Create user
export async function createUser(userData: {
  clerkUserId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  personalTeamId?: string;
}) {
  const [user] = await db.insert(users).values(userData).returning();
  return user;
}

// Get user by ID
export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

// Get user by Clerk ID
export async function getUserByClerkId(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  return user;
}

// Update user
export async function updateUser(
  id: string,
  userData: Partial<typeof users.$inferInsert>
) {
  const [user] = await db
    .update(users)
    .set({ ...userData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

// Delete user
export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

// Get all users
export async function getAllUsers() {
  return await db.select().from(users).orderBy(asc(users.createdAt));
}

// =============================================================================
// TEAMS CRUD
// =============================================================================

// Create team
export async function createTeam(teamData: {
  name: string;
  slug: string;
  description?: string;
  isPersonal?: boolean;
  createdBy: string;
}) {
  const [team] = await db.insert(teams).values(teamData).returning();
  return team;
}

// Get team by ID
export async function getTeamById(id: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  return team;
}

// Get team by slug
export async function getTeamBySlug(slug: string) {
  const [team] = await db.select().from(teams).where(eq(teams.slug, slug));
  return team;
}

// Update team
export async function updateTeam(
  id: string,
  teamData: Partial<typeof teams.$inferInsert>
) {
  const [team] = await db
    .update(teams)
    .set({ ...teamData, updatedAt: new Date() })
    .where(eq(teams.id, id))
    .returning();
  return team;
}

// Delete team
export async function deleteTeam(id: string) {
  await db.delete(teams).where(eq(teams.id, id));
}

// Get teams by user ID
export async function getTeamsByUserId(userId: string) {
  return await db
    .select({
      team: teams,
      membership: teamMembers,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId))
    .orderBy(asc(teams.name));
}

// =============================================================================
// PROJECTS CRUD
// =============================================================================

// Create project
export async function createProject(projectData: {
  name: string;
  slug: string;
  description?: string;
  teamId: string;
  ownerId: string;
  colorTheme?: string;
}) {
  const [project] = await db.insert(projects).values(projectData).returning();
  return project;
}

// Get project by ID
export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

// Get projects by team ID
export async function getProjectsByTeamId(teamId: string) {
  return await db
    .select()
    .from(projects)
    .where(and(eq(projects.teamId, teamId), eq(projects.isArchived, false)))
    .orderBy(asc(projects.name));
}

// Update project
export async function updateProject(
  id: string,
  projectData: Partial<typeof projects.$inferInsert>
) {
  const [project] = await db
    .update(projects)
    .set({ ...projectData, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
}

// Archive project
export async function archiveProject(id: string) {
  const [project] = await db
    .update(projects)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
}

// Delete project
export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

// =============================================================================
// COLUMNS CRUD
// =============================================================================

// Create column
export async function createColumn(columnData: {
  projectId: string;
  name: string;
  position: number;
  color?: string;
}) {
  const [column] = await db.insert(columns).values(columnData).returning();
  return column;
}

// Get columns by project ID
export async function getColumnsByProjectId(projectId: string) {
  return await db
    .select()
    .from(columns)
    .where(eq(columns.projectId, projectId))
    .orderBy(asc(columns.position));
}

// Update column
export async function updateColumn(
  id: string,
  columnData: Partial<typeof columns.$inferInsert>
) {
  const [column] = await db
    .update(columns)
    .set({ ...columnData, updatedAt: new Date() })
    .where(eq(columns.id, id))
    .returning();
  return column;
}

// Delete column
export async function deleteColumn(id: string) {
  await db.delete(columns).where(eq(columns.id, id));
}

// Reorder columns
export async function reorderColumns(
  projectId: string,
  columnUpdates: Array<{ id: string; position: number }>
) {
  const promises = columnUpdates.map(({ id, position }) =>
    db
      .update(columns)
      .set({ position, updatedAt: new Date() })
      .where(eq(columns.id, id))
  );
  await Promise.all(promises);
}

// =============================================================================
// CARDS CRUD
// =============================================================================

// Create card
export async function createCard(cardData: {
  columnId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: "high" | "medium" | "low";
  startDate?: Date;
  dueDate?: Date;
  position: number;
  status?: string;
}) {
  const [card] = await db.insert(cards).values(cardData).returning();
  return card;
}

// Get card by ID
export async function getCardById(id: string) {
  const [card] = await db.select().from(cards).where(eq(cards.id, id));
  return card;
}

// Get cards by column ID
export async function getCardsByColumnId(columnId: string) {
  return await db
    .select()
    .from(cards)
    .where(and(eq(cards.columnId, columnId), eq(cards.isArchived, false)))
    .orderBy(asc(cards.position));
}

// Update card
export async function updateCard(
  id: string,
  cardData: Partial<typeof cards.$inferInsert>
) {
  const [card] = await db
    .update(cards)
    .set({ ...cardData, updatedAt: new Date() })
    .where(eq(cards.id, id))
    .returning();
  return card;
}

// Move card to different column
export async function moveCardToColumn(
  id: string,
  columnId: string,
  position: number
) {
  const [card] = await db
    .update(cards)
    .set({ columnId, position, updatedAt: new Date() })
    .where(eq(cards.id, id))
    .returning();
  return card;
}

// Archive card
export async function archiveCard(id: string) {
  const [card] = await db
    .update(cards)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(cards.id, id))
    .returning();
  return card;
}

// Delete card
export async function deleteCard(id: string) {
  await db.delete(cards).where(eq(cards.id, id));
}

// =============================================================================
// LABELS CRUD
// =============================================================================

// Create label
export async function createLabel(labelData: {
  name: string;
  color: string;
  teamId: string;
}) {
  const [label] = await db.insert(labels).values(labelData).returning();
  return label;
}

// Get labels by team ID
export async function getLabelsByTeamId(teamId: string) {
  return await db
    .select()
    .from(labels)
    .where(eq(labels.teamId, teamId))
    .orderBy(asc(labels.name));
}

// Update label
export async function updateLabel(
  id: string,
  labelData: Partial<typeof labels.$inferInsert>
) {
  const [label] = await db
    .update(labels)
    .set(labelData)
    .where(eq(labels.id, id))
    .returning();
  return label;
}

// Delete label
export async function deleteLabel(id: string) {
  await db.delete(labels).where(eq(labels.id, id));
}

// =============================================================================
// TEAM MEMBERS CRUD
// =============================================================================

// Add member to team
export async function addTeamMember(memberData: {
  teamId: string;
  userId: string;
  role?: "owner" | "admin" | "member" | "viewer";
}) {
  const [member] = await db.insert(teamMembers).values(memberData).returning();
  return member;
}

// Get team members
export async function getTeamMembersByTeamId(teamId: string) {
  return await db
    .select({
      membership: teamMembers,
      user: users,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(users.firstName));
}

// Update member role
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: "owner" | "admin" | "member" | "viewer"
) {
  const [member] = await db
    .update(teamMembers)
    .set({ role })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();
  return member;
}

// Remove member from team
export async function removeTeamMember(teamId: string, userId: string) {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

// =============================================================================
// CARD LABELS CRUD
// =============================================================================

// Add label to card
export async function addCardLabel(cardId: string, labelId: string) {
  const [cardLabel] = await db
    .insert(cardLabels)
    .values({ cardId, labelId })
    .returning();
  return cardLabel;
}

// Get labels for card
export async function getCardLabelsByCardId(cardId: string) {
  return await db
    .select({
      cardLabel: cardLabels,
      label: labels,
    })
    .from(cardLabels)
    .innerJoin(labels, eq(cardLabels.labelId, labels.id))
    .where(eq(cardLabels.cardId, cardId));
}

// Remove label from card
export async function removeCardLabel(cardId: string, labelId: string) {
  await db
    .delete(cardLabels)
    .where(and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)));
}

// =============================================================================
// CARD COMMENTS CRUD
// =============================================================================

// Create comment
export async function createCardComment(commentData: {
  cardId: string;
  userId: string;
  content: string;
}) {
  const [comment] = await db
    .insert(cardComments)
    .values(commentData)
    .returning();
  return comment;
}

// Get comments by card ID
export async function getCardCommentsByCardId(cardId: string) {
  return await db
    .select({
      comment: cardComments,
      user: users,
    })
    .from(cardComments)
    .innerJoin(users, eq(cardComments.userId, users.id))
    .where(eq(cardComments.cardId, cardId))
    .orderBy(desc(cardComments.createdAt));
}

// Update comment
export async function updateCardComment(id: number, content: string) {
  const [comment] = await db
    .update(cardComments)
    .set({ content, updatedAt: new Date() })
    .where(eq(cardComments.id, id))
    .returning();
  return comment;
}

// Delete comment
export async function deleteCardComment(id: number) {
  await db.delete(cardComments).where(eq(cardComments.id, id));
}

// =============================================================================
// NOTIFICATIONS CRUD
// =============================================================================

// Create notification
export async function createNotification(notificationData: {
  userId: string;
  type:
    | "task_assigned"
    | "task_updated"
    | "comment_added"
    | "mention"
    | "due_date_reminder"
    | "team_invitation";
  title: string;
  message?: string;
  cardId?: string;
  projectId?: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values(notificationData)
    .returning();
  return notification;
}

// Get notifications for user
export async function getNotificationsByUserId(userId: string, limit = 50) {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

// Mark notification as read
export async function markNotificationAsRead(id: number) {
  const [notification] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id))
    .returning();
  return notification;
}

// Mark all notifications as read for user
export async function markAllNotificationsAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}

// Delete notification
export async function deleteNotification(id: number) {
  await db.delete(notifications).where(eq(notifications.id, id));
}

// =============================================================================
// ACTIVITY LOG CRUD
// =============================================================================

// Log activity
export async function createActivityLog(activityData: {
  projectId?: string;
  cardId?: string;
  userId: string;
  actionType: string;
  oldValue?: string;
  newValue?: string;
}) {
  const [activity] = await db
    .insert(activityLog)
    .values(activityData)
    .returning();
  return activity;
}

// Get activity by project
export async function getActivityLogByProjectId(
  projectId: string,
  limit = 100
) {
  return await db
    .select({
      activity: activityLog,
      user: users,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(eq(activityLog.projectId, projectId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// Get activity by card
export async function getActivityLogByCardId(cardId: string, limit = 50) {
  return await db
    .select({
      activity: activityLog,
      user: users,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(eq(activityLog.cardId, cardId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Get full project with all related data
export async function getProjectWithData(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const projectColumns = await getColumnsByProjectId(projectId);
  const columnsWithCards = await Promise.all(
    projectColumns.map(async (column) => {
      const columnCards = await getCardsByColumnId(column.id);
      return { ...column, cards: columnCards };
    })
  );

  return { ...project, columns: columnsWithCards };
}

// Get user's teams with projects
export async function getUserTeamsWithProjects(userId: string) {
  const userTeams = await getTeamsByUserId(userId);
  const teamsWithProjects = await Promise.all(
    userTeams.map(async ({ team }) => {
      const teamProjects = await getProjectsByTeamId(team.id);
      return { ...team, projects: teamProjects };
    })
  );
  return teamsWithProjects;
}

export async function createTeamAction(formData: {
  name: string;
  slug: string;
  description: string;
  members: string[];
  createdBy: string;
}) {
  try {
    // Basic validation
    if (!formData.name.trim()) {
      throw new Error("Team name is required");
    }
    if (!formData.slug.trim()) {
      throw new Error("Team slug is required");
    }
    if (formData.slug.length < 3) {
      throw new Error("Team slug must be at least 3 characters");
    }

    // Prepare team data for API
    const teamData = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      isPersonal: false,
      createdBy: formData.createdBy,
    };

    // Create the team
    const createdTeam = await createTeam(teamData);

    if (createdTeam) {
      // Add the creator as the owner of the team
      await addTeamMember({
        teamId: createdTeam.id,
        userId: formData.createdBy,
        role: "owner",
      });

      // TODO: Handle member invitations
      // For now, we're just logging the members to invite
      if (formData.members.length > 0) {
        console.log("Members to invite:", formData.members);
        // You'll need to implement invitation logic here
      }

      // Revalidate the teams page to show the new team
      revalidatePath("/teams");

      return { success: true, team: createdTeam };
    } else {
      throw new Error("Failed to create team");
    }
  } catch (error) {
    console.error("Error creating team:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function checkTeamSlugAvailability(slug: string) {
  try {
    const existingTeam = await getTeamBySlug(slug);
    return { available: !existingTeam };
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return { available: false, error: "Failed to check slug availability" };
  }
}
