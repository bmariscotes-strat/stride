"use server";

import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";

// =============================================================================
// PROFILE MANAGEMENT ACTIONS
// =============================================================================

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  jobPosition?: string;
  avatarUrl?: string;
}

export async function updateUserProfile(data: Partial<UpdateProfileData>) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Only update fields that are provided
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.jobPosition !== undefined)
      updateData.jobPosition = data.jobPosition;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.clerkUserId, userId))
      .returning();

    // Only update Clerk if name fields are provided
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const clerk = await clerkClient();
      await clerk.users.updateUser(userId, {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.avatarUrl !== undefined && {
          publicMetadata: { avatarUrl: data.avatarUrl },
        }),
      });
    }

    revalidatePath("/settings");
    return { success: true, user: updatedUser[0] };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

export interface UpdateEmailData {
  email: string;
}

export async function updateUserEmail(data: UpdateEmailData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const clerk = await clerkClient();

    // Get current user and primary email
    const user = await clerk.users.getUser(userId);
    const currentPrimaryEmailId = user.primaryEmailAddressId;

    // Create new email address as verified and primary
    const newEmailAddress = await clerk.emailAddresses.createEmailAddress({
      userId,
      emailAddress: data.email,
      verified: true, // Skip verification - mark as verified
      primary: true, // Make it primary immediately
    });

    // Delete the old primary email if it exists
    if (currentPrimaryEmailId) {
      try {
        await clerk.emailAddresses.deleteEmailAddress(currentPrimaryEmailId);
      } catch (deleteError) {
        console.warn("Failed to delete old email:", deleteError);
        // Continue even if deletion fails
      }
    }

    // Update your database immediately
    await db
      .update(users)
      .set({
        email: data.email,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId));

    revalidatePath("/settings");

    return {
      success: true,
      message: "Email address updated successfully.",
    };
  } catch (error) {
    console.error("Failed to update email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update email",
    };
  }
}

// =============================================================================
// SECURITY ACTIONS
// =============================================================================

export async function getUserSessions() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const clerk = await clerkClient();
    const sessionsResponse = await clerk.sessions.getSessionList({
      userId,
    });

    return { success: true, sessions: sessionsResponse.data };
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get sessions",
    };
  }
}

export async function revokeSession(sessionId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);

    return { success: true };
  } catch (error) {
    console.error("Failed to revoke session:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke session",
    };
  }
}

export async function revokeAllSessions() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const clerk = await clerkClient();
    const sessionsResponse = await clerk.sessions.getSessionList({ userId });
    const sessions = sessionsResponse.data;

    // Get current session
    const { sessionId: currentSessionId } = await auth();

    // Revoke all sessions except the current one
    const sessionsToRevoke = sessions.filter(
      (session) => session.id !== currentSessionId
    );

    await Promise.all(
      sessionsToRevoke.map((session) =>
        clerk.sessions.revokeSession(session.id)
      )
    );

    return { success: true, revokedCount: sessionsToRevoke.length };
  } catch (error) {
    console.error("Failed to revoke all sessions:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke sessions",
    };
  }
}

// =============================================================================
// APPEARANCE ACTIONS
// =============================================================================

export interface UpdateAppearanceData {
  theme: "light" | "dark" | "system";
}

export async function updateUserAppearance(data: UpdateAppearanceData) {
  try {
    const { userId } = await auth(); // Added await here
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // You could store theme preference in your database if needed
    // await db
    //   .update(users)
    //   .set({
    //     theme: data.theme,
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(users.clerkUserId, userId));

    return { success: true, theme: data.theme };
  } catch (error) {
    console.error("Failed to update appearance:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update appearance",
    };
  }
}
