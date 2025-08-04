"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users, Settings, Info, Plus, X } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { teamOperations, teamMemberOperations } from "@/lib/services/teams";
import { useRouter } from "next/navigation"; // Use next/navigation for app directory

// TypeScript interfaces
interface TeamSettings {
  isPrivate: boolean;
  allowMemberInvites: boolean;
  requireApproval: boolean;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  members: string[];
  settings: TeamSettings;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export default function CreateTeamForm(): React.JSX.Element {
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
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");

  // Refs for each section
  const informationRef = useRef<HTMLElement>(null);
  const membersRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);

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

    // Observe all sections
    if (informationRef.current) observer.observe(informationRef.current);
    if (membersRef.current) observer.observe(membersRef.current);
    if (settingsRef.current) observer.observe(settingsRef.current);

    return () => observer.disconnect();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    setFormData((prev) => ({ ...prev, slug }));
  }, [formData.name]);

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

  const addMember = (): void => {
    if (
      newMemberEmail.trim() &&
      !formData.members.includes(newMemberEmail.trim())
    ) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newMemberEmail.trim())) {
        setError("Please enter a valid email address");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        members: [...prev.members, newMemberEmail.trim()],
      }));
      setNewMemberEmail("");
      setError(""); // Clear any previous errors
    }
  };

  const removeMember = (email: string): void => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((member) => member !== email),
    }));
  };

  const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      // Basic validation
      if (!formData.name.trim()) {
        throw new Error("Team name is required");
      }
      if (!formData.slug.trim()) {
        throw new Error("Team slug is required");
      }
      if (formData.slug.length < 3) {
        throw new Error("Team slug must be at least 3 characters");
      }

      // Check if slug already exists
      const existingTeam = await teamOperations.getBySlug(formData.slug.trim());
      if (existingTeam) {
        throw new Error(
          "This team URL is already taken. Please choose a different one."
        );
      }

      // Prepare team data for API
      const teamData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        isPersonal: false,
        createdBy: currentUserId,
      };

      console.log("Creating team with data:", teamData);

      // Create the team
      const createdTeam = await teamOperations.create(teamData);

      if (createdTeam) {
        // Add the creator as the owner of the team
        await teamMemberOperations.add({
          teamId: createdTeam.id,
          userId: currentUserId,
          role: "owner",
        });

        // If there are members to invite, add them as members
        if (formData.members.length > 0) {
          console.log("Adding initial members:", formData.members);

          // Note: In a real app, you'd want to send invitation emails
          // and handle the case where users don't exist yet.
          // For now, we'll just log this - you'll need to implement
          // invitation logic based on your user management system

          // TODO: Implement invitation system
          // - Send invitation emails
          // - Create pending invitations
          // - Handle user registration from invitations

          console.log("Members to invite:", formData.members);
          // You might want to store these as pending invitations
          // or send invitation emails here
        }

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
          router.push(`/teams/${createdTeam.slug}`);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMember();
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
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Navigation */}
      <div className="w-64 border-r border-gray-200 p-4 h-full">
        <h2 className="font-bold text-lg mb-4">Create Team</h2>
        <nav>
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

      {/* Right Panel - Form */}
      <div className="flex-1 p-6 max-w-2xl">
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
                  Team created successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your team has been created successfully. You'll be
                    redirected to the team page shortly.
                    {formData.members.length > 0 && (
                      <span>
                        {" "}
                        Invitations will be sent to the specified members.
                      </span>
                    )}
                  </p>
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
                  Error creating team
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
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
                Basic details about your team.
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
                />
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
                    placeholder="team-slug"
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
                Team Members
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Invite people to join your team. They will receive email
                invitations.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Add Members by Email
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMemberEmail(e.target.value)
                    }
                    onKeyPress={handleKeyPress}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    placeholder="colleague@company.com"
                  />
                  <button
                    type="button"
                    onClick={addMember}
                    disabled={!newMemberEmail.trim()}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {formData.members.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invited Members ({formData.members.length})
                  </label>
                  <div className="space-y-2">
                    {formData.members.map((email: string) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm text-gray-900">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(email)}
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
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings size={20} />
                Team Settings
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Configure how your team operates. You can change these settings
                later.
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
                        handleSettingChange("requireApproval", e.target.checked)
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

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting || !formData.name.trim() || !formData.slug.trim()
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
    </div>
  );
}
