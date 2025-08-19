// lib/services/projects.ts
"use server";

import { db } from "@/lib/db/db";
import {
  projects,
  teams,
  users,
  teamMembers,
  columns,
  cards,
  labels,
  projectTeams,
  projectTeamMembers,
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
      }>
    >();

  const rows = await db
    .select({
      projectId: projectTeams.projectId,
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
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
    }>
  >();

  for (const r of rows) {
    if (!map.has(r.projectId)) map.set(r.projectId, []);
    map.get(r.projectId)!.push({ id: r.id, name: r.name, slug: r.slug });
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
 * Create a new project with team assignments and member roles
 */
export async function createProjectAction(
  data: CreateProject & {
    teamIds: string[];
    memberRoles: Record<string, "admin" | "editor" | "viewer">;
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
      memberRoles = {},
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

    const uniqueSlug = await generateUniqueSlug(baseSlug);

    // STEP 1: Create the project
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

    // STEP 2: Create project-team relationships
    const projectTeamInserts = teamIds.map((teamId) => ({
      projectId: newProject.id,
      teamId: teamId,
      addedBy: ownerId,
    }));

    await db.insert(projectTeams).values(projectTeamInserts);

    // STEP 3: Get all team members for the selected teams and assign project roles
    const memberRoleInserts: Array<{
      projectId: string;
      teamMemberId: string;
      role: "admin" | "editor" | "viewer";
      addedBy: string;
    }> = [];

    for (const teamId of teamIds) {
      // Get all team members for this team
      const teamMembersData = await db
        .select({
          id: teamMembers.id, // This is the teamMembers.id we need for projectTeamMembers
          userId: teamMembers.userId,
        })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      // For each team member, assign their project role
      teamMembersData.forEach((member) => {
        const role = memberRoles[member.userId] || "editor"; // Default to editor if no role specified

        memberRoleInserts.push({
          projectId: newProject.id,
          teamMemberId: member.id, // This is the teamMembers.id (foreign key)
          role,
          addedBy: ownerId,
        });
      });
    }

    // Insert all project team member roles
    if (memberRoleInserts.length > 0) {
      await db.insert(projectTeamMembers).values(memberRoleInserts);
    }

    // STEP 4: Create default columns for the new project
    await createDefaultColumns(newProject.id);

    // STEP 5: Activity & Notification logging
    await ActivityService.logProjectCreated(
      ownerId,
      newProject.id,
      newProject.name
    );

    for (const teamId of teamIds) {
      await NotificationService.notifyProjectCreated(
        ownerId,
        newProject.id,
        newProject.name,
        teamId
      );
    }

    // STEP 6: Revalidate related pages
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

export async function getProjectWithMemberRoles(projectId: string): Promise<
  | (ProjectWithPartialRelations & {
      memberRoles: Array<{
        userId: string;
        role: "admin" | "editor" | "viewer";
        teamName: string;
        user: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          avatarUrl: string | null;
        };
      }>;
    })
  | null
> {
  try {
    // Get basic project info
    const project = await getProjectAction(projectId);
    if (!project) return null;

    // Get member roles for this project
    const memberRoles = await db
      .select({
        userId: users.id,
        role: projectTeamMembers.role,
        teamName: teams.name,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(projectTeamMembers)
      .innerJoin(
        teamMembers,
        eq(projectTeamMembers.teamMemberId, teamMembers.id)
      )
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .innerJoin(
        projectTeams,
        eq(projectTeamMembers.projectId, projectTeams.projectId)
      )
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
      .where(eq(projectTeamMembers.projectId, projectId));

    return {
      ...project,
      memberRoles,
    };
  } catch (error) {
    console.error("Error fetching project with member roles:", error);
    return null;
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
      })
      .from(projectTeams)
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
      .where(eq(projectTeams.projectId, projectId));

    // Get project team members with ALL required fields
    const projectTeamMembersResult = await db
      .select({
        // ALL ProjectTeamMember fields
        id: projectTeamMembers.id,
        projectId: projectTeamMembers.projectId,
        teamMemberId: projectTeamMembers.teamMemberId,
        role: projectTeamMembers.role,
        addedBy: projectTeamMembers.addedBy,
        createdAt: projectTeamMembers.createdAt,
        updatedAt: projectTeamMembers.updatedAt,
        // TeamMember info
        teamMemberTeamId: teamMembers.teamId,
        teamMemberUserId: teamMembers.userId,
        teamMemberRole: teamMembers.role,
        teamMemberJoinedAt: teamMembers.joinedAt,
        // ALL User fields
        userId: users.id,
        userClerkUserId: users.clerkUserId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userUsername: users.username,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
        userPersonalTeamId: users.personalTeamId,
        userSchemaVersion: users.schemaVersion,
        userCreatedAt: users.createdAt,
        userUpdatedAt: users.updatedAt,
      })
      .from(projectTeamMembers)
      .innerJoin(
        teamMembers,
        eq(projectTeamMembers.teamMemberId, teamMembers.id)
      )
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(projectTeamMembers.projectId, projectId));

    // Transform to match ProjectTeamMemberWithRelations type
    const formattedProjectTeamMembers = projectTeamMembersResult.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      teamMemberId: row.teamMemberId,
      role: row.role,
      addedBy: row.addedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      teamMember: {
        id: row.teamMemberId,
        teamId: row.teamMemberTeamId,
        userId: row.teamMemberUserId,
        role: row.teamMemberRole,
        joinedAt: row.teamMemberJoinedAt,
        user: {
          id: row.userId,
          clerkUserId: row.userClerkUserId,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          username: row.userUsername,
          email: row.userEmail,
          avatarUrl: row.userAvatarUrl,
          personalTeamId: row.userPersonalTeamId,
          schemaVersion: row.userSchemaVersion,
          createdAt: row.userCreatedAt,
          updatedAt: row.userUpdatedAt,
        },
      },
    }));

    return {
      ...result[0],
      teams: teamsResult,
      projectTeamMembers: formattedProjectTeamMembers,
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
      });
    }

    return Array.from(projectsMap.values());
  } catch (error) {
    console.error("Error fetching team projects:", error);
    return [];
  }
}

/**
 * Get all projects for a user based on their team memberships - FIXED VERSION
 */
export async function getProjectsForUser(
  userId: string,
  options: Omit<ProjectsListOptions, "teamId"> = {}
): Promise<ProjectWithPartialRelations[]> {
  try {
    if (!userId) return [];

    // Convert Clerk user ID to internal user ID if needed
    let internalUserId = userId;

    const {
      ownerId,
      isArchived = false,
      search,
      orderBy = "updatedAt",
      orderDirection = "desc",
      limit = 50,
      offset = 0,
    } = options;

    // Get teams this user belongs to (using internal user ID)
    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, internalUserId));

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

    // Get unique projects via those teams
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        ownerId: projects.ownerId,
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
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
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

    // Get teams for each project
    const projectIds = rows.map((r) => r.id);
    const teamsMap = await getTeamsForProjectIds(projectIds);

    // De-duplicate projects (since joins can fan out)
    const projectsMap = new Map<string, ProjectWithPartialRelations>();
    for (const r of rows) {
      if (!projectsMap.has(r.id)) {
        projectsMap.set(r.id, {
          ...r,
          teams: teamsMap.get(r.id) ?? [],
        });
      }
    }

    return Array.from(projectsMap.values());
  } catch (error) {
    console.error("Error fetching projects for user:", error);
    return [];
  }
}

/**
 * Update an existing project - FIXED to handle team management
 */
export async function updateProjectAction(
  data: UpdateProject & {
    userId: string;
    teamIds?: string[];
    memberRoles?: Record<string, "admin" | "editor" | "viewer">;
  }
) {
  try {
    const {
      id,
      userId,
      name,
      slug,
      description,
      isArchived,
      teamIds,
      memberRoles = {},
    } = data;

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
      .select({
        teamRole: teamMembers.role,
        projectRole: projectTeamMembers.role,
      })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .leftJoin(
        projectTeamMembers,
        and(
          eq(projectTeams.projectId, projectTeamMembers.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(eq(projectTeams.projectId, id))
      .limit(1);

    const hasPermission =
      hasAdminAccess.length > 0 &&
      (hasAdminAccess[0].teamRole === "owner" ||
        hasAdminAccess[0].teamRole === "admin" ||
        hasAdminAccess[0].projectRole === "admin");

    if (!isOwner && !hasPermission) {
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

    if (isArchived !== undefined && isArchived !== current.isArchived) {
      updateData.isArchived = isArchived;
      changes.push({
        field: "isArchived",
        oldValue: current.isArchived,
        newValue: isArchived,
      });
    }

    // Update the project
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

    // Handle team updates if teamIds are provided
    if (teamIds !== undefined && teamIds.length > 0) {
      // Get current teams
      const currentTeams = await db
        .select({ teamId: projectTeams.teamId })
        .from(projectTeams)
        .where(eq(projectTeams.projectId, id));

      const currentTeamIds = currentTeams.map((t) => t.teamId);

      // Find teams to add and remove
      const teamsToAdd = teamIds.filter(
        (teamId) => !currentTeamIds.includes(teamId)
      );
      const teamsToRemove = currentTeamIds.filter(
        (teamId) => !teamIds.includes(teamId)
      );

      // Verify user has access to new teams
      if (teamsToAdd.length > 0) {
        const userTeams = await getUserTeamsForProjectCreation(userId);
        const invalidTeams = teamsToAdd.filter(
          (teamId) => !userTeams.includes(teamId)
        );

        if (invalidTeams.length > 0) {
          return {
            success: false,
            error:
              "You don't have permission to add some of the selected teams",
            project: null,
          };
        }
      }

      // Remove old teams and their member relationships
      if (teamsToRemove.length > 0) {
        // First remove project team members for these teams
        await db
          .delete(projectTeamMembers)
          .where(
            and(
              eq(projectTeamMembers.projectId, id),
              inArray(
                projectTeamMembers.teamMemberId,
                db
                  .select({ id: teamMembers.id })
                  .from(teamMembers)
                  .where(inArray(teamMembers.teamId, teamsToRemove))
              )
            )
          );

        // Then remove project team relationships
        await db
          .delete(projectTeams)
          .where(
            and(
              eq(projectTeams.projectId, id),
              inArray(projectTeams.teamId, teamsToRemove)
            )
          );
      }

      // Add new teams and their member relationships
      if (teamsToAdd.length > 0) {
        // Add project-team relationships
        const projectTeamInserts = teamsToAdd.map((teamId) => ({
          projectId: id,
          teamId,
          addedBy: userId,
        }));

        await db.insert(projectTeams).values(projectTeamInserts);

        // Add project team member roles for new teams
        const memberRoleInserts: Array<{
          projectId: string;
          teamMemberId: string;
          role: "admin" | "editor" | "viewer";
          addedBy: string;
        }> = [];

        for (const teamId of teamsToAdd) {
          const teamMembersData = await db
            .select({
              id: teamMembers.id,
              userId: teamMembers.userId,
            })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, teamId));

          teamMembersData.forEach((member) => {
            const role = memberRoles[member.userId] || "editor";
            memberRoleInserts.push({
              projectId: id,
              teamMemberId: member.id,
              role,
              addedBy: userId,
            });
          });
        }

        if (memberRoleInserts.length > 0) {
          await db.insert(projectTeamMembers).values(memberRoleInserts);
        }
      }

      // Update existing member roles if provided
      if (Object.keys(memberRoles).length > 0) {
        for (const [userId, role] of Object.entries(memberRoles)) {
          await db
            .update(projectTeamMembers)
            .set({ role, updatedAt: new Date() })
            .where(
              and(
                eq(projectTeamMembers.projectId, id),
                eq(
                  projectTeamMembers.teamMemberId,
                  db
                    .select({ id: teamMembers.id })
                    .from(teamMembers)
                    .where(eq(teamMembers.userId, userId))
                    .limit(1)
                )
              )
            );
        }
      }
    }

    // Activity & Notification logging
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
 * Delete a project (soft delete by archiving) - FIXED to handle related records
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
      .select({
        teamRole: teamMembers.role,
        projectRole: projectTeamMembers.role,
      })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .leftJoin(
        projectTeamMembers,
        and(
          eq(projectTeams.projectId, projectTeamMembers.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(eq(projectTeams.projectId, projectId))
      .limit(1);

    const hasPermission =
      hasAdminAccess.length > 0 &&
      (hasAdminAccess[0].teamRole === "owner" ||
        hasAdminAccess[0].teamRole === "admin" ||
        hasAdminAccess[0].projectRole === "admin");

    if (!isOwner && !hasPermission) {
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

    // Activity & Notification logging
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
 * Permanently delete a project (with CASCADE cleanup) - FIXED to handle all relationships
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
      .select({
        teamRole: teamMembers.role,
        projectRole: projectTeamMembers.role,
      })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .leftJoin(
        projectTeamMembers,
        and(
          eq(projectTeams.projectId, projectTeamMembers.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(eq(projectTeams.projectId, projectId))
      .limit(1);

    const hasPermission =
      hasAdminAccess.length > 0 &&
      (hasAdminAccess[0].teamRole === "owner" ||
        hasAdminAccess[0].teamRole === "admin" ||
        hasAdminAccess[0].projectRole === "admin");

    if (!isOwner && !hasPermission) {
      return {
        success: false,
        error: "You don't have permission to delete this project",
      };
    }

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

    // MANUAL CASCADE DELETE - Delete in correct order to avoid foreign key constraints

    // 1. Delete project team members first (references teamMembers and projectTeams)
    await db
      .delete(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, projectId));

    // 2. Delete project teams (references projects and teams)
    await db.delete(projectTeams).where(eq(projectTeams.projectId, projectId));

    // 3. Delete columns (references projects)
    await db.delete(columns).where(eq(columns.projectId, projectId));

    // 4. Finally delete the project itself
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
 */
export async function getProjectBySlugForUser(
  slug: string,
  userId: string
): Promise<(ProjectWithPartialRelations & { userRole?: string }) | null> {
  try {
    console.log("[getProjectBySlugForUser] Called with:", { slug, userId });

    // 1. Get team memberships (team-level roles)
    const memberships = await db
      .select({
        teamId: teamMembers.teamId,
        teamRole: teamMembers.role,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    console.log("[getProjectBySlugForUser] Memberships found:", memberships);
    const teamIds = memberships.map((m) => m.teamId);

    // 2. Get project memberships (project-level roles)
    const projectMemberships = await db
      .select({
        projectId: projectTeamMembers.projectId,
        projectRole: projectTeamMembers.role,
      })
      .from(projectTeamMembers)
      .innerJoin(
        teamMembers,
        eq(projectTeamMembers.teamMemberId, teamMembers.id)
      )
      .where(eq(teamMembers.userId, userId));

    console.log(
      "[getProjectBySlugForUser] Project memberships found:",
      projectMemberships
    );
    const projectIdsFromMemberships = projectMemberships.map(
      (p) => p.projectId
    );

    // 3. Get the project with access check
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
      .innerJoin(users, eq(projects.ownerId, users.id))
      .leftJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .where(
        and(
          eq(projects.slug, slug),
          eq(projects.isArchived, false),
          or(
            inArray(projectTeams.teamId, teamIds), // Team-level access
            inArray(projects.id, projectIdsFromMemberships) // Project-level access
          )
        )
      )
      .limit(1);

    const project = projRow[0];
    if (!project) return null;

    // 4. Get their role (prefer project-level role if available)
    let userRole: string | undefined;
    const projectRoleEntry = projectMemberships.find(
      (p) => p.projectId === project.id
    );
    if (projectRoleEntry) {
      userRole = projectRoleEntry.projectRole;
    } else {
      // If no direct project role, find a team role from one of the linked teams
      const projectTeamsForThisProject = await db
        .select({ teamId: projectTeams.teamId })
        .from(projectTeams)
        .where(eq(projectTeams.projectId, project.id));

      const matchingTeam = memberships.find((m) =>
        projectTeamsForThisProject.some((t) => t.teamId === m.teamId)
      );
      userRole = matchingTeam?.teamRole;
    }

    // 5. Get associated teams for this project
    const teamsResult = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
      })
      .from(projectTeams)
      .innerJoin(teams, eq(projectTeams.teamId, teams.id))
      .where(eq(projectTeams.projectId, project.id));

    // 6. Get columns with their cards
    const columnsResult = await db
      .select({
        // Column fields
        columnId: columns.id,
        columnName: columns.name,
        columnPosition: columns.position,
        columnColor: columns.color,
        columnCreatedAt: columns.createdAt,
        columnUpdatedAt: columns.updatedAt,
        // Card fields (optional due to LEFT JOIN)
        cardId: cards.id,
        cardTitle: cards.title,
        cardDescription: cards.description,
        cardAssigneeId: cards.assigneeId,
        cardPriority: cards.priority,
        cardStartDate: cards.startDate,
        cardDueDate: cards.dueDate,
        cardPosition: cards.position,
        cardStatus: cards.statusColumnId,
        cardIsArchived: cards.isArchived,
        cardSchemaVersion: cards.schemaVersion,
        cardCreatedAt: cards.createdAt,
        cardUpdatedAt: cards.updatedAt,
        // Assignee fields (optional)
        assigneeId: users.id,
        assigneeFirstName: users.firstName,
        assigneeLastName: users.lastName,
        assigneeEmail: users.email,
        assigneeAvatarUrl: users.avatarUrl,
      })
      .from(columns)
      .leftJoin(
        cards,
        and(eq(cards.columnId, columns.id), eq(cards.isArchived, false))
      )
      .leftJoin(users, eq(cards.assigneeId, users.id))
      .where(eq(columns.projectId, project.id))
      .orderBy(asc(columns.position), asc(cards.position));

    // Group columns and cards
    const columnsMap = new Map();

    for (const row of columnsResult) {
      if (!columnsMap.has(row.columnId)) {
        columnsMap.set(row.columnId, {
          id: row.columnId,
          projectId: project.id,
          name: row.columnName,
          position: row.columnPosition,
          color: row.columnColor,
          createdAt: row.columnCreatedAt,
          updatedAt: row.columnUpdatedAt,
          cards: [],
        });
      }

      if (row.cardId) {
        columnsMap.get(row.columnId).cards.push({
          id: row.cardId,
          columnId: row.columnId,
          title: row.cardTitle,
          description: row.cardDescription,
          assigneeId: row.cardAssigneeId,
          priority: row.cardPriority,
          startDate: row.cardStartDate,
          dueDate: row.cardDueDate,
          position: row.cardPosition,
          status: row.cardStatus,
          isArchived: row.cardIsArchived,
          schemaVersion: row.cardSchemaVersion,
          createdAt: row.cardCreatedAt,
          updatedAt: row.cardUpdatedAt,
          assignee: row.assigneeId
            ? {
                id: row.assigneeId,
                firstName: row.assigneeFirstName,
                lastName: row.assigneeLastName,
                email: row.assigneeEmail,
                avatarUrl: row.assigneeAvatarUrl,
              }
            : null,
        });
      }
    }

    const columnsArray = Array.from(columnsMap.values());

    // 7. Get project labels
    const labelsResult = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        createdAt: labels.createdAt,
      })
      .from(labels)
      .where(eq(labels.projectId, project.id));

    // 8. Get project team members with ALL required fields
    const projectTeamMembersResult = await db
      .select({
        // ALL ProjectTeamMember fields
        id: projectTeamMembers.id,
        projectId: projectTeamMembers.projectId,
        teamMemberId: projectTeamMembers.teamMemberId,
        role: projectTeamMembers.role,
        addedBy: projectTeamMembers.addedBy,
        createdAt: projectTeamMembers.createdAt,
        updatedAt: projectTeamMembers.updatedAt,
        // TeamMember info
        teamMemberTeamId: teamMembers.teamId,
        teamMemberUserId: teamMembers.userId,
        teamMemberRole: teamMembers.role,
        teamMemberJoinedAt: teamMembers.joinedAt,
        // ALL User fields
        userId: users.id,
        userClerkUserId: users.clerkUserId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userUsername: users.username,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
        userPersonalTeamId: users.personalTeamId,
        userSchemaVersion: users.schemaVersion,
        userCreatedAt: users.createdAt,
        userUpdatedAt: users.updatedAt,
      })
      .from(projectTeamMembers)
      .innerJoin(
        teamMembers,
        eq(projectTeamMembers.teamMemberId, teamMembers.id)
      )
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(projectTeamMembers.projectId, project.id));

    // Transform to match ProjectTeamMemberWithRelations type
    const formattedProjectTeamMembers = projectTeamMembersResult.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      teamMemberId: row.teamMemberId,
      role: row.role,
      addedBy: row.addedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      teamMember: {
        id: row.teamMemberId,
        teamId: row.teamMemberTeamId,
        userId: row.teamMemberUserId,
        role: row.teamMemberRole,
        joinedAt: row.teamMemberJoinedAt,
        user: {
          id: row.userId,
          clerkUserId: row.userClerkUserId,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          username: row.userUsername,
          email: row.userEmail,
          avatarUrl: row.userAvatarUrl,
          personalTeamId: row.userPersonalTeamId,
          schemaVersion: row.userSchemaVersion,
          createdAt: row.userCreatedAt,
          updatedAt: row.userUpdatedAt,
        },
      },
    }));

    const result = {
      ...project,
      teams: teamsResult,
      columns: columnsArray,
      labels: labelsResult,
      projectTeamMembers: formattedProjectTeamMembers,
      userRole,
    };

    console.log("[getProjectBySlugForUser] Final project data:", result);
    return result;
  } catch (error) {
    console.error(
      "[getProjectBySlugForUser] Error fetching project by slug for user:",
      error
    );
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
  memberRoles: Record<string, "admin" | "editor" | "viewer"> = {}
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
      .select({
        teamRole: teamMembers.role,
        projectRole: projectTeamMembers.role,
      })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .leftJoin(
        projectTeamMembers,
        and(
          eq(projectTeams.projectId, projectTeamMembers.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(eq(projectTeams.projectId, projectId))
      .limit(1);

    // Also check if user is project owner
    const projectOwner = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const isOwner = projectOwner[0]?.ownerId === userId;
    const hasAdminAccess =
      hasPermission.length > 0 &&
      (hasPermission[0].teamRole === "owner" ||
        hasPermission[0].teamRole === "admin" ||
        hasPermission[0].projectRole === "admin");

    if (!isOwner && !hasAdminAccess) {
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
      addedBy: userId,
    }));

    await db.insert(projectTeams).values(projectTeamInserts);

    // Add project team member roles for new teams
    const memberRoleInserts: Array<{
      projectId: string;
      teamMemberId: string;
      role: "admin" | "editor" | "viewer";
      addedBy: string;
    }> = [];

    for (const teamId of newTeamIds) {
      const teamMembersData = await db
        .select({
          id: teamMembers.id,
          userId: teamMembers.userId,
        })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      teamMembersData.forEach((member) => {
        const role = memberRoles[member.userId] || "editor";
        memberRoleInserts.push({
          projectId,
          teamMemberId: member.id,
          role,
          addedBy: userId,
        });
      });
    }

    if (memberRoleInserts.length > 0) {
      await db.insert(projectTeamMembers).values(memberRoleInserts);
    }

    // Activity & Notification logging
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
      .select({
        teamRole: teamMembers.role,
        projectRole: projectTeamMembers.role,
      })
      .from(projectTeams)
      .innerJoin(
        teamMembers,
        and(
          eq(projectTeams.teamId, teamMembers.teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .leftJoin(
        projectTeamMembers,
        and(
          eq(projectTeams.projectId, projectTeamMembers.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(eq(projectTeams.projectId, projectId))
      .limit(1);

    // Also check if user is project owner
    const projectOwner = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const isOwner = projectOwner[0]?.ownerId === userId;
    const hasAdminAccess =
      hasPermission.length > 0 &&
      (hasPermission[0].teamRole === "owner" ||
        hasPermission[0].teamRole === "admin" ||
        hasPermission[0].projectRole === "admin");

    if (!isOwner && !hasAdminAccess) {
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

    // Remove project team members for these teams first
    await db
      .delete(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          inArray(
            projectTeamMembers.teamMemberId,
            db
              .select({ id: teamMembers.id })
              .from(teamMembers)
              .where(inArray(teamMembers.teamId, teamIds))
          )
        )
      );

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
 * Assign project role
 */
export async function assignProjectTeamMemberRoleAction(
  projectId: string,
  memberId: string, // The project team member whose role you want to assign/change
  newRole: "admin" | "editor" | "viewer",
  userId: string // The user performing the assignment
) {
  try {
    if (!projectId || !memberId || !newRole || !userId) {
      return {
        success: false,
        error: "All parameters are required",
      };
    }

    // 1. Check if the acting user has permission
    const permissionCheck = await db
      .select({
        teamRole: teamMembers.role,
        projectOwnerId: projects.ownerId,
        projectRole: projectTeamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(projectTeams, eq(teamMembers.teamId, projectTeams.teamId))
      .innerJoin(projects, eq(projectTeams.projectId, projects.id))
      .leftJoin(
        projectTeamMembers,
        and(
          eq(projectTeams.projectId, projectTeamMembers.projectId),
          eq(projectTeamMembers.teamMemberId, teamMembers.id)
        )
      )
      .where(
        and(
          eq(projects.id, projectId),
          eq(teamMembers.userId, userId) // The acting user
        )
      )
      .limit(1);

    const actingUser = permissionCheck[0];
    const isProjectOwner = actingUser?.projectOwnerId === userId;
    const isTeamAdminOrOwner =
      actingUser?.teamRole === "owner" || actingUser?.teamRole === "admin";
    const isProjectAdmin = actingUser?.projectRole === "admin";

    if (!isProjectOwner && !isTeamAdminOrOwner && !isProjectAdmin) {
      return {
        success: false,
        error: "You don't have permission to assign this member's role",
      };
    }

    // 2. Assign (or update) the member's role
    const [updatedMember] = await db
      .update(projectTeamMembers)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(projectTeamMembers.id, memberId)) // use projectTeamMembers.id, not teamMembers.id
      .returning({
        id: projectTeamMembers.id,
        projectId: projectTeamMembers.projectId,
        teamMemberId: projectTeamMembers.teamMemberId,
      });

    if (!updatedMember) {
      return { success: false, error: "Project team member not found" };
    }

    // Fetch the teamId for revalidation
    const [{ teamId }] = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.id, updatedMember.teamMemberId))
      .limit(1);

    revalidatePath(`/projects/${projectId}`);
    if (teamId) revalidatePath(`/team/${teamId}`);

    return {
      success: true,
      error: null,
      updatedRole: newRole,
    };
  } catch (error) {
    console.error("Error assigning project team member role:", error);
    return {
      success: false,
      error: "Failed to assign team member role. Please try again.",
    };
  }
}

export async function getProjectRoleForUser(
  projectSlug: string,
  userId: string
) {
  // Step 0: Resolve slug to project ID
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, projectSlug),
    columns: { id: true },
  });

  if (!project) return null;
  const projectId = project.id;

  // Step 1: Find all team IDs assigned to this project
  const teams = await db.query.projectTeams.findMany({
    where: eq(projectTeams.projectId, projectId),
    columns: { teamId: true },
  });

  if (!teams.length) return null;
  const teamIds = teams.map((t) => t.teamId);

  // Step 2: Find the teamMember.id for this user
  const member = await db.query.teamMembers.findFirst({
    where: and(
      inArray(teamMembers.teamId, teamIds),
      eq(teamMembers.userId, userId) // also make sure to filter by user!
    ),
    columns: { id: true },
  });

  if (!member) return null;

  // Step 3: Find their role in projectTeamMembers
  const projectMember = await db.query.projectTeamMembers.findFirst({
    where: and(
      eq(projectTeamMembers.projectId, projectId),
      eq(projectTeamMembers.teamMemberId, member.id)
    ),
    columns: { role: true },
  });

  return projectMember?.role || null;
}
