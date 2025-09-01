"use client";
import React, { useState, useEffect, useRef } from "react";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import { Users, Settings, Info, Plus, X, Search, Mail } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { createTeamAction } from "@/lib/services/teams";
import {
  searchUsersAction,
  inviteUserToTeamAction,
} from "@/lib/services/user-search";
import type { UserSearchResult } from "@/lib/services/user-search";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import UserAvatar from "@/components/shared/UserAvatar";
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";

// TypeScript interfaces
interface TeamSettings {
  isPrivate: boolean;
  allowMemberInvites: boolean;
  requireApproval: boolean;
}

interface TeamMember {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string | null;
  isExistingUser: boolean;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  members: TeamMember[];
  settings: TeamSettings;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export default function CreateTeamPage() {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();

  // Use userData if available, otherwise fall back to clerkUser
  const currentUser = userData || clerkUser;
  const currentUserId = userData?.id || clerkUser?.id;

  const [activeSection, setActiveSection] = useState<string>("information");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    members: [],
    settings: {
      isPrivate: false,
      allowMemberInvites: true,
      requireApproval: false,
    },
  });

  // User search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Refs
  const informationRef = useRef<HTMLElement>(null);
  const membersRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const isMobile = useMediaQuery("(max-width: 640px)");

  // Handle scroll to update active section
  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: "-20% 0px -80% 0px",
      threshold: 0,
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    if (informationRef.current) observer.observe(informationRef.current);
    if (membersRef.current) observer.observe(membersRef.current);
    if (settingsRef.current) observer.observe(settingsRef.current);

    return () => observer.disconnect();
  }, []);

  // Success toasts
  useEffect(() => {
    if (success) {
      toast.success("Team created successfully. You will soon be redirected.");
    }
    if (error) {
      toast.error(error);
    }
  }, [success, error]);

  // Auto-generate slug from name
  useEffect(() => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    setFormData((prev) => ({ ...prev, slug }));
  }, [formData.name]);

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
        const filteredResults = results.filter(
          (user: UserSearchResult) =>
            user.id !== currentUserId &&
            !formData.members.some(
              (member) => member.email === user.email || member.id === user.id
            )
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
  }, [debouncedSearchQuery, currentUserId, formData.members]);

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (
    field: keyof Omit<FormData, "settings" | "members">,
    value: string
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingChange = (
    setting: keyof TeamSettings,
    value: boolean
  ): void => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [setting]: value },
    }));
  };

  const addMemberFromSearch = (user: UserSearchResult): void => {
    const newMember: TeamMember = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isExistingUser: true,
    };

    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    setSearchQuery("");
    setShowDropdown(false);
    setSelectedIndex(-1);
    setError("");
  };

  const addMemberByEmail = (): void => {
    const email = searchQuery.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check if already added
    if (formData.members.some((member) => member.email === email)) {
      setError("This email is already added");
      return;
    }

    const newMember: TeamMember = {
      email,
      isExistingUser: false,
    };

    setFormData((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    setSearchQuery("");
    setShowDropdown(false);
    setError("");
  };

  const removeMember = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
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

  const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navigateToTeam = (slug: string) => {
    router.push(`/team/${slug}`);
  };

  const navigateBack = () => {
    router.back();
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!currentUserId) {
      setError("You must be logged in to create a team");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      // Create the team first
      const result = await createTeamAction({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        members: formData.members.map((m) => m.email), // Keep backward compatibility
        createdBy: currentUserId,
      });

      if (result.success && result.team) {
        // Send invitations for each member
        const invitationPromises = formData.members.map(async (member) => {
          try {
            if (member.isExistingUser && member.id) {
              console.log(`Adding existing user ${member.email} to team`);
            } else {
              // For non-existing users, send Clerk invitation
              await inviteUserToTeamAction({
                email: member.email,
                teamId: result.team.id,
                teamName: result.team.name,
                invitedBy: currentUserId,
              });
            }
          } catch (inviteError) {
            console.error(`Failed to invite ${member.email}:`, inviteError);
            // Don't fail the entire process for individual invitation failures
          }
        });

        await Promise.allSettled(invitationPromises);

        setSuccess(true);

        // Reset form after success
        setFormData({
          name: "",
          slug: "",
          description: "",
          members: [],
          settings: {
            isPrivate: false,
            allowMemberInvites: true,
            requireApproval: false,
          },
        });

        // Redirect to the newly created team page after a short delay
        setTimeout(() => {
          navigateToTeam(result.team.slug);
        }, 2000);
      } else {
        throw new Error("Failed to create team");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error creating team:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigationItems: NavigationItem[] = [
    { id: "information", label: "Information", icon: Info },
    { id: "members", label: "Members", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Show loading if user is not loaded yet
  if (loading || !currentUserId) {
    return (
      <DualPanelLayout
        left={
          <div className="p-4">
            <AppBreadcrumb />
          </div>
        }
        right={
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <DualPanelLayout
      left={
        <>
          <AppBreadcrumb />
          <h2 className="font-bold text-lg pt-2">Create Team</h2>
          <nav className="mt-4">
            <ul className="space-y-1">
              {navigationItems.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      activeSection === id
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      }
      right={
        <div className="p-1 sm:p-1 md:p-6 lg:p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Information Section */}
            <section
              id="information"
              ref={informationRef}
              className="scroll-mt-6"
            >
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Info size={20} />
                  Team Information
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 ">
                  Basic details about your team.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-500"
                  >
                    Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("name", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    placeholder="Enter team name"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label
                    htmlFor="teamSlug"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-500"
                  >
                    Team URL Slug *
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 dark:bg-gray-800 bg-gray-50 text-gray-500 text-sm">
                      {isMobile ? "teams/" : "stride-pm.app/teams/"}
                    </span>
                    <input
                      type="text"
                      id="teamSlug"
                      value={formData.slug}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("slug", e.target.value)
                      }
                      className="flex-1 block w-full rounded-none rounded-r-md  dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      placeholder="team-url"
                      required
                      pattern="[a-z0-9-]+"
                      title="Only lowercase letters, numbers, and hyphens are allowed"
                      maxLength={50}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Only lowercase letters, numbers, and hyphens. This will be
                    your team's URL.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-500"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      handleInputChange("description", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    placeholder="What's this team about?"
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>
            </section>

            {/* Members Section */}
            <section id="members" ref={membersRef} className="scroll-mt-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users size={20} />
                  Team Members
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Search for existing users or invite people by email. They will
                  automatically join the team.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-500 mb-2">
                    Add Members
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
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-800 dark:bg-gray-800 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search users' email address..."
                      />
                      {isSearching && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search Dropdown */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
                    >
                      {searchResults.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">
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
                                  <UserAvatar
                                    name={
                                      [user?.firstName, user?.lastName]
                                        .filter(Boolean)
                                        .join(" ") ||
                                      user?.email ||
                                      "Unknown"
                                    }
                                    src={user?.avatarUrl}
                                    size="32"
                                    useContext={false}
                                    className="h-8 w-8"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                                  {user.firstName && user.lastName
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.username}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
                            No users found. Try entering an email address to
                            send an invitation.
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {formData.members.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-500 mb-2">
                      Added Members ({formData.members.length})
                    </label>
                    <div className="space-y-2">
                      {formData.members.map((member, index) => (
                        <div
                          key={`${member.email}-${index}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
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
                                <UserAvatar
                                  name={
                                    [member?.firstName, member?.lastName]
                                      .filter(Boolean)
                                      .join(" ") ||
                                    member?.email ||
                                    "Unknown"
                                  }
                                  src={member?.avatarUrl}
                                  size="32"
                                  useContext={false}
                                  className="h-8 w-8"
                                />
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
                              {!member.isExistingUser && (
                                <p className="text-xs text-blue-600">
                                  Will receive email invitation
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMember(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Remove member"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Settings Section */}
            <section id="settings" ref={settingsRef} className="scroll-mt-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings size={20} />
                  Team Settings
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure how your team operates. You can change these
                  settings later.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="isPrivate"
                        type="checkbox"
                        checked={formData.settings.isPrivate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleSettingChange("isPrivate", e.target.checked)
                        }
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300  dark:border-gray-700rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label
                        htmlFor="isPrivate"
                        className="font-medium text-gray-700 dark:text-gray-500"
                      >
                        Private Team
                      </label>
                      <p className="text-gray-500">
                        Only invited members can see and join this team.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="allowMemberInvites"
                        type="checkbox"
                        checked={formData.settings.allowMemberInvites}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleSettingChange(
                            "allowMemberInvites",
                            e.target.checked
                          )
                        }
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-700 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label
                        htmlFor="allowMemberInvites"
                        className="font-medium text-gray-700"
                      >
                        Allow Member Invites
                      </label>
                      <p className="text-gray-500">
                        Team members can invite others to join the team.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="requireApproval"
                        type="checkbox"
                        checked={formData.settings.requireApproval}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleSettingChange(
                            "requireApproval",
                            e.target.checked
                          )
                        }
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-700 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label
                        htmlFor="requireApproval"
                        className="font-medium text-gray-700"
                      >
                        Require Approval for New Members
                      </label>
                      <p className="text-gray-500">
                        New member requests must be approved by team admins.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={navigateBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300  dark:border-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !formData.name.trim() ||
                    !formData.slug.trim()
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating Team...
                    </>
                  ) : (
                    "Create Team"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      }
    />
  );
}
