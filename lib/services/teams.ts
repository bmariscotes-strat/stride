// lib/services/teams.ts
"use server";

import { db } from "@/lib/db/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bulkInviteUsersAction, getUsersByEmailsAction } from "./user-search";
import { ActivityService } from "@/lib/services/activity";
import { NotificationService } from "@/lib/services/notification";
import type { Team } from "@/types";

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

    // Log team creation activity
    await ActivityService.log({
      userId: createdBy,
      actionType: "team_created",
      projectId: null,
      newValue: name,
      metadata: {
        teamId: newTeam.id,
        slug: slug,
        description: description,
      },
    });

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

          // Log each team member addition
          for (const user of existingUsers) {
            await ActivityService.logTeamMemberAdded(
              createdBy,
              null, // No specific project, this is team-level
              user.id,
              `${user.firstName} ${user.lastName}` ||
                user.username ||
                user.email,
              "member",
              newTeam.id
            );
          }

          // Mark existing users as successfully added
          existingUsers.forEach((user) => {
            invitationResults.push({
              email: user.email,
              success: true,
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

          // Log invitations sent
          for (const email of nonExistingEmails) {
            await ActivityService.log({
              userId: createdBy,
              actionType: "team_member_invited",
              projectId: null,
              newValue: email,
              metadata: {
                teamId: newTeam.id,
                teamName: newTeam.name,
                invitationType: "email",
              },
            });
          }

          invitationResults.push(...inviteResults);
        }
      } catch (inviteError) {
        console.error("Error handling member invitations:", inviteError);
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

        // Log each successful addition
        for (const user of usersToAdd) {
          await ActivityService.logTeamMemberAdded(
            invitedBy,
            null, // Team-level activity
            user.id,
            `${user.firstName} ${user.lastName}` || user.username || user.email,
            "member",
            teamId
          );

          await NotificationService.notifyTeamMemberAdded(
            invitedBy,
            teamId,
            user.id,
            user.firstName,
            "member"
          );
        }
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

      // Log invitations
      for (const email of nonExistingEmails) {
        await ActivityService.log({
          userId: invitedBy,
          actionType: "team_member_invited",
          projectId: null,
          newValue: email,
          metadata: {
            teamId: teamId,
            teamName: team.name,
            invitationType: "email",
          },
        });
      }

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

    // Step 2: Get member details before removal for activity logging
    console.log("🔍 Getting member details for activity logging...");
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)),
      with: {
        user: true,
      },
    });
    console.log("👤 Member to remove:", memberToRemove);

    if (!memberToRemove) {
      return {
        success: false,
        error: "Member not found",
      };
    }

    if (memberToRemove.role === "owner") {
      console.warn("⛔️ Attempted to remove a team owner.");
      return {
        success: false,
        error: "Cannot remove the team owner",
      };
    }

    // Step 3: Get team details for activity logging
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    // Step 4: Attempt to delete
    console.log("🗑 Attempting to delete member...");
    const deleteResult = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)));
    console.log("✅ Delete result:", deleteResult);

    // Step 5: Log the removal activity
    if (memberToRemove.user && team) {
      const memberName =
        `${memberToRemove.user.firstName} ${memberToRemove.user.lastName}`.trim() ||
        memberToRemove.user.username ||
        memberToRemove.user.email;

      await ActivityService.logTeamMemberRemoved(
        removedBy,
        null, // Team-level activity
        memberToRemove.user.id,
        memberName,
        memberToRemove.role
      );
    }

    // Step 6: Revalidate the team path
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

    // Get current member details for activity logging
    const currentMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)),
      with: {
        user: true,
      },
    });

    if (!currentMember) {
      return {
        success: false,
        error: "Member not found",
      };
    }

    const oldRole = currentMember.role;

    // Update the role
    await db
      .update(teamMembers)
      .set({ role: newRole })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, userId)));

    // Log the role change activity
    if (currentMember.user) {
      const memberName =
        `${currentMember.user.firstName} ${currentMember.user.lastName}`.trim() ||
        currentMember.user.username ||
        currentMember.user.email;

      await ActivityService.logTeamMemberRoleChanged(
        updatedBy,
        null, // Team-level activity
        currentMember.user.id,
        memberName,
        oldRole,
        newRole,
        teamId
      );

      await NotificationService.notifyTeamMemberRoleChanged(
        teamId,
        currentMember.user.id,
        oldRole,
        newRole
      );
    }

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

// ... (keeping all the existing query functions unchanged)
export async function getTeamsForUser(userId: string) {
  try {
    const userTeams = await db
      .select({
        team: teams,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teams.isArchived, false)));

    // Attach full members array to each team
    const teamsWithMembers = await Promise.all(
      userTeams.map(async (item) => {
        const members = await db
          .select({
            id: teamMembers.id,
            role: teamMembers.role,
            user: users, // assumes you have `users` table imported
          })
          .from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(eq(teamMembers.teamId, item.team.id));

        return {
          ...item.team,
          role: item.role,
          members, // full array of members with user details
        };
      })
    );

    return teamsWithMembers;
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
            user: true,
          },
        },
        projects: {
          // This now refers to the projectTeams junction table
          with: {
            project: true, // Get the actual project data through the junction
          },
          where: (pt, { eq }) => {
            // If you want to filter by project status, you'd need to join
            // For now, we'll filter in the transformation step below
            return undefined; // Remove this line if not filtering at query level
          },
        },
      },
    });

    if (!team) {
      return null;
    }

    // Find the current user's role in this team
    const currentUserMembership = team.members.find(
      (member) => member.user.id === userId
    );

    // Transform the projects data to get actual project objects
    const projectsData = team.projects
      .filter((projectTeam) => !projectTeam.project.isArchived) // Filter out archived projects
      .map((projectTeam) => ({
        ...projectTeam.project, // Spread the actual project properties
        teamRole: projectTeam.role, // Include the team's role in this project
        addedAt: projectTeam.createdAt, // When this team was added to the project
      }));

    // Return team with current user role and properly mapped projects
    return {
      ...team,
      projects: projectsData, // Replace the junction data with actual project data
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

    // Get team details for revalidation and logging
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

    // Log the team archival
    await ActivityService.log({
      userId: archivedBy,
      actionType: "team_archived",
      projectId: null,
      oldValue: team.name,
      metadata: {
        teamId: team.id,
        slug: team.slug,
        archivedAt: new Date().toISOString(),
      },
    });

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

    if (updateData.name !== null) {
      updatePayload.name = updateData.name;
    }
    if (updateData.slug !== null) {
      updatePayload.slug = updateData.slug;
    }
    if (updateData.description !== null) {
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

    // Log team update activities for changed fields
    const changes = [];
    if (updateData.name && updateData.name !== currentTeam.name) {
      changes.push({
        field: "name",
        oldValue: currentTeam.name,
        newValue: updateData.name,
      });
    }
    if (updateData.slug && updateData.slug !== currentTeam.slug) {
      changes.push({
        field: "slug",
        oldValue: currentTeam.slug,
        newValue: updateData.slug,
      });
    }
    if (updateData.description !== currentTeam.description) {
      changes.push({
        field: "description",
        oldValue: currentTeam.description || "",
        newValue: updateData.description || "",
      });
    }

    // Log each change
    for (const change of changes) {
      await ActivityService.log({
        userId: updatedBy,
        actionType: "team_updated",
        projectId: null,
        oldValue: String(change.oldValue),
        newValue: String(change.newValue),
        metadata: {
          teamId: updatedTeam.id,
          field: change.field,
          teamName: updatedTeam.name,
        },
      });
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

    // Get team details with proper project relationships
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        projects: {
          // This gets projectTeams records
          with: {
            project: true, // Get the actual project data
          },
        },
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

    // Check if team has active projects - need to access through junction table
    if (team.projects && team.projects.length > 0) {
      // Extract actual projects from the junction table and filter archived ones
      const activeProjects = team.projects
        .map((pt) => pt.project) // Get the actual project from projectTeam
        .filter((project) => !project.isArchived); // Now we can access isArchived

      if (activeProjects.length > 0) {
        return {
          success: false,
          error: `Cannot delete team with ${activeProjects.length} active project(s). Please archive or delete all projects first.`,
        };
      }
    }

    // Log the team deletion before actually deleting it
    await ActivityService.log({
      userId: deletedBy,
      actionType: "team_deleted",
      projectId: null,
      oldValue: team.name,
      metadata: {
        teamId: team.id,
        slug: team.slug,
        deletedAt: new Date().toISOString(),
        confirmationText: confirmationText,
      },
    });

    // Delete the team - this should cascade delete all related data
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
