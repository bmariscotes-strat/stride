// projects/create/ProjectCreation.client.tsx

"use client";
import React, { useState, useEffect, useRef } from "react";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import { FolderOpen, Info, Settings } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select, type SelectOption } from "@/components/ui/Select";
import { useCreateProject } from "@/hooks/useProjects";
import type { CreateProject, Team } from "@/types";

// TypeScript interfaces
interface ProjectSettings {
  colorTheme?: string;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  teamId: string;
  settings: ProjectSettings;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface ProjectCreationProps {
  teams: Team[];
  selectedTeamId?: string;
}

export default function ProjectCreation({
  teams,
  selectedTeamId,
}: ProjectCreationProps) {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();

  // Use userData if available, otherwise fall back to clerkUser
  const currentUser = userData || clerkUser;
  const currentUserId = userData?.id || clerkUser?.id;

  const [activeSection, setActiveSection] = useState<string>("information");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    teamId: selectedTeamId || "",
    settings: {
      colorTheme: "#3b82f6", // Default blue
    },
  });

  // Refs
  const informationRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);

  // Use the create project hook
  const {
    mutateAsync: createProjectAsync,
    isPending: isCreating,
    error: createError,
  } = useCreateProject();

  // Auto-generate slug from name (simple client-side generation)
  useEffect(() => {
    if (formData.name && !isManualSlug) {
      const baseSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .trim();

      setFormData((prev) => ({ ...prev, slug: baseSlug }));
    }
  }, [formData.name, isManualSlug]);

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
    if (settingsRef.current) observer.observe(settingsRef.current);

    return () => observer.disconnect();
  }, []);

  const handleInputChange = (
    field: keyof Omit<FormData, "settings">,
    value: string
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError("");
  };

  const handleSlugChange = (value: string): void => {
    setIsManualSlug(true);
    setFormData((prev) => ({ ...prev, slug: value }));
    // Clear errors when user starts typing
    if (error) setError("");
  };

  const handleSettingChange = (
    setting: keyof ProjectSettings,
    value: string
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

  const navigateToProject = (teamSlug: string, projectSlug: string) => {
    router.push(`/team/${teamSlug}/project/${projectSlug}`);
  };

  const navigateBack = () => {
    router.back();
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!currentUserId) {
      setError("You must be logged in to create a project");
      return;
    }

    if (!formData.teamId) {
      setError("Please select a team for this project");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const createData: CreateProject = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        teamId: formData.teamId,
        ownerId: currentUserId,
        colorTheme: formData.settings.colorTheme || null,
      };

      const result = await createProjectAsync(createData);

      if (result.success && result.project) {
        setSuccess(true);

        // Reset form after success
        setFormData({
          name: "",
          slug: "",
          description: "",
          teamId: selectedTeamId || "",
          settings: {
            colorTheme: "#3b82f6",
          },
        });
        setIsManualSlug(false);

        // Find the team to get its slug for navigation
        const selectedTeam = teams.find((team) => team.id === formData.teamId);

        // Redirect to the newly created project page after a short delay
        setTimeout(() => {
          if (selectedTeam) {
            navigateToProject(selectedTeam.slug, result.project.slug);
          }
        }, 2000);
      } else {
        throw new Error(result.error || "Failed to create project");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error creating project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigationItems: NavigationItem[] = [
    { id: "information", label: "Information", icon: Info },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Prepare team options for select
  const teamOptions: SelectOption[] = teams.map((team) => ({
    value: team.id,
    label: team.name,
    disabled: team.isArchived,
  }));

  // Color theme options
  const colorThemeOptions: SelectOption[] = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#10b981", label: "Green" },
    { value: "#f59e0b", label: "Yellow" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#ec4899", label: "Pink" },
    { value: "#6b7280", label: "Gray" },
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

  // Show message if no teams available
  if (!teams || teams.length === 0) {
    return (
      <DualPanelLayout
        left={
          <div className="p-4">
            <AppBreadcrumb />
            <h2 className="font-bold text-lg pt-2">Create Project</h2>
          </div>
        }
        right={
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Teams Available
              </h3>
              <p className="text-gray-600 mb-4">
                You need to be a member of at least one team to create a
                project.
              </p>
              <button
                onClick={() => router.push("/teams/create")}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create a Team
              </button>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <DualPanelLayout
      left={
        <div className="p-4 h-full">
          <AppBreadcrumb />
          <h2 className="font-bold text-lg pt-2">Create Project</h2>
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
                    Project created successfully!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Your project has been created successfully. You'll be
                      redirected to the project page shortly.
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
                    Error creating project
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
                  Project Information
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Basic details about your project.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <Input
                  label="Project Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter project name"
                  required
                  maxLength={100}
                />

                <Select
                  label="Team"
                  value={formData.teamId}
                  onChange={(e) => handleInputChange("teamId", e.target.value)}
                  options={teamOptions}
                  placeholder="Select a team"
                  required
                  leftIcon={<FolderOpen className="h-4 w-4 text-gray-400" />}
                  helperText="Choose which team this project belongs to"
                />

                <Input
                  label="Project URL Slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="project-url"
                  required
                  pattern="[a-z0-9-]+"
                  maxLength={50}
                  leftAddon="yourapp.com/teams/team-name/projects/"
                  helperText="Only lowercase letters, numbers, and hyphens. The server will ensure uniqueness."
                />

                <TextArea
                  label="Description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="What's this project about?"
                  maxLength={500}
                  showCharCount
                />
              </div>
            </section>

            {/* Settings Section */}
            <section id="settings" ref={settingsRef} className="scroll-mt-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Settings size={20} />
                  Project Settings
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure your project appearance and preferences. You can
                  change these settings later.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <Select
                  label="Color Theme"
                  value={formData.settings.colorTheme || ""}
                  onChange={(e) =>
                    handleSettingChange("colorTheme", e.target.value)
                  }
                  options={colorThemeOptions}
                  helperText="Choose a color theme for your project"
                />

                {/* Color Preview */}
                {formData.settings.colorTheme && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">Preview:</span>
                    <div
                      className="w-8 h-8 rounded-md border border-gray-200"
                      style={{ backgroundColor: formData.settings.colorTheme }}
                    />
                    <span className="text-sm text-gray-500">
                      {formData.settings.colorTheme}
                    </span>
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
                    isCreating ||
                    !formData.name.trim() ||
                    !formData.slug.trim() ||
                    !formData.teamId
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting || isCreating ? (
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
                      Creating Project...
                    </>
                  ) : (
                    "Create Project"
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
