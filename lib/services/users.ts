"use server";

import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import type { User, CreateUser } from "@/types";

/**
 * Get a user by ID
 * @param userId string - user UUID
 * @returns user object or null if not found
 */
export async function getUserById(clerkUserId: string): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.clerkUserId, clerkUserId),
    });

    return user || null;
  } catch (error) {
    console.error("Error fetching user by Clerk ID:", error);
    return null;
  }
}

/**
 * Get a user by Clerk ID
 * @param clerkId string - Clerk user ID
 * @returns user object or null if not found
 */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.clerkUserId, clerkId),
    });

    return user || null;
  } catch (error) {
    console.error("Error fetching user by Clerk ID:", error);
    return null;
  }
}

/**
 * Get user by email
 * @param email string - user email
 * @returns user object or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });

    return user || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

/**
 * Get user by username
 * @param username string - username
 * @returns user object or null if not found
 */
export async function getUserByUsername(
  username: string
): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.username, username),
    });

    return user || null;
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return null;
  }
}

/**
 * Generate a unique username from email or name
 * @param email string
 * @param firstName string
 * @param lastName string
 * @returns unique username
 */
async function generateUniqueUsername(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<string> {
  // Try email prefix first
  let baseUsername = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  // If no valid characters, use name
  if (!baseUsername) {
    baseUsername = `${firstName || ""}${lastName || ""}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  // Fallback to "user" if still empty
  if (!baseUsername) {
    baseUsername = "user";
  }

  let username = baseUsername;
  let counter = 1;

  // Keep trying until we find a unique username
  while (await getUserByUsername(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
}

/**
 * Create or update user from Clerk data
 * @param clerkUser - Clerk user object
 * @returns user object or null if error
 */
export async function createOrUpdateUser(
  clerkUser: ClerkUser
): Promise<User | null> {
  try {
    // Check if user already exists
    const existingUser = await getUserByClerkId(clerkUser.id);

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const firstName = clerkUser.firstName || "";
    const lastName = clerkUser.lastName || "";
    const avatarUrl = clerkUser.imageUrl || null;

    if (existingUser) {
      // Update existing user
      const updateData = {
        email,
        firstName,
        lastName,
        avatarUrl,
      };

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, clerkUser.id))
        .returning();

      return updatedUser;
    } else {
      // Generate unique username
      const username = await generateUniqueUsername(email, firstName, lastName);

      // Create new user
      const newUserData: CreateUser = {
        clerkUserId: clerkUser.id,
        email,
        username,
        firstName,
        lastName,
        avatarUrl,
      };

      const [newUser] = await db.insert(users).values(newUserData).returning();

      return newUser;
    }
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return null;
  }
}

/**
 * Update user profile
 * @param userId string - user ID
 * @param updateData - partial user data to update
 * @returns updated user or null if error
 */
export async function updateUserProfile(
  userId: string,
  updateData: Partial<
    Pick<User, "firstName" | "lastName" | "username" | "avatarUrl">
  >
): Promise<User | null> {
  try {
    // If updating username, check if it's unique
    if (updateData.username) {
      const existingUser = await getUserByUsername(updateData.username);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("Username already taken");
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser || null;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}

/**
 * Get current authenticated user
 * @returns user object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const authResult = await auth();
    const { userId } = authResult;

    if (!userId) {
      return null;
    }

    let user = await getUserByClerkId(userId);

    // If user doesn't exist in our database, create it
    if (!user) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        user = await createOrUpdateUser(clerkUser);
      }
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Get current user with error throwing (for cases where user must exist)
 * @returns user object
 * @throws Error if user not found or not authenticated
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated or not found");
  }

  return user;
}

/**
 * Sync Clerk user with database
 * Called from webhooks or when user data changes
 */
export async function syncUserWithClerk(): Promise<User | null> {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    return await createOrUpdateUser(clerkUser);
  } catch (error) {
    console.error("Error syncing user with Clerk:", error);
    return null;
  }
}

/**
 * Delete user (soft delete by setting isArchived flag if you add it, or hard delete)
 * @param userId string - user ID
 * @returns boolean indicating success
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    await db.delete(users).where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

/**
 * Search users by name or username
 * @param query string - search query
 * @param limit number - maximum results to return
 * @returns array of users
 */
export async function searchUsers(
  query: string,
  limit: number = 10
): Promise<User[]> {
  try {
    const searchTerm = `%${query.toLowerCase()}%`;

    const foundUsers = await db
      .select()
      .from(users)
      .where(
        // You might want to add ilike support or use raw SQL for better search
        // For now, this is a basic approach
        eq(users.username, query)
      )
      .limit(limit);

    return foundUsers;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

/**
 * Check if username is available
 * @param username string
 * @param excludeUserId string - optional user ID to exclude from check
 * @returns boolean indicating availability
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  try {
    const existingUser = await getUserByUsername(username);

    if (!existingUser) {
      return true;
    }

    // If excluding a user ID, check if the existing user is the excluded one
    if (excludeUserId && existingUser.id === excludeUserId) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking username availability:", error);
    return false;
  }
}
