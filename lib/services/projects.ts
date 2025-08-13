// lib/services/projects.ts
"use server";

import { db } from "@/lib/db/db";
import {
  projects,
  teams,
  users,
  teamMembers,
  columns,
  projectTeams,
} from "@/lib/db/schema";
import { eq, and, like, desc, asc, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { ActivityService } from "@/lib/services/activity";
import { NotificationService } from "@/lib/services/notification";

import type {
  CreateProject,
  UpdateProject,
  ProjectWithPartialRelations,
  ProjectsListOptions,
} from "@/types";

async function getTeamsForProjectIds(projectIds: string[]) {
  if (!projectIds.length)
    return new Map<
      string,
      Array<{
        id: string;
        name: string;
        slug: string;
        role: "admin" | "editor" | "viewer";
      }>
    >();

  const rows = await db
    .select({
      projectId: projectTeams.projectId,
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      role: projectTeams.role,
    })
    .from(projectTeams)
    .innerJoin(teams, eq(projectTeams.teamId, teams.id))
    .where(inArray(projectTeams.projectId, projectIds));

  const map = new Map<
    string,
    Array<{
      id: string;
      name: string;
      slug: string;
      role: "admin" | "editor" | "viewer";
    }>
  >();
  for (const r of rows) {
    if (!map.has(r.projectId)) map.set(r.projectId, []);
    map
      .get(r.projectId)!
      .push({ id: r.id, name: r.name, slug: r.slug, role: r.role });
  }
  return map;
}

// Helper function to generate unique slug (now globally unique since no teamId constraint)
export async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.slug, slug), eq(projects.isArchived, false)))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    // If it's the first duplicate, try with -2, otherwise increment
    if (counter === 1) {
      slug = `${baseSlug}-2`;
    } else {
      // For subsequent duplicates, use nanoid for uniqueness
      const uniqueId = nanoid(6).toLowerCase();
      slug = `${baseSlug}-${uniqueId}`;
    }
    counter++;

    // Safety check to prevent infinite loop
    if (counter > 100) {
      const uniqueId = nanoid(8).toLowerCase();
      slug = `${baseSlug}-${uniqueId}`;
      break;
    }
  }

  return slug;
}

// Helper function to verify user can create projects in any of their teams
export async function verifyUserCanCreateProject(
  userId: string
): Promise<boolean> {
  const memberships = await db
    .select({
      role: teamMembers.role,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  // Must be a member of at least one team with member+ permissions
  return memberships.some((membership) =>
    ["owner", "admin", "member"].includes(membership.role)
  );
}

// Helper function to get user's teams where they can create projects
export async function getUserTeamsForProjectCreation(
  userId: string
): Promise<string[]> {
  const memberships = await db
    .select({
      teamId: teamMembers.teamId,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  return memberships
    .filter((membership) =>
      ["owner", "admin", "member"].includes(membership.role)
    )
    .map((membership) => membership.teamId);
}

/**
 * Create a new project with team assignments
 */
export async function createProjectAction(
  data: CreateProject & {
    teamIds: string[]; // Array of team IDs to assign to the project
    teamRoles?: Record<string, "admin" | "editor" | "viewer">; // Optional roles per team
  }
) {
  try {
    const {
      name,
      slug: requestedSlug,
      description,
      ownerId,
      colorTheme,
      teamIds,
      teamRoles = {},
    } = data;

    // Validate required fields
    if (!name?.trim()) {
      return {
        success: false,
        error: "Project name is required",
        project: null,
      };
    }

    if (!ownerId || !teamIds?.length) {
      return {
        success: false,
        error: "Owner ID and at least one team are required",
        project: null,
      };
    }

    // Verify user can create projects
    const canCreate = await verifyUserCanCreateProject(ownerId);
    if (!canCreate) {
      return {
        success: false,
        error: "You don't have permission to create projects",
        project: null,
      };
    }

    // Verify user is a member of all specified teams
    const userTeams = await getUserTeamsForProjectCreation(ownerId);
    const invalidTeams = teamIds.filter(
      (teamId) => !userTeams.includes(teamId)
    );
    if (invalidTeams.length > 0) {
      return {
        success: false,
        error:
          "You don't have permission to add this project to some of the selected teams",
        project: null,
      };
    }

    // Generate unique slug (now globally unique)
    const baseSlug = requestedSlug
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    if (!baseSlug) {
      return {
        success: false,
        error: "Project slug cannot be empty",
        project: null,
      };
    }

    const uniqueSlug = await generateUniqueSlug(baseSlug);

    // Create the project
    const [newProject] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        slug: uniqueSlug,
        description: description?.trim() || null,
        ownerId,
        colorTheme: colorTheme || null,
        isArchived: false,
        schemaVersion: 1,
      })
      .returning();

    // Create project-team relationships
    const projectTeamInserts = teamIds.map((teamId) => ({
      projectId: newProject.id,
      teamId,
      role: (teamRoles[teamId] || "editor") as "admin" | "editor" | "viewer",
      addedBy: ownerId,
    }));

    await db.insert(projectTeams).values(projectTeamInserts);

    // Create default columns for the new project
    await createDefaultColumns(newProject.id);

    // =============================================================================
    // ACTIVITY & NOTIFICATION LOGGING
    // =============================================================================

    // Log project creation activity
    await ActivityService.logProjectCreated(
      ownerId,
      newProject.id,
      newProject.name
    );

    // Notify team members about the new project (for all teams)
    for (const teamId of teamIds) {
      await NotificationService.notifyProjectCreated(
        ownerId,
        newProject.id,
        newProject.name,
        teamId
      );
    }

    // Revalidate related pages
    teamIds.forEach((teamId) => {
      revalidatePath(`/team/${teamId}`);
    });
    revalidatePath(`/projects/${uniqueSlug}`);

    return {
      success: true,
      error: null,
      project: newProject,
    };
  } catch (error) {
    console.error("Error creating project:", error);
    return {
      success: false,
      error: "Failed to create project. Please try again.",
      project: null,
    };
  }
}

/**
 * Get a project by ID with relations (now includes multiple teams)
 */
export async function getProjectAction(
  projectId: string
): Promise<ProjectWithPartialRelations | null> {
  try {
    const result = await db
      .select({
        // Project fields
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Owner fields
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    // Get associated teams for this project
    const teamsResult = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        role: projectTeams.role,
      })
      .from(projectTeams)
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
      .where(eq(projectTeams.projectId, projectId));

    return {
      ...result[0],
      teams: teamsResult,
    };
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

/**
 * Get a project by slug (now searches globally since slugs are unique)
 */
export async function getProjectBySlugAction(
  slug: string
): Promise<ProjectWithPartialRelations | null> {
  try {
    const result = await db
      .select({
        // Project fields
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Owner fields
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.slug, slug))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    // Get associated teams for this project
    const teamsResult = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        role: projectTeams.role,
      })
      .from(projectTeams)
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
      .where(eq(projectTeams.projectId, result[0].id));

    return {
      ...result[0],
      teams: teamsResult,
    };
  } catch (error) {
    console.error("Error fetching project by slug:", error);
    return null;
  }
}

/**
 * Get all projects for a team
 */
export async function getTeamProjectsAction(
  teamId: string,
  options: ProjectsListOptions = {}
): Promise<ProjectWithPartialRelations[]> {
  try {
    const {
      ownerId,
      isArchived = false,
      search,
      orderBy = "updatedAt",
      orderDirection = "desc",
      limit = 50,
      offset = 0,
    } = options;

    // Base query with all necessary joins
    const baseQuery = db
      .select({
        // Project fields
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Owner
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
        // Team info from join
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
        teamRole: projectTeams.role,
      })
      .from(projects)
      .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
      .innerJoin(users, eq(projects.ownerId, users.id));

    // Build WHERE conditions
    const conditions = [eq(projectTeams.teamId, teamId)];
    if (typeof isArchived === "boolean") {
      conditions.push(eq(projects.isArchived, isArchived));
    }
    if (ownerId) {
      conditions.push(eq(projects.ownerId, ownerId));
    }
    if (search) {
      conditions.push(like(projects.name, `%${search}%`));
    }

    // Order expression
    const orderExpr =
      orderBy === "name"
        ? orderDirection === "desc"
          ? desc(projects.name)
          : asc(projects.name)
        : orderBy === "createdAt"
          ? orderDirection === "desc"
            ? desc(projects.createdAt)
            : asc(projects.createdAt)
          : orderDirection === "desc"
            ? desc(projects.updatedAt)
            : asc(projects.updatedAt);

    // Execute query in one chain to keep type safety
    const rows = await baseQuery
      .where(and(...conditions))
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);

    // Group into many-to-many structure
    const projectsMap = new Map<string, ProjectWithPartialRelations>();

    for (const row of rows) {
      if (!projectsMap.has(row.id)) {
        projectsMap.set(row.id, {
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          ownerId: row.ownerId,
          colorTheme: row.colorTheme,
          isArchived: row.isArchived,
          schemaVersion: row.schemaVersion,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          owner: row.owner,
          teams: [],
        });
      }
      projectsMap.get(row.id)!.teams.push({
        id: row.team.id,
        name: row.team.name,
        slug: row.team.slug,
        role: row.teamRole,
      });
    }

    return Array.from(projectsMap.values());
  } catch (error) {
    console.error("Error fetching team projects:", error);
    return [];
  }
}

/**
 * Get all projects for a user based on their team memberships
 */
export async function getProjectsForUser(
  userId: string,
  options: Omit<ProjectsListOptions, "teamId"> = {}
): Promise<ProjectWithPartialRelations[]> {
  try {
    if (!userId) return [];

    const {
      ownerId,
      isArchived = false,
      search,
      orderBy = "updatedAt",
      orderDirection = "desc",
      limit = 50,
      offset = 0,
    } = options;

    // Teams this user belongs to
    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    if (memberships.length === 0) return [];
    const teamIds = memberships.map((m) => m.teamId);

    const orderExpr =
      orderBy === "name"
        ? orderDirection === "desc"
          ? desc(projects.name)
          : asc(projects.name)
        : orderBy === "createdAt"
          ? orderDirection === "desc"
            ? desc(projects.createdAt)
            : asc(projects.createdAt)
          : orderDirection === "desc"
            ? desc(projects.updatedAt)
            : asc(projects.updatedAt);

    // Select unique projects reachable via those teams (filtering archived teams too)
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(projects)
      .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .innerJoin(teams, eq(projectTeams.teamId, teams.id)) // to filter archived teams
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(
        and(
          inArray(projectTeams.teamId, teamIds),
          eq(teams.isArchived, false),
          typeof isArchived === "boolean"
            ? eq(projects.isArchived, isArchived)
            : undefined,
          ownerId ? eq(projects.ownerId, ownerId) : undefined,
          search ? like(projects.name, `%${search}%`) : undefined
        )
      )
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);

    // Attach full teams[] (with roles) for each project
    const projectIds = rows.map((r) => r.id);
    const teamsMap = await getTeamsForProjectIds(projectIds);

    // De-dupe by id just in case (joins can fan out)
    const uniq = new Map<string, ProjectWithPartialRelations>();
    for (const r of rows) {
      if (!uniq.has(r.id)) {
        uniq.set(r.id, { ...r, teams: teamsMap.get(r.id) ?? [] });
      }
    }
    return Array.from(uniq.values());
  } catch (error) {
    console.error("Error fetching projects for user:", error);
    return [];
  }
}

/**
 * Update an existing project
 */
export async function updateProjectAction(
  data: UpdateProject & { userId: string }
) {
  try {
    const { id, userId, name, slug, description, colorTheme, isArchived } =
      data;

    if (!id) {
      return {
        success: false,
        error: "Project ID is required",
        project: null,
      };
    }

    // Get current project for comparison and permission check
    const currentProject = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        ownerId: projects.ownerId,
      })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (currentProject.length === 0) {
      return {
        success: false,
        error: "Project not found",
        project: null,
      };
    }

    const current = currentProject[0];

    // Check permissions - user must be project owner or have admin role in at least one team
    const isOwner = current.ownerId === userId;

    const hasAdminAccess = await db
      .select({ role: projectTeams.role })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .where(
        and(
          eq(projectTeams.projectId, id),
          or(
            eq(projectTeams.role, "admin"),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        )
      )
      .limit(1);

    if (!isOwner && hasAdminAccess.length === 0) {
      return {
        success: false,
        error: "You don't have permission to update this project",
        project: null,
      };
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Track changes for activity logging
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (name !== undefined && name.trim() !== current.name) {
      updateData.name = name.trim();
      changes.push({
        field: "name",
        oldValue: current.name,
        newValue: name.trim(),
      });
    }

    if (slug !== undefined) {
      // If slug is being changed, ensure uniqueness
      if (slug.trim()) {
        const baseSlug = slug
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .trim();

        // Only check for uniqueness if slug is actually changing
        if (baseSlug !== current.slug) {
          const uniqueSlug = await generateUniqueSlug(baseSlug);
          updateData.slug = uniqueSlug;
          changes.push({
            field: "slug",
            oldValue: current.slug,
            newValue: uniqueSlug,
          });
        }
      } else {
        return {
          success: false,
          error: "Project slug cannot be empty",
          project: null,
        };
      }
    }

    if (description !== undefined) {
      const newDesc = description?.trim() || null;
      if (newDesc !== current.description) {
        updateData.description = newDesc;
        changes.push({
          field: "description",
          oldValue: current.description,
          newValue: newDesc,
        });
      }
    }

    if (colorTheme !== undefined && colorTheme !== current.colorTheme) {
      updateData.colorTheme = colorTheme;
      changes.push({
        field: "colorTheme",
        oldValue: current.colorTheme,
        newValue: colorTheme,
      });
    }

    if (isArchived !== undefined && isArchived !== current.isArchived) {
      updateData.isArchived = isArchived;
      changes.push({
        field: "isArchived",
        oldValue: current.isArchived,
        newValue: isArchived,
      });
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    if (!updatedProject) {
      return {
        success: false,
        error: "Project not found",
        project: null,
      };
    }

    // =============================================================================
    // ACTIVITY & NOTIFICATION LOGGING
    // =============================================================================

    // Log project updates
    if (changes.length > 0) {
      await ActivityService.logProjectUpdated(userId, id, changes);

      // Get all teams associated with this project for notifications
      const projectTeamsList = await db
        .select({ teamId: projectTeams.teamId })
        .from(projectTeams)
        .where(eq(projectTeams.projectId, id));

      // Check if project was archived/unarchived for special notification
      const archiveChange = changes.find((c) => c.field === "isArchived");
      if (archiveChange) {
        if (archiveChange.newValue) {
          await ActivityService.logProjectArchived(
            userId,
            id,
            updatedProject.name
          );
          // Notify all teams
          for (const pt of projectTeamsList) {
            await NotificationService.notifyProjectArchived(
              userId,
              id,
              updatedProject.name,
              pt.teamId
            );
          }
        } else {
          // Project was unarchived - notify all teams
          for (const pt of projectTeamsList) {
            await NotificationService.notifyProjectUpdated(
              userId,
              id,
              updatedProject.name,
              pt.teamId,
              "Project was restored from archive"
            );
          }
        }
      } else {
        // Regular project update notification
        const changesSummary = changes
          .map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`)
          .join(", ");

        // Notify all teams
        for (const pt of projectTeamsList) {
          await NotificationService.notifyProjectUpdated(
            userId,
            id,
            updatedProject.name,
            pt.teamId,
            `Updated: ${changesSummary}`
          );
        }
      }
    }

    // Revalidate related pages
    revalidatePath(`/projects/${updatedProject.slug}`);

    // Get project teams for revalidation
    const projectTeamsList = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, id));

    projectTeamsList.forEach((pt) => {
      revalidatePath(`/team/${pt.teamId}`);
    });

    return {
      success: true,
      error: null,
      project: updatedProject,
    };
  } catch (error) {
    console.error("Error updating project:", error);
    return {
      success: false,
      error: "Failed to update project. Please try again.",
      project: null,
    };
  }
}

/**
 * Delete a project (soft delete by archiving)
 */
export async function deleteProjectAction(projectId: string, userId: string) {
  try {
    if (!projectId || !userId) {
      return {
        success: false,
        error: "Project ID and user ID are required",
      };
    }

    // Get project info
    const projectInfo = await db
      .select({
        id: projects.id,
        name: projects.name,
        ownerId: projects.ownerId,
        slug: projects.slug,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectInfo.length === 0) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    const project = projectInfo[0];

    // Check permissions - user must be project owner or have admin role in at least one team
    const isOwner = project.ownerId === userId;

    const hasAdminAccess = await db
      .select({ role: projectTeams.role })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          or(
            eq(projectTeams.role, "admin"),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        )
      )
      .limit(1);

    if (!isOwner && hasAdminAccess.length === 0) {
      return {
        success: false,
        error: "You don't have permission to delete this project",
      };
    }

    // Soft delete by archiving
    await db
      .update(projects)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // =============================================================================
    // ACTIVITY & NOTIFICATION LOGGING
    // =============================================================================

    // Log project archival activity
    await ActivityService.logProjectArchived(userId, projectId, project.name);

    // Get all teams associated with this project for notifications
    const projectTeamsList = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, projectId));

    // Notify all team members about project archival
    for (const pt of projectTeamsList) {
      await NotificationService.notifyProjectArchived(
        userId,
        projectId,
        project.name,
        pt.teamId
      );
    }

    // Revalidate related pages
    revalidatePath(`/projects/${project.slug}`);
    projectTeamsList.forEach((pt) => {
      revalidatePath(`/team/${pt.teamId}`);
    });

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Error deleting project:", error);
    return {
      success: false,
      error: "Failed to delete project. Please try again.",
    };
  }
}

/**
 * Permanently delete a project (with CASCADE cleanup)
 */
export async function hardDeleteProjectAction(
  projectId: string,
  userId: string
) {
  try {
    if (!projectId || !userId) {
      return {
        success: false,
        error: "Project ID and user ID are required",
      };
    }

    // Fetch project info
    const projectInfo = await db
      .select({
        id: projects.id,
        name: projects.name,
        ownerId: projects.ownerId,
        slug: projects.slug,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectInfo.length === 0) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    const project = projectInfo[0];

    // Check permissions - same as soft delete
    const isOwner = project.ownerId === userId;

    const hasAdminAccess = await db
      .select({ role: projectTeams.role })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          or(
            eq(projectTeams.role, "admin"),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        )
      )
      .limit(1);

    if (!isOwner && hasAdminAccess.length === 0) {
      return {
        success: false,
        error: "You don't have permission to delete this project",
      };
    }

    // =============================================================================
    // ACTIVITY & NOTIFICATION LOGGING (Before deletion)
    // =============================================================================

    // Get all teams associated with this project for notifications
    const projectTeamsList = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, projectId));

    // Log project deletion activity (before actual deletion)
    await ActivityService.logProjectDeleted(userId, projectId, project.name);

    // Notify all team members about permanent project deletion
    for (const pt of projectTeamsList) {
      await NotificationService.notifyProjectDeleted(
        userId,
        projectId,
        project.name,
        pt.teamId
      );
    }

    // Hard delete (CASCADE will handle child records including projectTeams)
    await db.delete(projects).where(eq(projects.id, projectId));

    // Revalidate relevant paths
    projectTeamsList.forEach((pt) => {
      revalidatePath(`/team/${pt.teamId}`);
    });

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Error hard-deleting project:", error);
    return {
      success: false,
      error: "Failed to permanently delete project. Please try again.",
    };
  }
}

/**
 * Create default columns for a new project
 */
async function createDefaultColumns(projectId: string) {
  const defaultColumns = [
    { name: "To Do", position: 0, color: "#6b7280" },
    { name: "In Progress", position: 1, color: "#f59e0b" },
    { name: "Review", position: 2, color: "#8b5cf6" },
    { name: "Done", position: 3, color: "#10b981" },
  ];

  await db.insert(columns).values(
    defaultColumns.map((col) => ({
      projectId,
      name: col.name,
      position: col.position,
      color: col.color,
    }))
  );
}

/**
 * Get a project by slug for a specific user (searches across all their teams)
 * This is more efficient than the loop approach in the component
 */
export async function getProjectBySlugForUser(
  slug: string,
  userId: string
): Promise<ProjectWithPartialRelations | null> {
  try {
    // teams the user is in
    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    if (memberships.length === 0) return null;
    const teamIds = memberships.map((m) => m.teamId);

    // Find the project the user can reach via their teams
    const projRow = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(projects)
      .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(
        and(
          eq(projects.slug, slug),
          inArray(projectTeams.teamId, teamIds),
          eq(projects.isArchived, false)
        )
      )
      .limit(1);

    const project = projRow[0];
    if (!project) return null;

    const teamsMap = await getTeamsForProjectIds([project.id]);

    return {
      ...project,
      teams: teamsMap.get(project.id) ?? [],
    };
  } catch (error) {
    console.error("Error fetching project by slug for user:", error);
    return null;
  }
}

/**
 * Add teams to an existing project
 */
export async function addTeamsToProjectAction(
  projectId: string,
  teamIds: string[],
  userId: string,
  teamRoles: Record<string, "admin" | "editor" | "viewer"> = {}
) {
  try {
    if (!projectId || !teamIds?.length || !userId) {
      return {
        success: false,
        error: "Project ID, team IDs, and user ID are required",
      };
    }

    // Check if user has permission to manage project teams
    const hasPermission = await db
      .select({ role: projectTeams.role })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          or(
            eq(projectTeams.role, "admin"),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        )
      )
      .limit(1);

    // Also check if user is project owner
    const projectOwner = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const isOwner = projectOwner[0]?.ownerId === userId;

    if (!isOwner && hasPermission.length === 0) {
      return {
        success: false,
        error: "You don't have permission to manage teams for this project",
      };
    }

    // Check which teams are already associated with the project
    const existingTeams = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, projectId));

    const existingTeamIds = existingTeams.map((t) => t.teamId);
    const newTeamIds = teamIds.filter((id) => !existingTeamIds.includes(id));

    if (newTeamIds.length === 0) {
      return {
        success: false,
        error: "All specified teams are already associated with this project",
      };
    }

    // Verify user is a member of the new teams
    const userTeams = await getUserTeamsForProjectCreation(userId);
    const invalidTeams = newTeamIds.filter(
      (teamId) => !userTeams.includes(teamId)
    );
    if (invalidTeams.length > 0) {
      return {
        success: false,
        error:
          "You don't have permission to add some of the selected teams to this project",
      };
    }

    // Add the new team relationships
    const projectTeamInserts = newTeamIds.map((teamId) => ({
      projectId,
      teamId,
      role: (teamRoles[teamId] || "editor") as "admin" | "editor" | "viewer",
      addedBy: userId,
    }));

    await db.insert(projectTeams).values(projectTeamInserts);

    // =============================================================================
    // ACTIVITY & NOTIFICATION LOGGING
    // =============================================================================

    // Get project name for logging
    const project = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project[0]) {
      // Notify new team members about being added to the project
      for (const teamId of newTeamIds) {
        await NotificationService.notifyProjectCreated(
          userId,
          projectId,
          project[0].name,
          teamId
        );
      }
    }

    // Revalidate related pages
    newTeamIds.forEach((teamId) => {
      revalidatePath(`/team/${teamId}`);
    });

    return {
      success: true,
      error: null,
      addedTeams: newTeamIds,
    };
  } catch (error) {
    console.error("Error adding teams to project:", error);
    return {
      success: false,
      error: "Failed to add teams to project. Please try again.",
    };
  }
}

/**
 * Remove teams from a project
 */
export async function removeTeamsFromProjectAction(
  projectId: string,
  teamIds: string[],
  userId: string
) {
  try {
    if (!projectId || !teamIds?.length || !userId) {
      return {
        success: false,
        error: "Project ID, team IDs, and user ID are required",
      };
    }

    // Check if user has permission to manage project teams (same logic as addTeamsToProjectAction)
    const hasPermission = await db
      .select({ role: projectTeams.role })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          or(
            eq(projectTeams.role, "admin"),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        )
      )
      .limit(1);

    // Also check if user is project owner
    const projectOwner = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const isOwner = projectOwner[0]?.ownerId === userId;

    if (!isOwner && hasPermission.length === 0) {
      return {
        success: false,
        error: "You don't have permission to manage teams for this project",
      };
    }

    // Check that we won't remove all teams (project must have at least one team)
    const currentTeams = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, projectId));

    const remainingTeams = currentTeams.filter(
      (t) => !teamIds.includes(t.teamId)
    );

    if (remainingTeams.length === 0) {
      return {
        success: false,
        error:
          "Cannot remove all teams from a project. A project must be associated with at least one team.",
      };
    }

    // Remove the team relationships
    await db
      .delete(projectTeams)
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          inArray(projectTeams.teamId, teamIds)
        )
      );

    // Revalidate related pages
    teamIds.forEach((teamId) => {
      revalidatePath(`/team/${teamId}`);
    });

    return {
      success: true,
      error: null,
      removedTeams: teamIds,
    };
  } catch (error) {
    console.error("Error removing teams from project:", error);
    return {
      success: false,
      error: "Failed to remove teams from project. Please try again.",
    };
  }
}

/**
 * Update team role for a project
 */
export async function updateProjectTeamRoleAction(
  projectId: string,
  teamId: string,
  newRole: "admin" | "editor" | "viewer",
  userId: string
) {
  try {
    if (!projectId || !teamId || !newRole || !userId) {
      return {
        success: false,
        error: "All parameters are required",
      };
    }

    // Check permissions (same logic as other team management functions)
    const hasPermission = await db
      .select({ role: projectTeams.role })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          or(
            eq(projectTeams.role, "admin"),
            inArray(teamMembers.role, ["owner", "admin"])
          )
        )
      )
      .limit(1);

    // Also check if user is project owner
    const projectOwner = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const isOwner = projectOwner[0]?.ownerId === userId;

    if (!isOwner && hasPermission.length === 0) {
      return {
        success: false,
        error:
          "You don't have permission to manage team roles for this project",
      };
    }

    // Update the team role
    const [updated] = await db
      .update(projectTeams)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectTeams.projectId, projectId),
          eq(projectTeams.teamId, teamId)
        )
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Team-project relationship not found",
      };
    }

    // =============================================================================
    // ACTIVITY & NOTIFICATION LOGGING
    // =============================================================================

    // Get project name for logging
    const project = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    // Revalidate related pages
    revalidatePath(`/team/${teamId}`);
    revalidatePath(`/projects/${projectId}`);

    return {
      success: true,
      error: null,
      updatedRole: newRole,
    };
  } catch (error) {
    console.error("Error updating project team role:", error);
    return {
      success: false,
      error: "Failed to update team role. Please try again.",
    };
  }
}
