// lib\utils\get-current-user.ts
// Helper function to get current user

import { getCurrentUser } from "@/lib/services/users";
import { unstable_noStore as noStore } from "next/cache";

export async function getRequiredUserId(): Promise<string> {
  noStore();

  const user = await getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    throw new Error("User ID is required but not found.");
  }

  return userId;
}
