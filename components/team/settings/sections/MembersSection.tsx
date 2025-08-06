"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Users,
  Search,
  Mail,
  MoreVertical,
  Shield,
  Eye,
  UserCheck,
  X,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  addTeamMembersAction,
  removeTeamMemberAction,
  updateTeamMemberRoleAction,
} from "@/lib/services/teams";
import { searchUsersAction } from "@/lib/services/user-search";
import type { UserSearchResult } from "@/lib/services/user-search";
import type { TeamWithRelations, TeamRole } from "@/types";

export interface PendingTeamMember {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  isExistingUser?: boolean;
}

interface TeamMembersSectionProps {
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
  currentUserId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TeamMembersSection({
  team,
  currentUserId,
  onSuccess,
  onError,
  sectionRef,
}: TeamMembersSectionProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [pendingMembers, setPendingMembers] = useState<PendingTeamMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState<string | null>(
    null
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const canManageMembers =
    team.currentUserRole === "owner" || team.currentUserRole === "admin";

  // Search users when debounced query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearchQuery.trim() || debouncedSearchQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsersAction(debouncedSearchQuery);

        // Filter out current user and already added members
        const existingMemberIds = new Set([
          ...(team.members?.map((m) => m.id) || []),
          ...(pendingMembers.map((m) => m.id).filter(Boolean) as string[]),
        ]);
        const existingEmails = new Set([
          ...(team.members?.map((m) => m.user?.email) || []),
          ...pendingMembers.map((m) => m.email),
        ]);

        const filteredResults = results.filter(
          (user: UserSearchResult) =>
            user.id !== currentUserId &&
            !existingMemberIds.has(user.id) &&
            !existingEmails.has(user.email)
        );

        setSearchResults(filteredResults);
        setShowDropdown(
          filteredResults.length > 0 || debouncedSearchQuery.includes("@")
        );
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
        setShowDropdown(debouncedSearchQuery.includes("@"));
      } finally {
        setIsSearching(false);
      }
    };

    searchUsers();
  }, [debouncedSearchQuery, currentUserId, team.members, pendingMembers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }

      // Close member dropdown - ONLY if clicking outside any dropdown
      if (showMemberDropdown) {
        const clickedElement = event.target as Element;
        const clickedInsideDropdown =
          clickedElement.closest(".absolute") &&
          clickedElement.closest(".shadow-lg");

        if (!clickedInsideDropdown) {
          setShowMemberDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMemberDropdown]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Shield className="h-4 w-4 text-yellow-600" />;
      case "admin":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "member":
        return <Users className="h-4 w-4 text-green-600" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const addMemberFromSearch = (user: UserSearchResult): void => {
    const newMember: PendingTeamMember = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.avatarUrl || undefined,
      isExistingUser: true,
    };

    setPendingMembers((prev) => [...prev, newMember]);
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedIndex(-1);
    onError("");
  };

  const addMemberByEmail = (): void => {
    const email = searchQuery.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      onError("Please enter a valid email address");
      return;
    }

    // Check if already added
    const existingEmails = new Set([
      ...(team.members?.map((m) => m.user?.email) || []),
      ...pendingMembers.map((m) => m.email),
    ]);

    if (existingEmails.has(email)) {
      onError("This email is already added");
      return;
    }

    const newMember: PendingTeamMember = {
      email,
      isExistingUser: false,
    };

    setPendingMembers((prev) => [...prev, newMember]);
    setSearchQuery("");
    setShowDropdown(false);
    onError("");
  };

  const removePendingMember = (index: number): void => {
    setPendingMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showDropdown) return;

    const totalItems =
      searchResults.length + (searchQuery.includes("@") ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : -1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > -1 ? prev - 1 : totalItems - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          addMemberFromSearch(searchResults[selectedIndex]);
        } else if (
          selectedIndex === searchResults.length &&
          searchQuery.includes("@")
        ) {
          addMemberByEmail();
        } else if (searchQuery.includes("@")) {
          addMemberByEmail();
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const addPendingMembers = async (): Promise<void> => {
    if (pendingMembers.length === 0) return;

    try {
      const memberEmails = pendingMembers.map((m) => m.email);
      const result = await addTeamMembersAction(
        team.id,
        memberEmails,
        currentUserId
      );

      if (result.success) {
        setPendingMembers([]);
        onSuccess();
      } else {
        onError("Failed to add some members");
      }
    } catch (err) {
      onError("Failed to add members");
      console.error("Error adding members:", err);
    }
  };

  const removeExistingMember = async (
    memberId: string,
    userId: string
  ): Promise<void> => {
    try {
      const result = await removeTeamMemberAction(
        team.id,
        userId,
        currentUserId
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.error || "Failed to remove member");
      }
    } catch (err) {
      onError("Failed to remove member");
      console.error("Error removing member:", err);
    }
  };

  const updateMemberRole = async (
    userId: string,
    newRole: "admin" | "member" | "viewer"
  ): Promise<void> => {
    try {
      const result = await updateTeamMemberRoleAction(
        team.id,
        userId,
        newRole,
        currentUserId
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.error || "Failed to update member role");
      }
    } catch (err) {
      onError("Failed to update member role");
      console.error("Error updating member role:", err);
    }
  };

  return (
    <section id="members" ref={sectionRef} className="scroll-mt-6">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users size={20} />
          Team Members ({(team.members?.length || 0) + pendingMembers.length})
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Manage team members, their roles, and add new members.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* Existing Members */}
        {team.members && team.members.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Current Members
            </label>
            <div className="space-y-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {member.user?.avatarUrl ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={member.user.avatarUrl}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {member.user?.firstName?.[0]?.toUpperCase() ||
                              member.user?.email[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user?.firstName && member.user?.lastName
                          ? `${member.user?.firstName} ${member.user?.lastName}`
                          : member.user?.username || member.user?.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.user?.email}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {getRoleIcon(member.role)}
                        <span className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManageMembers &&
                    member.role !== "owner" &&
                    member.id !== currentUserId && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMemberDropdown(
                              showMemberDropdown === member.id
                                ? null
                                : member.id
                            );
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {showMemberDropdown === member.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1">
                              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Change Role
                              </div>
                              {(["admin", "member", "viewer"] as const).map(
                                (role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                      updateMemberRole(member.id, role);
                                      setShowMemberDropdown(null);
                                    }}
                                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                      member.role === role
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {getRoleIcon(role)}
                                      <span className="capitalize">{role}</span>
                                    </div>
                                  </button>
                                )
                              )}
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeExistingMember(member.id, member.id);
                                  setShowMemberDropdown(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                Remove from team
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {member.role === "owner" && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Owner
                    </span>
                  )}

                  {member.id === currentUserId && member.role !== "owner" && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Members */}
        {canManageMembers && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Members
            </label>
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() =>
                    setShowDropdown(
                      searchQuery.trim().length >= 2 ||
                        searchQuery.includes("@")
                    )
                  }
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search users or enter email address..."
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Search Dropdown */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
                >
                  {searchResults.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Existing Users
                      </div>
                      {searchResults.map((user, index) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addMemberFromSearch(user)}
                          className={`w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-100 ${
                            selectedIndex === index ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {user.avatarUrl ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={user.avatarUrl}
                                alt=""
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {user.firstName?.[0]?.toUpperCase() ||
                                    user.email[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {searchQuery.includes("@") && (
                    <>
                      {searchResults.length > 0 && (
                        <div className="border-t border-gray-200 my-1"></div>
                      )}
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Invite by Email
                      </div>
                      <button
                        type="button"
                        onClick={addMemberByEmail}
                        className={`w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-100 ${
                          selectedIndex === searchResults.length
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            Invite "{searchQuery}"
                          </p>
                          <p className="text-sm text-gray-500">
                            Send email invitation
                          </p>
                        </div>
                      </button>
                    </>
                  )}

                  {searchResults.length === 0 &&
                    !searchQuery.includes("@") &&
                    searchQuery.trim().length >= 2 &&
                    !isSearching && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No users found. Try entering an email address to send an
                        invitation.
                      </div>
                    )}
                </div>
              )}

              {/* Pending Members */}
              {pendingMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pending Members ({pendingMembers.length})
                  </label>
                  <div className="space-y-2">
                    {pendingMembers.map((member, index) => (
                      <div
                        key={`${member.email}-${index}`}
                        className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {member.avatarUrl ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={member.avatarUrl}
                                alt=""
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {member.firstName?.[0]?.toUpperCase() ||
                                    member.email[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.firstName && member.lastName
                                ? `${member.firstName} ${member.lastName}`
                                : member.username || member.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingMember(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove member"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={addPendingMembers}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add {pendingMembers.length} Member
                      {pendingMembers.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!canManageMembers && (
          <div className="text-center py-6 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500">
              You don't have permission to manage team members.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
