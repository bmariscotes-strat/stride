import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        },
        { status: 400 }
      );
    }

    try {
      const clerk = await clerkClient();

      // Get the user's current session to verify current password
      const user = await clerk.users.getUser(userId);

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      await clerk.users.updateUser(userId, {
        password: newPassword,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Password updated successfully",
        },
        { status: 200 }
      );
    } catch (clerkError: any) {
      console.error("Clerk error:", clerkError);

      // Handle specific Clerk errors
      if (clerkError.errors) {
        const errorMessage =
          clerkError.errors[0]?.message || "Failed to update password";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
