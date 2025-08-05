// lib/services/teams.ts
"use server";

import { db } from "@/lib/db/db";
import {
  labels,
  columns,
  cards,
  cardLabels,
  cardComments,
  cardAttachments,
  mentions,
  activityLog,
  notifications,
  projects,
  teams,
  teamMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bulkInviteUsersAction, getUsersByEmailsAction } from "./user-search";
import type { Team, TeamMember, User } from "@/types";
import type {
  TeamMemberWithRelations,
  TeamWithRelations,
} from "@/types/relations";

interface CreateTeamData {
  name: string;
  slug: string;
  description?: string;
  members: string[];
  createdBy: string;
}

type CreateTeamResult =
  | {
      success: true;
      team: Team;
      invitationResults?: Array<{
        email?: string;
        success?: boolean;
        invitationId?: string;
        error?: string;
      }>;
    }
  | {
      success: false;
      error: string;
    };
/**
 * Create a new team with members
 * @param teamData - Team creation data
 * @returns Creation result with team and invitation status
 */
export async function createTeamAction(
  teamData: CreateTeamData
): Promise<CreateTeamResult> {
  try {
    const { name, slug, description, members, createdBy } = teamData;

    // Check if slug already exists
    const existingTeam = await db.query.teams.findFirst({
      where: eq(teams.slug, slug),
    });

    if (existingTeam) {
      return {
        success: false,
        error:
          "A team with this URL already exists. Please choose a different one.",
      };
    }

    // Create the team
    const [newTeam] = await db
      .insert(teams)
      .values({
        name,
        slug,
        description,
        createdBy,
        isPersonal: false,
        isArchived: false,
      })
      .returning();

    if (!newTeam) {
      return {
        success: false,
        error: "Failed to create team",
      };
    }

    // Add the creator as the owner
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: createdBy,
      role: "owner",
    });

    let invitationResults: Array<{
      email: string;
      success: boolean;
      invitationId?: string;
      error?: string;
    }> = [];

    // Handle member invitations if any
    if (members && members.length > 0) {
      try {
        // Check which users already exist
        const existingUsers = await getUsersByEmailsAction(members);
        const existingEmails = new Set(existingUsers.map((u) => u.email));

        // Add existing users directly to the team
        if (existingUsers.length > 0) {
          const teamMemberInserts = existingUsers.map((user) => ({
            teamId: newTeam.id,
            userId: user.id,
            role: "member" as const,
          }));

          await db.insert(teamMembers).values(teamMemberInserts);

          // Mark existing users as successfully added
          existingUsers.forEach((user) => {
            invitationResults.push({
              email: user.email,
              success: true,
              // No invitationId since they were added directly
            });
          });
        }

        // Send invitations to non-existing users
        const nonExistingEmails = members.filter(
          (email) => !existingEmails.has(email)
        );

        if (nonExistingEmails.length > 0) {
          const inviteResults = await bulkInviteUsersAction(
            nonExistingEmails,
            newTeam.id,
            newTeam.name,
            createdBy
          );

          invitationResults.push(...inviteResults);
        }
      } catch (inviteError) {
        console.error("Error handling member invitations:", inviteError);
        // Don't fail the team creation if invitations fail
        invitationResults = members.map((email) => ({
          email,
          success: false,
          error: "Failed to send invitation",
        }));
      }
    }

    // Revalidate relevant paths
    revalidatePath("/team");
    revalidatePath(`/team/${newTeam.slug}`);

    return {
      success: true,
      team: newTeam,
      invitationResults,
    };
  } catch (error) {
    console.error("Error creating team:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Add members to an existing team
 * @param teamId - Team ID
 * @param memberEmails - Array of email addresses
 * @param invitedBy - User ID of the inviter
 * @returns Addition result
 */
export async function addTeamMembersAction(
  teamId: string,
  memberEmails: string[],
  invitedBy: string
): Promise<{
  success: boolean;
  results: Array<{
    email: string;
    success: boolean;
    invitationId?: string;
    error?: string;
  }>;
}> {
  try {
    // Get team details
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return {
        success: false,
        results: memberEmails.map((email) => ({
          email,
          success: false,
          error: "Team not found",
        })),
      };
    }

    // Check which users already exist
    const existingUsers = await getUsersByEmailsAction(memberEmails);
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    const results: Array<{
      email: string;
      success: boolean;
      invitationId?: string;
      error?: string;
    }> = [];

    // Add existing users directly to the team
    if (existingUsers.length > 0) {
      // Filter out users who are already team members
      const existingMembers = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      const existingMemberIds = new Set(existingMembers.map((m) => m.userId));
      const usersToAdd = existingUsers.filter(
        (user) => !existingMemberIds.has(user.id)
      );

      if (usersToAdd.length > 0) {
        const teamMemberInserts = usersToAdd.map((user) => ({
          teamId,
          userId: user.id,
          role: "member" as const,
        }));

        await db.insert(teamMembers).values(teamMemberInserts);
      }

      // Add results for existing users
      existingUsers.forEach((user) => {
        const wasAlreadyMember = existingMemberIds.has(user.id);
        results.push({
          email: user.email,
          success: !wasAlreadyMember,
          error: wasAlreadyMember ? "User is already a team member" : undefined,
        });
      });
    }

    // Send invitations to non-existing users
    const nonExistingEmails = memberEmails.filter(
      (email) => !existingEmails.has(email)
    );

    if (nonExistingEmails.length > 0) {
      const inviteResults = await bulkInviteUsersAction(
        nonExistingEmails,
        teamId,
        team.name,
        invitedBy
      );

      results.push(...inviteResults);
    }

    // Revalidate team page
    revalidatePath(`/team/${team.slug}`);

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("Error adding team members:", error);
    return {
      success: false,
      results: memberEmails.map((email) => ({
        email,
        success: false,
        error: "Failed to add member",
      })),
    };
  }
}

/**
 * Remove a member from a team
 * @param teamId - Team ID
 * @param userId - User ID to remove
 * @param removedBy - User ID of the person removing the member
 * @returns Removal result
 */
export async function removeTeamMemberAction(
  teamId: string,
  userId: string,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  console.log("🔧 [Action] removeTeamMemberAction called with:", {
    teamId,
    userId,
    removedBy,
  });

  try {
    // Step 1: Check permissions of remover
    console.log("🔍 Checking remover's membership...");
    const removerMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, removedBy)
      ),
    });
    console.log("👤 Remover membership found:", removerMembership);

    if (
      !removerMembership ||
      !["owner", "admin"].includes(removerMembership.role)
    ) {
      console.warn("⛔️ Remover does not have permission.");
      return {
        success: false,
        error: "You don't have permission to remove team members",
      };
    }

    // Step 2: Check if trying to remove an owner
    console.log("🔍 Checking role of member to remove...");
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)),
    });
    console.log("👤 Member to remove:", memberToRemove);

    if (memberToRemove?.role === "owner") {
      console.warn("⛔️ Attempted to remove a team owner.");
      return {
        success: false,
        error: "Cannot remove the team owner",
      };
    }

    // Step 3: Attempt to delete
    console.log("🗑 Attempting to delete member...");
    const deleteResult = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)));
    console.log("✅ Delete result:", deleteResult);

    // Step 4: Revalidate the team path
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    console.log("📦 Team for revalidation:", team);

    if (team) {
      const path = `/team/${team.slug}`;
      console.log(`🔁 Revalidating path: ${path}`);
      revalidatePath(path);
    }

    console.log("🎉 Member successfully removed.");
    return { success: true };
  } catch (error) {
    console.error("❌ Error removing team member:", error);
    return {
      success: false,
      error: "Failed to remove team member",
    };
  }
}

/**
 * Update team member role
 * @param teamId - Team ID
 * @param userId - User ID whose role to update
 * @param newRole - New role to assign
 * @param updatedBy - User ID of the person updating the role
 * @returns Update result
 */
export async function updateTeamMemberRoleAction(
  teamId: string,
  userId: string,
  newRole: "admin" | "member" | "viewer",
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check permissions
    const updaterMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, updatedBy)
      ),
    });

    if (
      !updaterMembership ||
      !["owner", "admin"].includes(updaterMembership.role)
    ) {
      return {
        success: false,
        error: "You don't have permission to update member roles",
      };
    }

    // Update the role
    await db
      .update(teamMembers)
      .set({ role: newRole })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)));

    // Get team for revalidation
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (team) {
      revalidatePath(`/team/${team.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating team member role:", error);
    return {
      success: false,
      error: "Failed to update member role",
    };
  }
}

export async function getTeamsForUser(userId: string) {
  try {
    const userTeams = await db
      .select({
        team: teams,
        role: teamMembers.role,
        memberCount: teamMembers.id,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teams.isArchived, false)));

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      userTeams.map(async (item) => {
        const memberCount = await db
          .select({ count: teamMembers.id })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, item.team.id));

        return {
          ...item.team,
          role: item.role,
          memberCount: memberCount.length,
        };
      })
    );

    return teamsWithCounts;
  } catch (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
}

export async function getTeamBySlug(slug: string, userId: string) {
  try {
    const team = await db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.slug, slug),
      with: {
        members: {
          with: {
            user: true, // This includes the user data for each member
          },
        },
        // Include other relations you need
        projects: true,
        labels: true,
      },
    });

    if (!team) {
      return null;
    }

    // Find the current user's role in this team
    const currentUserMembership = team.members.find(
      (member) => member.user.id === userId
    );

    // Return team with current user role
    return {
      ...team,
      currentUserRole: currentUserMembership?.role || null,
    };
  } catch (error) {
    console.error("Error fetching team by slug:", error);
    return null;
  }
}

// Alternative approach if you're using joins instead of Drizzle's with:
export async function getTeamBySlugWithJoins(slug: string, userId: string) {
  try {
    const team = await db
      .select({
        // Team fields
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        description: teams.description,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        // Member fields
        memberId: teamMembers.id,
        memberRole: teamMembers.role,
        memberJoinedAt: teamMembers.joinedAt,
        // User fields
        userId: users.id,
        userEmail: users.email,
        userUsername: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatarUrl: users.avatarUrl,
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teams.slug, slug));

    if (!team.length) {
      return null;
    }

    // Transform the flat result into the expected structure
    const teamData = team[0];
    const members = team
      .filter((row) => row.memberId)
      .map((row) => ({
        id: row.memberId!,
        teamId: teamData.id,
        userId: row.userId!,
        role: row.memberRole!,
        joinedAt: row.memberJoinedAt!,
        user: {
          id: row.userId!,
          email: row.userEmail!,
          username: row.userUsername,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          avatarUrl: row.userAvatarUrl,
        },
      }));

    // Find current user's role
    const currentUserMembership = members.find(
      (member) => member.user.id === userId
    );

    return {
      id: teamData.id,
      name: teamData.name,
      slug: teamData.slug,
      description: teamData.description,
      createdAt: teamData.createdAt,
      updatedAt: teamData.updatedAt,
      members,
      currentUserRole: currentUserMembership?.role || null,
    };
  } catch (error) {
    console.error("Error fetching team by slug:", error);
    return null;
  }
}

/**
 * Archive a team (soft delete)
 * @param teamId - Team ID to archive
 * @param archivedBy - User ID who is archiving the team
 * @returns Archive result
 */
export async function archiveTeamAction(
  teamId: string,
  archivedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user has permission to archive (must be owner)
    const userMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, archivedBy)
      ),
    });

    if (!userMembership || userMembership.role !== "owner") {
      return {
        success: false,
        error: "Only team owners can archive teams",
      };
    }

    // Get team details for revalidation
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    // Don't allow archiving personal teams
    if (team.isPersonal) {
      return {
        success: false,
        error: "Cannot archive personal teams",
      };
    }

    // Archive the team
    await db
      .update(teams)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    // Revalidate relevant paths
    revalidatePath("/team");
    revalidatePath(`/team/${team.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error archiving team:", error);
    return {
      success: false,
      error: "Failed to archive team",
    };
  }
}

/**
 * Update team details
 * @param teamId - Team ID to update
 * @param updateData - Data to update
 * @param updatedBy - User ID who is updating the team
 * @returns Update result
 */
export async function updateTeamAction(
  teamId: string,
  updateData: {
    name?: string;
    slug?: string;
    description?: string;
  },
  updatedBy: string
): Promise<{ success: boolean; error?: string; team?: Team }> {
  try {
    // Check if user has permission to update (must be owner or admin)
    const userMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, updatedBy)
      ),
    });

    if (!userMembership || !["owner", "admin"].includes(userMembership.role)) {
      return {
        success: false,
        error: "You don't have permission to update this team",
      };
    }

    // Get current team details
    const currentTeam = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!currentTeam) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    // Don't allow updating personal teams' core details
    if (currentTeam.isPersonal && (updateData.name || updateData.slug)) {
      return {
        success: false,
        error: "Cannot update name or slug of personal teams",
      };
    }

    // If updating slug, check if it already exists
    if (updateData.slug && updateData.slug !== currentTeam.slug) {
      const existingTeam = await db.query.teams.findFirst({
        where: eq(teams.slug, updateData.slug),
      });

      if (existingTeam) {
        return {
          success: false,
          error:
            "A team with this URL already exists. Please choose a different one.",
        };
      }
    }

    // Prepare update data
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (updateData.name !== undefined) {
      updatePayload.name = updateData.name;
    }
    if (updateData.slug !== undefined) {
      updatePayload.slug = updateData.slug;
    }
    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    // Update the team
    const [updatedTeam] = await db
      .update(teams)
      .set(updatePayload)
      .where(eq(teams.id, teamId))
      .returning();

    if (!updatedTeam) {
      return {
        success: false,
        error: "Failed to update team",
      };
    }

    // Revalidate relevant paths
    revalidatePath("/team");
    revalidatePath(`/team/${currentTeam.slug}`);

    // If slug changed, also revalidate new path
    if (updateData.slug && updateData.slug !== currentTeam.slug) {
      revalidatePath(`/team/${updatedTeam.slug}`);
    }

    return {
      success: true,
      team: updatedTeam,
    };
  } catch (error) {
    console.error("Error updating team:", error);
    return {
      success: false,
      error: "Failed to update team",
    };
  }
}

/**
 * Delete a team permanently (hard delete)
 * @param teamId - Team ID to delete
 * @param deletedBy - User ID who is deleting the team
 * @param confirmationText - Text that must match team name for confirmation
 * @returns Delete result
 */
export async function deleteTeamAction(
  teamId: string,
  deletedBy: string,
  confirmationText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user has permission to delete (must be owner)
    const userMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, deletedBy)
      ),
    });

    if (!userMembership || userMembership.role !== "owner") {
      return {
        success: false,
        error: "Only team owners can delete teams",
      };
    }

    // Get team details
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        projects: true,
      },
    });

    if (!team) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    // Don't allow deleting personal teams
    if (team.isPersonal) {
      return {
        success: false,
        error: "Cannot delete personal teams",
      };
    }

    // Verify confirmation text matches team name
    if (confirmationText !== team.name) {
      return {
        success: false,
        error: "Confirmation text does not match team name",
      };
    }

    // Check if team has active projects
    if (team.projects && team.projects.length > 0) {
      const activeProjects = team.projects.filter((p) => !p.isArchived);
      if (activeProjects.length > 0) {
        return {
          success: false,
          error: `Cannot delete team with ${activeProjects.length} active project(s). Please archive or delete all projects first.`,
        };
      }
    }

    // Delete the team - this should cascade delete all related data
    // if your database has proper foreign key constraints with CASCADE
    await db.delete(teams).where(eq(teams.id, teamId));

    // Revalidate relevant paths
    revalidatePath("/team");
    revalidatePath(`/team/${team.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting team:", error);
    return {
      success: false,
      error: "Failed to delete team",
    };
  }
}
