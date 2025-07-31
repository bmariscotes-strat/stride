// contexts/UserContext.tsx
"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserData } from "@/hooks/useUserData";
import type { User } from "@/types";

interface UserContextValue {
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

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
  enableLogging?: boolean;
  fallbackToClerk?: boolean;
}

export function UserProvider({
  children,
  enableLogging = false,
  fallbackToClerk = true,
}: UserProviderProps) {
  const userDataHook = useUserData({ enableLogging, fallbackToClerk });

  return (
    <UserContext.Provider value={userDataHook}>{children}</UserContext.Provider>
  );
}

// Custom hook to use the user context
export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }

  return context;
}

// Optional: Individual hooks for specific data
export function useCurrentUser() {
  const { userData, clerkUser } = useUserContext();
  return userData || clerkUser;
}

export function useDisplayName() {
  const { displayName } = useUserContext();
  return displayName;
}

export function useUserLoading() {
  const { loading } = useUserContext();
  return loading;
}
