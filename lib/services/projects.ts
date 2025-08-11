"use server";

import { db } from "@/lib/db/db";
import { projects, teams, users, teamMembers, columns } from "@/lib/db/schema";
import { eq, and, like, desc, asc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

import type {
  CreateProject,
  UpdateProject,
  ProjectWithPartialRelations,
  ProjectsListOptions,
} from "@/types";

// Helper function to generate unique slug
export async function generateUniqueSlug(
  baseSlug: string,
  teamId: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.teamId, teamId),
          eq(projects.isArchived, false)
        )
      )
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

// Helper function to verify team membership and permissions
export async function verifyTeamAccess(
  teamId: string,
  userId: string
): Promise<boolean> {
  const membership = await db
    .select({
      role: teamMembers.role,
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  // Must be a team member with at least member role to create projects
  return (
    membership.length > 0 &&
    ["owner", "admin", "member"].includes(membership[0].role)
  );
}

/**
 * Create a new project
 */
export async function createProjectAction(data: CreateProject) {
  try {
    const {
      name,
      slug: requestedSlug,
      description,
      teamId,
      ownerId,
      colorTheme,
    } = data;

    // Validate required fields
    if (!name?.trim()) {
      return {
        success: false,
        error: "Project name is required",
        project: null,
      };
    }

    if (!teamId || !ownerId) {
      return {
        success: false,
        error: "Team ID and owner ID are required",
        project: null,
      };
    }

    // Verify team exists and user has permission
    const hasAccess = await verifyTeamAccess(teamId, ownerId);
    if (!hasAccess) {
      return {
        success: false,
        error: "You don't have permission to create projects in this team",
        project: null,
      };
    }

    // Generate unique slug
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

    const uniqueSlug = await generateUniqueSlug(baseSlug, teamId);

    // Create the project
    const [newProject] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        slug: uniqueSlug,
        description: description?.trim() || null,
        teamId,
        ownerId,
        colorTheme: colorTheme || null,
        isArchived: false,
        schemaVersion: 1,
      })
      .returning();

    // Create default columns for the new project
    await createDefaultColumns(newProject.id);

    // Revalidate related pages
    revalidatePath(`/team/${teamId}`);
    revalidatePath(`/project/${uniqueSlug}`);

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
 * Get a project by ID with relations
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
        teamId: projects.teamId,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Team fields
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
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
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

/**
 * Get a project by slug and team
 */
export async function getProjectBySlugAction(
  teamId: string,
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
        teamId: projects.teamId,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Team fields
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
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
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(and(eq(projects.teamId, teamId), eq(projects.slug, slug)))
      .limit(1);

    return result[0] || null;
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

    // Start with the base query
    const baseQuery = db
      .select({
        // Project fields
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        teamId: projects.teamId,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Team fields
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
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
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(users, eq(projects.ownerId, users.id));

    // Build where conditions
    const conditions = [eq(projects.teamId, teamId)];

    if (typeof isArchived === "boolean") {
      conditions.push(eq(projects.isArchived, isArchived));
    }

    if (ownerId) {
      conditions.push(eq(projects.ownerId, ownerId));
    }

    if (search) {
      conditions.push(like(projects.name, `%${search}%`));
    }

    // Apply where conditions
    const queryWithWhere = baseQuery.where(and(...conditions));

    // Apply ordering
    let queryWithOrder;
    if (orderBy === "name") {
      queryWithOrder = queryWithWhere.orderBy(
        orderDirection === "desc" ? desc(projects.name) : asc(projects.name)
      );
    } else if (orderBy === "createdAt") {
      queryWithOrder = queryWithWhere.orderBy(
        orderDirection === "desc"
          ? desc(projects.createdAt)
          : asc(projects.createdAt)
      );
    } else {
      queryWithOrder = queryWithWhere.orderBy(
        orderDirection === "desc"
          ? desc(projects.updatedAt)
          : asc(projects.updatedAt)
      );
    }

    // Apply pagination and execute
    const result = await queryWithOrder.limit(limit).offset(offset);

    return result;
  } catch (error) {
    console.error("Error fetching team projects:", error);
    return [];
  }
}

/**
 * Get all projects for a user based on their team memberships
 * This fetches projects from all teams the user is a member of
 */
export async function getProjectsForUser(
  userId: string,
  options: Omit<ProjectsListOptions, "teamId"> = {}
): Promise<ProjectWithPartialRelations[]> {
  try {
    if (!userId) {
      return [];
    }

    const {
      ownerId,
      isArchived = false,
      search,
      orderBy = "updatedAt",
      orderDirection = "desc",
      limit = 50,
      offset = 0,
    } = options;

    // First, get all team IDs the user is a member of
    const userTeams = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    if (userTeams.length === 0) {
      return [];
    }

    const teamIds = userTeams.map((t) => t.teamId);

    // Now use the same pattern as getTeamProjectsAction but for multiple teams
    const baseQuery = db
      .select({
        // Project fields
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        teamId: projects.teamId,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Team fields
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
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
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(users, eq(projects.ownerId, users.id));

    // Build where conditions (same pattern as getTeamProjectsAction)
    const conditions = [
      inArray(projects.teamId, teamIds), // Instead of eq(projects.teamId, teamId)
      eq(teams.isArchived, false), // Also filter out archived teams
    ];

    if (typeof isArchived === "boolean") {
      conditions.push(eq(projects.isArchived, isArchived));
    }

    if (ownerId) {
      conditions.push(eq(projects.ownerId, ownerId));
    }

    if (search) {
      conditions.push(like(projects.name, `%${search}%`));
    }

    // Apply where conditions
    const queryWithWhere = baseQuery.where(and(...conditions));

    // Apply ordering (same as getTeamProjectsAction)
    let queryWithOrder;
    if (orderBy === "name") {
      queryWithOrder = queryWithWhere.orderBy(
        orderDirection === "desc" ? desc(projects.name) : asc(projects.name)
      );
    } else if (orderBy === "createdAt") {
      queryWithOrder = queryWithWhere.orderBy(
        orderDirection === "desc"
          ? desc(projects.createdAt)
          : asc(projects.createdAt)
      );
    } else {
      queryWithOrder = queryWithWhere.orderBy(
        orderDirection === "desc"
          ? desc(projects.updatedAt)
          : asc(projects.updatedAt)
      );
    }

    // Apply pagination and execute
    const result = await queryWithOrder.limit(limit).offset(offset);

    return result;
  } catch (error) {
    console.error("Error fetching projects for user:", error);
    return [];
  }
}

/**
 * Update an existing project
 */
export async function updateProjectAction(data: UpdateProject) {
  try {
    const { id, name, slug, description, colorTheme, isArchived } = data;

    if (!id) {
      return {
        success: false,
        error: "Project ID is required",
        project: null,
      };
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (slug !== undefined) {
      // If slug is being changed, ensure uniqueness
      if (slug.trim()) {
        const baseSlug = slug
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .trim();

        // Get current project to check team
        const currentProject = await db
          .select({ teamId: projects.teamId, slug: projects.slug })
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

        // Only check for uniqueness if slug is actually changing
        if (baseSlug !== currentProject[0].slug) {
          const uniqueSlug = await generateUniqueSlug(
            baseSlug,
            currentProject[0].teamId
          );
          updateData.slug = uniqueSlug;
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
      updateData.description = description?.trim() || null;
    }

    if (colorTheme !== undefined) {
      updateData.colorTheme = colorTheme;
    }

    if (isArchived !== undefined) {
      updateData.isArchived = isArchived;
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

    // Revalidate related pages
    revalidatePath(`/project/${updatedProject.slug}`);
    revalidatePath(`/team/${updatedProject.teamId}`);

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

    // Check if user has permission to delete (must be owner or team owner/admin)
    const projectWithTeam = await db
      .select({
        id: projects.id,
        ownerId: projects.ownerId,
        teamId: projects.teamId,
        slug: projects.slug,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectWithTeam.length === 0) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    const project = projectWithTeam[0];

    // Check permissions
    const isOwner = project.ownerId === userId;
    const isTeamAdminOrOwner = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, project.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .limit(1);

    const hasDeletePermission =
      isOwner ||
      (isTeamAdminOrOwner.length > 0 &&
        ["owner", "admin"].includes(isTeamAdminOrOwner[0].role));

    if (!hasDeletePermission) {
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

    // Revalidate related pages
    revalidatePath(`/project/${project.slug}`);
    revalidatePath(`/team/${project.teamId}`);

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
    // First, get all team IDs the user is a member of
    const userTeams = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    if (userTeams.length === 0) {
      return null;
    }

    const teamIds = userTeams.map((t) => t.teamId);

    // Find the project with the given slug in any of the user's teams
    const result = await db
      .select({
        // Project fields
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        teamId: projects.teamId,
        ownerId: projects.ownerId,
        colorTheme: projects.colorTheme,
        isArchived: projects.isArchived,
        schemaVersion: projects.schemaVersion,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Team fields
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
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
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(
        and(
          eq(projects.slug, slug),
          inArray(projects.teamId, teamIds),
          eq(projects.isArchived, false) // Only active projects
        )
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching project by slug for user:", error);
    return null;
  }
}
