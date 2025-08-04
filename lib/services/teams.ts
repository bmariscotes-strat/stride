// lib/services/teams.ts
"use server";

import { db } from "@/lib/db/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bulkInviteUsersAction, getUsersByEmailsAction } from "./user-search";
import type { Team, TeamMember, User } from "@/types";

interface CreateTeamData {
  name: string;
  slug: string;
  description?: string;
  members: string[]; // Array of email addresses
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
    revalidatePath("/teams");
    revalidatePath(`/teams/${newTeam.slug}`);

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
    revalidatePath(`/teams/${team.slug}`);

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
  try {
    // Check if the remover has permission (is owner or admin)
    const removerMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, removedBy)
      ),
    });

    if (
      !removerMembership ||
      !["owner", "admin"].includes(removerMembership.role)
    ) {
      return {
        success: false,
        error: "You don't have permission to remove team members",
      };
    }

    // Can't remove the owner
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    if (memberToRemove?.role === "owner") {
      return {
        success: false,
        error: "Cannot remove the team owner",
      };
    }

    // Remove the member
    await db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    // Get team for revalidation
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (team) {
      revalidatePath(`/teams/${team.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing team member:", error);
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
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    // Get team for revalidation
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (team) {
      revalidatePath(`/teams/${team.slug}`);
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
