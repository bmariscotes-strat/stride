"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ChevronDown, Activity } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { useUserContext, useUserLoading } from "@/contexts/UserContext";
import UserAvatar from "@/components/shared/UserAvatar";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Context values
  const { clerkUser, error, refetch } = useUserContext();
  const loading = useUserLoading();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSettings = () => {
    console.log("⚙️ Settings clicked");
    setIsOpen(false);
  };

  const handleActivity = () => {
    router.push("/activity");
  };

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 text-red-600">
        <span className="text-sm">Error loading user</span>
        <button
          onClick={refetch}
          className="text-xs underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (loading && !clerkUser) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2">
        <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors duration-200"
      >
        <UserAvatar size="28" showName={true} />
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {/* Settings Link */}
            <button
              onClick={handleSettings}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            >
              <Settings className="w-4 h-4 mr-3 text-gray-500" />
              Settings
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 my-1" />

            <button
              onClick={handleActivity}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            >
              <Activity className="w-4 h-4 mr-3 text-gray-500" />
              Activity
            </button>

            <div className="border-t border-gray-100 my-1" />

            {/* Logout Link */}
            <SignOutButton>
              <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150">
                <LogOut className="w-4 h-4 mr-3 text-red-500" />
                Logout
              </button>
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  );
}
