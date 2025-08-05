"use client";
import React, { useState, useEffect, useRef } from "react";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import {
  Info,
  Settings,
  Trash2,
  AlertTriangle,
  X,
  Users,
  Search,
  Mail,
  MoreVertical,
  Shield,
  Eye,
  UserCheck,
} from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import {
  updateTeamAction,
  deleteTeamAction,
  archiveTeamAction,
  addTeamMembersAction,
  removeTeamMemberAction,
  updateTeamMemberRoleAction,
} from "@/lib/services/teams";
import {
  searchUsersAction,
  inviteUserToTeamAction,
} from "@/lib/services/user-search";
import type { UserSearchResult } from "@/lib/services/user-search";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  TeamSettings,
  NavigationItem,
  InviteFormMember,
  TeamMemberWithRelations,
  TeamWithRelations,
  Team,
  TeamRole,
  TeamMember,
} from "@/types";

// TypeScript interfaces

interface FormData {
  name: string;
  slug: string;
  description: string;
  settings: TeamSettings;
}

type UpdateTeamPageProps = {
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
};

export interface PendingTeamMember {
  // For existing users
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  isExistingUser?: boolean;
  // For email-only invites, most fields will be undefined
}

export default function UpdateTeamPage({ team }: UpdateTeamPageProps) {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();

  // Early return if team is not loaded yet
  if (!team) {
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
              <p className="mt-2 text-gray-600">Loading team...</p>
            </div>
          </div>
        }
      />
    );
  }

  // Use userData if available, otherwise fall back to clerkUser
  const currentUser = userData || clerkUser;
  const currentUserId = userData?.id || clerkUser?.id;

  const [activeSection, setActiveSection] = useState<string>("information");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteStep, setDeleteStep] = useState<number>(1);
  const [confirmationText, setConfirmationText] = useState<string>("");

  // Member management states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [pendingMembers, setPendingMembers] = useState<PendingTeamMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState<FormData>({
    name: team?.name || "",
    slug: team?.slug || "",
    description: team?.description || "",
    settings: {
      isPrivate: false,
      allowMemberInvites: true,
      requireApproval: false,
    },
  });

  const informationRef = useRef<HTMLElement>(null);
  const membersRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);
  const dangerZoneRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
    if (dangerZoneRef.current) observer.observe(dangerZoneRef.current);

    return () => observer.disconnect();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name !== team.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name, team.name]);

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

  const handleInputChange = (
    field: keyof Omit<FormData, "settings">,
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

  const handleUpdate = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!currentUserId) {
      setError("You must be logged in to update a team");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const result = await updateTeamAction(
        team.id,
        {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
        },
        currentUserId
      );

      if (result.success) {
        setSuccess(true);

        // If slug changed, redirect to new URL
        const updatedTeam = result.team;
        if (updatedTeam && updatedTeam.slug !== team.slug) {
          setTimeout(() => {
            navigateToTeam(updatedTeam.slug);
          }, 2000);
        }
      } else {
        setError(result.error || "Failed to update team");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error updating team:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (): Promise<void> => {
    if (!currentUserId) {
      setError("You must be logged in to archive a team");
      return;
    }

    setIsArchiving(true);
    setError("");

    try {
      const result = await archiveTeamAction(team.id, currentUserId);

      if (result.success) {
        // Redirect to teams list after archiving
        router.push("/team");
      } else {
        setError(result.error || "Failed to archive team");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error archiving team:", err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!currentUserId) {
      setError("You must be logged in to delete a team");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const result = await deleteTeamAction(
        team.id,
        currentUserId,
        confirmationText
      );

      if (result.success) {
        // Redirect to teams list after deletion
        router.push("/team");
      } else {
        setError(result.error || "Failed to delete team");
        setIsDeleting(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error deleting team:", err);
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
    setConfirmationText("");
    setError("");
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setConfirmationText("");
    setError("");
  };

  const proceedToDeleteStep2 = () => {
    setDeleteStep(2);
  };

  // Member management functions
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
    const existingEmails = new Set([
      ...(team.members?.map((m) => m.user?.email) || []),
      ...pendingMembers.map((m) => m.email),
    ]);

    if (existingEmails.has(email)) {
      setError("This email is already added");
      return;
    }

    const newMember: PendingTeamMember = {
      email,
      isExistingUser: false, // This is an email-only invite
    };

    setPendingMembers((prev) => [...prev, newMember]);
    setSearchQuery("");
    setShowDropdown(false);
    setError("");
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
        currentUserId!
      );

      if (result.success) {
        setPendingMembers([]);
        setSuccess(true);
      } else {
        setError("Failed to add some members");
      }
    } catch (err) {
      setError("Failed to add members");
      console.error("Error adding members:", err);
    }
  };

  const removeExistingMember = async (
    memberId: string,
    userId: string
  ): Promise<void> => {
    console.log("Clicked - removeExistingMember");
    console.log("Parameters:", {
      memberId,
      userId,
      teamId: team.id,
      currentUserId,
    });

    try {
      console.log("About to call removeTeamMemberAction...");
      const result = await removeTeamMemberAction(
        team.id,
        userId,
        currentUserId!
      );
      console.log("removeTeamMemberAction completed. Result:", result);

      if (result.success) {
        console.log("Success! Setting success state...");
        setSuccess(true);
      } else {
        console.log("Failed with error:", result.error);
        setError(result.error || "Failed to remove member");
      }
    } catch (err) {
      console.error("Caught error in removeExistingMember:", err);
      console.error("Error type:", typeof err);
      console.error(
        "Error message:",
        err instanceof Error ? err.message : String(err)
      );
      setError("Failed to remove member");
    }
  };

  const updateMemberRole = async (
    userId: string,
    newRole: "admin" | "member" | "viewer"
  ): Promise<void> => {
    console.log("Update member role function called");
    console.log("Parameters:", {
      userId,
      newRole,
      teamId: team.id,
      currentUserId,
    });

    try {
      console.log("About to call updateTeamMemberRoleAction...");
      const result = await updateTeamMemberRoleAction(
        team.id,
        userId,
        newRole,
        currentUserId!
      );
      console.log("updateTeamMemberRoleAction completed. Result:", result);

      if (result.success) {
        console.log("Success! Setting success state...");
        setSuccess(true);
      } else {
        console.log("Failed with error:", result.error);
        setError(result.error || "Failed to update member role");
      }
    } catch (err) {
      console.error("Caught error in updateMemberRole:", err);
      console.error("Error type:", typeof err);
      console.error(
        "Error message:",
        err instanceof Error ? err.message : String(err)
      );
      setError("Failed to update member role");
    }
  };

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

  const canManageMembers =
    team.currentUserRole === "owner" || team.currentUserRole === "admin";

  const navigationItems: NavigationItem[] = [
    { id: "information", label: "Information", icon: Info },
    { id: "members", label: "Members", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "danger-zone", label: "Danger Zone", icon: Trash2 },
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
    <>
      <DualPanelLayout
        left={
          <div className="p-4 h-full">
            <AppBreadcrumb />
            <h2 className="font-bold text-lg pt-2">Update Team</h2>
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
          </div>
        }
        right={
          <div className="p-6 max-w-2xl">
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Team updated successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your team has been updated successfully.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error updating team
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-12">
              {/* Information Section */}
              <section
                id="information"
                ref={informationRef}
                className="scroll-mt-6"
              >
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Info size={20} />
                    Team Information
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Update basic details about your team.
                  </p>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <label
                      htmlFor="teamName"
                      className="block text-sm font-medium text-gray-700"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      placeholder="Enter team name"
                      required
                      maxLength={100}
                      disabled={team.isPersonal}
                    />
                    {team.isPersonal && (
                      <p className="mt-1 text-xs text-gray-500">
                        Personal team names cannot be changed.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="teamSlug"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Team URL Slug *
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        yourapp.com/teams/
                      </span>
                      <input
                        type="text"
                        id="teamSlug"
                        value={formData.slug}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleInputChange("slug", e.target.value)
                        }
                        className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                        placeholder="team-url"
                        required
                        pattern="[a-z0-9-]+"
                        title="Only lowercase letters, numbers, and hyphens are allowed"
                        maxLength={50}
                        disabled={team.isPersonal}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {team.isPersonal
                        ? "Personal team URLs cannot be changed."
                        : "Only lowercase letters, numbers, and hyphens. This will be your team's URL."}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
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
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Users size={20} />
                    Team Members (
                    {(team.members?.length || 0) + pendingMembers.length})
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
                                  {member.user?.firstName &&
                                  member.user?.lastName
                                    ? `${member.user?.firstName} ${member.user?.lastName}`
                                    : member.user?.username ||
                                      member.user?.email}
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
                                      console.log(
                                        "Dropdown button clicked for member:",
                                        member.id
                                      );
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
                                        {(
                                          ["admin", "member", "viewer"] as const
                                        ).map((role) => (
                                          <button
                                            key={role}
                                            type="button"
                                            onClick={() => {
                                              console.log(
                                                "TEST: Button clicked"
                                              );
                                              updateMemberRole(member.id, role);
                                              setShowMemberDropdown(null);
                                            }}
                                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                              member.role === role
                                                ? "text-blue-600 bg-blue-50"
                                                : "text-gray-700"
                                            }`}
                                            // disabled={member.role === role}
                                          >
                                            <div className="flex items-center gap-2">
                                              {getRoleIcon(role)}
                                              <span className="capitalize">
                                                {role}
                                              </span>
                                            </div>
                                          </button>
                                        ))}
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            removeExistingMember(
                                              member.id,
                                              member.id
                                            );
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

                            {member.id === currentUserId &&
                              member.role !== "owner" && (
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
                                      selectedIndex === index
                                        ? "bg-blue-50"
                                        : ""
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
                                  No users found. Try entering an email address
                                  to send an invitation.
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

              {/* Settings Section */}
              <section id="settings" ref={settingsRef} className="scroll-mt-6">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Settings size={20} />
                    Team Settings
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Configure how your team operates.
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
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label
                          htmlFor="isPrivate"
                          className="font-medium text-gray-700"
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
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
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

              {/* Danger Zone Section */}
              <section
                id="danger-zone"
                ref={dangerZoneRef}
                className="scroll-mt-6"
              >
                <div className="border-b border-red-200 pb-6">
                  <h3 className="text-xl font-semibold text-red-900 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Danger Zone
                  </h3>
                  <p className="mt-1 text-sm text-red-600">
                    Irreversible and destructive actions.
                  </p>
                </div>

                <div className="mt-6 space-y-6">
                  {!team.isPersonal && (
                    <>
                      {/* Archive Team */}
                      <div className="border border-yellow-200 rounded-md p-4 bg-yellow-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">
                              Archive Team
                            </h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Archive this team to hide it from members. You can
                              restore it later.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleArchive}
                            disabled={
                              isArchiving || team.currentUserRole !== "owner"
                            }
                            className="px-3 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isArchiving ? "Archiving..." : "Archive Team"}
                          </button>
                        </div>
                      </div>

                      {/* Delete Team */}
                      <div className="border border-red-200 rounded-md p-4 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-red-800">
                              Delete Team
                            </h4>
                            <p className="text-sm text-red-700 mt-1">
                              Permanently delete this team and all its data.
                              This action cannot be undone.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={openDeleteModal}
                            disabled={team.currentUserRole !== "owner"}
                            className="px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete Team
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {team.isPersonal && (
                    <div className="text-center py-6 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500">
                        Personal teams cannot be archived or deleted.
                      </p>
                    </div>
                  )}

                  {team.currentUserRole !== "owner" && !team.isPersonal && (
                    <div className="text-center py-6 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500">
                        Only team owners can perform these actions.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={navigateBack}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Updating Team...
                      </>
                    ) : (
                      "Update Team"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        }
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {deleteStep === 1 ? (
                <>
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Delete Team
                    </h3>
                    <div className="mt-2 px-7 py-3">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete{" "}
                        <strong>{team.name}</strong>? This action cannot be
                        undone and will permanently delete:
                      </p>
                      <ul className="mt-3 text-sm text-gray-500 text-left list-disc list-inside">
                        <li>All team data and settings</li>
                        <li>All team projects and content</li>
                        <li>All member access to the team</li>
                      </ul>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={closeDeleteModal}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={proceedToDeleteStep2}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Confirm Deletion
                    </h3>
                    <div className="mt-2 px-7 py-3">
                      <p className="text-sm text-gray-500 mb-4">
                        To confirm deletion, please type the team name exactly
                        as shown:
                      </p>
                      <p className="text-sm font-medium text-gray-900 mb-3">
                        {team.name}
                      </p>
                      <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Type team name to confirm"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={closeDeleteModal}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting || confirmationText !== team.name}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? "Deleting..." : "Delete Team"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
