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

export async function updateUserProfile(data: UpdateProfileData) {
  try {
    const { userId } = await auth(); // Added await here
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Update in our database
    const updatedUser = await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        jobPosition: data.jobPosition,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId))
      .returning();

    // Update in Clerk
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
    });

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
    const { userId } = await auth(); // Added await here
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Update in Clerk (this will trigger email verification)
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, {
      primaryEmailAddressID: undefined, // Let Clerk handle email verification
    });

    // Create new email address in Clerk
    await clerk.emailAddresses.createEmailAddress({
      userId,
      emailAddress: data.email,
    });

    return { success: true, message: "Verification email sent" };
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
    const { userId } = await auth(); // Added await here
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
    const { userId } = await auth(); // Added await here
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
    const { userId } = await auth(); // Added await here
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const clerk = await clerkClient();
    const sessionsResponse = await clerk.sessions.getSessionList({ userId });
    const sessions = sessionsResponse.data;

    // Revoke all sessions except the current one
    const currentSession = sessions.find(
      (session) => session.status === "active"
    );
    const sessionsToRevoke = sessions.filter(
      (session) => session.id !== currentSession?.id
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
