/*
 * Webhook for Clerk & Neon DB - Fixed Version
 */

import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Define types for Clerk webhook data
interface ClerkUserData {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
    verification?: {
      status: string;
    };
  }>;
  primary_email_address_id?: string;
}

// Type for deleted user data (has different structure)
interface ClerkDeletedUserData {
  id: string;
  object: "user";
  deleted: boolean;
}

// Type for email data
interface ClerkEmailData {
  id: string;
  email_address: string;
  verification?: {
    status: string;
  };
  object: "email_address";
}

/**
 * POST Webhook Handler - Verifies and Processes Clerk Webhook Events
 */
export async function POST(req: Request) {
  console.log("🔵 Webhook received");

  try {
    // Get the headers - await the promise and extract header values properly
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    console.log("🔵 Headers extracted:", {
      svix_id,
      svix_timestamp,
      svix_signature: svix_signature
        ? `${svix_signature.substring(0, 20)}...`
        : null, // Log partial signature for debugging
      svix_signature_length: svix_signature?.length,
    });

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.log("❌ Missing svix headers", {
        missing_id: !svix_id,
        missing_timestamp: !svix_timestamp,
        missing_signature: !svix_signature,
      });
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    // Get the body
    const payload = await req.text();
    console.log("🔵 Payload received, length:", payload.length);

    // Get the Webhook secret
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.log("❌ Missing CLERK_WEBHOOK_SECRET");
      return new Response(
        "Please add CLERK_WEBHOOK_SECRET to your environment variable",
        {
          status: 500,
        }
      );
    }

    console.log("🔵 Webhook secret found, length:", WEBHOOK_SECRET.length);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      console.log("🔵 Attempting to verify webhook...");

      console.log("🔵 Raw payload preview:", payload.substring(0, 200) + "...");

      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;

      console.log("✅ Webhook verified successfully");
    } catch (err: any) {
      console.error("❌ Error verifying webhook:", {
        error: err.message,
        name: err.name,
        // Log headers again for debugging
        headers: {
          svix_id,
          svix_timestamp,
          svix_signature_exists: !!svix_signature,
          svix_signature_type: typeof svix_signature,
        },
      });

      // More detailed error logging for ngrok issues
      if (err.message?.includes("signature")) {
        console.log(
          "🔍 Signature verification failed - this might be an ngrok issue"
        );
        console.log(
          "🔍 Try regenerating your webhook secret in Clerk dashboard"
        );
        console.log("🔍 Ensure ngrok is forwarding headers correctly");
      }

      return new Response("Error occurred during verification", {
        status: 400,
      });
    }

    // Handle the webhook
    const eventType = evt.type;
    console.log("🔵 Processing event type:", eventType);

    try {
      switch (eventType) {
        case "user.created":
          console.log("🔵 Handling user.created");
          await handleUserCreated(evt.data as ClerkUserData);
          break;
        case "user.updated":
          console.log("🔵 Handling user.updated");
          await handleUserUpdated(evt.data as ClerkUserData);
          break;
        case "user.deleted":
          console.log("🔵 Handling user.deleted");
          await handleUserDeleted(evt.data as ClerkDeletedUserData);
          break;
        case "email.created":
          console.log("🔵 Handling email.created");
          await handleEmailUpdated(evt.data as unknown as ClerkEmailData);
          break;
        default:
          console.log(`🔵 Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`❌ Error handling webhook ${eventType}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(
        `Error occurred while processing webhook: ${errorMessage}`,
        {
          status: 500,
        }
      );
    }

    console.log("✅ Webhook processed successfully");
    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("❌ Unexpected error in webhook:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(`Unexpected error: ${errorMessage}`, {
      status: 500,
    });
  }
}

/**
 * Create: Create user
 */
async function handleUserCreated(userData: ClerkUserData) {
  try {
    console.log("🔵 Creating user with ID:", userData.id);

    // Get primary email
    const primaryEmail =
      userData.email_addresses.find(
        (email) => email.id === userData.primary_email_address_id
      ) || userData.email_addresses[0];

    if (!primaryEmail) {
      throw new Error("No email address found for user");
    }

    const result = await db
      .insert(users)
      .values({
        clerkUserId: userData.id,
        username: userData.username || "",
        firstName: userData.first_name || "",
        lastName: userData.last_name || "",
        email: primaryEmail.email_address,
      })
      .returning();

    console.log("✅ User created in database:", result[0]?.clerkUserId);
  } catch (error) {
    console.error("❌ Database error creating user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Database error";
    throw new Error(`Failed to create user: ${errorMessage}`);
  }
}

/**
 * Update: Update user data
 */
async function handleUserUpdated(userData: ClerkUserData) {
  try {
    console.log("🔵 Updating user:", userData.id);

    // Get primary email
    const primaryEmail =
      userData.email_addresses.find(
        (email) => email.id === userData.primary_email_address_id
      ) || userData.email_addresses[0];

    if (!primaryEmail) {
      console.log("⚠️ No email address found for user update");
      return;
    }

    const result = await db
      .update(users)
      .set({
        username: userData.username || "",
        firstName: userData.first_name || "",
        lastName: userData.last_name || "",
        email: primaryEmail.email_address,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userData.id))
      .returning();

    console.log(`✅ User updated in database:`, result[0]?.clerkUserId);
  } catch (error) {
    console.error("❌ Error updating user in database:", error);
    throw error;
  }
}

/**
 * Delete: Delete user data
 */
async function handleUserDeleted(userData: ClerkDeletedUserData) {
  try {
    console.log("🔵 Deleting user:", userData.id);

    const result = await db
      .delete(users)
      .where(eq(users.clerkUserId, userData.id))
      .returning();

    console.log(
      `✅ User deleted from database:`,
      result[0]?.clerkUserId || "User not found"
    );
  } catch (error) {
    console.error("❌ Error deleting user from database:", error);
    throw error;
  }
}

/**
 * Handle email updates - sync primary email changes to database
 */
async function handleEmailUpdated(emailData: ClerkEmailData) {
  try {
    console.log("🔵 Handling email update:", emailData.id);

    // We need to get the user ID from Clerk to update the correct user
    // This requires making an API call to Clerk to find which user owns this email
    // For now, we'll skip this as it would require additional Clerk API calls
    // The user.updated event should handle email changes when the primary email changes

    console.log(
      "🔵 Email update handled (no action needed - will be handled by user.updated)"
    );
  } catch (error) {
    console.error("❌ Error handling email update:", error);
    throw error;
  }
}
