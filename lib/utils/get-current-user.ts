import { getCurrentUser } from "@/lib/services/users";

export async function getRequiredUserId(): Promise<string> {
  const user = await getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    throw new Error("User ID is required but not found.");
  }

  return userId;
}
