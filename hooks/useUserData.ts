// hooks/useUserData.ts
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserByClerkId } from "@/lib/services/users";
import type { User } from "@/types";

interface UseUserDataOptions {
  enableLogging?: boolean;
  fallbackToClerk?: boolean;
}

interface UseUserDataReturn {
  // Data
  userData: User | null;
  clerkUser: ReturnType<typeof useUser>["user"];

  // Computed values
  displayName: string;
  displayEmail: string;
  avatarUrl: string;

  // States
  loading: boolean;
  error: Error | null;

  // Methods
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useUserData(
  options: UseUserDataOptions = {}
): UseUserDataReturn {
  const { enableLogging = false, fallbackToClerk = true } = options;

  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get Clerk user
  const { user: clerkUser } = useUser();

  // Fetch function that can be reused
  const fetchUserData = async () => {
    if (!clerkUser?.id) {
      if (enableLogging)
        console.log("❌ No Clerk user ID found, skipping fetch");
      setLoading(false);
      return;
    }

    if (enableLogging) {
      console.log("🔄 Starting user data fetch");
      console.log("📋 Clerk User:", clerkUser);
      console.log("🆔 Fetching user with ID:", clerkUser.id);
    }

    setLoading(true);
    setError(null);

    try {
      const user = await getUserByClerkId(clerkUser.id);

      if (enableLogging) {
        console.log("✅ Successfully fetched user data:", user);
        console.log("📊 User data breakdown:", {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
        });
      }

      setUserData(user);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch user data");
      setError(error);

      if (enableLogging) {
        console.error("💥 Error fetching user data:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUserData();
  }, [clerkUser?.id]);

  // Computed display values
  const displayName = userData
    ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
      userData.username ||
      "Unknown User"
    : fallbackToClerk
    ? clerkUser?.fullName || clerkUser?.username || "User"
    : "User";

  const displayEmail =
    userData?.email ||
    (fallbackToClerk ? clerkUser?.primaryEmailAddress?.emailAddress || "" : "");

  const avatarUrl = userData?.avatarUrl || "";

  if (enableLogging) {
    console.log("🖥️ Display Values:", {
      displayName,
      displayEmail,
      avatarUrl,
      usingUserData: !!userData,
      usingClerkData: !userData && !!clerkUser && fallbackToClerk,
      loading,
      error: error?.message,
    });
  }

  return {
    // Data
    userData,
    clerkUser,

    // Computed values
    displayName,
    displayEmail,
    avatarUrl,

    // States
    loading,
    error,

    // Methods
    refetch: fetchUserData,
    clearError: () => setError(null),
  };
}
