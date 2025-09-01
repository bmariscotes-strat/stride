// lib/services/user-search.ts
"use server";

import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { like, or, eq, and, ne } from "drizzle-orm";
import { clerkClient } from "@clerk/clerk-sdk-node";
import type { User } from "@/types";

export interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string | null;
}

interface InviteUserData {
  email: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
}

/**
 * Search for users by name, username, or email
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of user search results
 */
export async function searchUsersAction(
  query: string,
  limit: number = 10
): Promise<UserSearchResult[]> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    // Search in our database
    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        or(
          like(users.firstName, searchTerm),
          like(users.lastName, searchTerm),
          like(users.username, searchTerm),
          like(users.email, searchTerm)
        )
      )
      .limit(limit);

    return foundUsers;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

/**
 * Get users by email addresses
 * @param emails - Array of email addresses
 * @returns Array of users
 */
export async function getUsersByEmailsAction(
  emails: string[]
): Promise<User[]> {
  try {
    if (!emails || emails.length === 0) {
      return [];
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(or(...emails.map((email) => eq(users.email, email))));

    return foundUsers;
  } catch (error) {
    console.error("Error getting users by emails:", error);
    return [];
  }
}

/**
 * Send invitation to user via Clerk
 * @param inviteData - Invitation data
 * @returns Success status and invitation ID
 */
export async function inviteUserToTeamAction(
  inviteData: InviteUserData
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    const { email, teamId, teamName, invitedBy } = inviteData;

    // Check if user already exists in our system
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      // Pending email system integration here. For now, a console.
      console.log(`User ${email} already exists, adding to team directly`);
    }

    // Send Clerk invitation
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/team/${teamId}/accept-invitation`,
      publicMetadata: {
        teamId,
        teamName,
        invitedBy,
      },
    });

    return {
      success: true,
      invitationId: invitation.id,
    };
  } catch (error) {
    console.error("Error sending invitation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}

/**
 * Bulk invite users to team
 * @param emails - Array of email addresses
 * @param teamId - Team ID
 * @param teamName - Team name
 * @param invitedBy - User ID of the inviter
 * @returns Array of invitation results
 */
export async function bulkInviteUsersAction(
  emails: string[],
  teamId: string,
  teamName: string,
  invitedBy: string
): Promise<
  Array<{
    email: string;
    success: boolean;
    invitationId?: string;
    error?: string;
  }>
> {
  const results = [];

  for (const email of emails) {
    try {
      const result = await inviteUserToTeamAction({
        email,
        teamId,
        teamName,
        invitedBy,
      });

      results.push({
        email,
        ...result,
      });
    } catch (error) {
      results.push({
        email,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send invitation",
      });
    }
  }

  return results;
}

/**
 * Check if email is already invited or is a team member
 * @param email - Email to check
 * @param teamId - Team ID
 * @returns Status object
 */
export async function checkEmailStatusAction(
  email: string,
  teamId: string
): Promise<{
  isExistingUser: boolean;
  isTeamMember: boolean;
  isPendingInvitation: boolean;
}> {
  try {
    // Check if user exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    let isTeamMember = false;
    if (existingUser) {
      // Check if user is already a team member
      const teamMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(users.id, existingUser.id),
          eq(users.id, teamId) // You'll need to adjust this query based on your schema
        ),
      });
      isTeamMember = !!teamMember;
    }

    let isPendingInvitation = false;

    return {
      isExistingUser: !!existingUser,
      isTeamMember,
      isPendingInvitation,
    };
  } catch (error) {
    console.error("Error checking email status:", error);
    return {
      isExistingUser: false,
      isTeamMember: false,
      isPendingInvitation: false,
    };
  }
}

/**
 * Advanced user search with filters
 * @param query - Search query
 * @param excludeUserIds - User IDs to exclude from search
 * @param excludeEmails - Emails to exclude from search
 * @param limit - Maximum results
 * @returns Filtered search results
 */
export async function advancedUserSearchAction(
  query: string,
  options: {
    excludeUserIds?: string[];
    excludeEmails?: string[];
    limit?: number;
  } = {}
): Promise<UserSearchResult[]> {
  try {
    const { excludeUserIds = [], excludeEmails = [], limit = 10 } = options;

    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    let whereConditions = [
      or(
        like(users.firstName, searchTerm),
        like(users.lastName, searchTerm),
        like(users.username, searchTerm),
        like(users.email, searchTerm)
      ),
    ];

    // Exclude specific user IDs
    if (excludeUserIds.length > 0) {
      whereConditions.push(
        and(...excludeUserIds.map((id) => ne(users.id, id)))
      );
    }

    // Exclude specific emails
    if (excludeEmails.length > 0) {
      whereConditions.push(
        and(...excludeEmails.map((email) => ne(users.email, email)))
      );
    }

    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(and(...whereConditions))
      .limit(limit);

    return foundUsers;
  } catch (error) {
    console.error("Error in advanced user search:", error);
    return [];
  }
}
