// components/projects/form/ProjectCreationForm.tsx - Updated
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";
import { useCreateProject } from "@/hooks/useProjects";
import AlertMessages from "@/components/projects/form/AlertMessages";
import ProjectInformationSection from "./ProjectInformationSection";
import ProjectSettingsSection from "./ProjectSettingsSection";
import type {
  ProjectCreationProps,
  ProjectFormData,
  ProjectSettings,
} from "@/types";

interface ProjectCreationFormProps extends ProjectCreationProps {
  onNavigateBack: () => void;
  currentUserId: string;
}

export default function ProjectCreationForm({
  teams,
  selectedTeamId,
  onNavigateBack,
}: ProjectCreationFormProps) {
  const { userData, clerkUser } = useUserContext();
  const router = useRouter();

  // Use userData if available, otherwise fall back to clerkUser
  const currentUser = userData || clerkUser;
  const currentUserId = userData?.id || clerkUser?.id;

  // Early return if no user ID is available
  if (!currentUserId) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-center py-8">
          <p className="text-red-600">
            You must be logged in to create a project.
          </p>
          <button
            onClick={onNavigateBack}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const [activeSection, setActiveSection] = useState<string>("information");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isManualSlug, setIsManualSlug] = useState(false);

  // Updated formData structure to support multiple teams and roles
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    slug: "",
    description: "",
    teamIds: selectedTeamId ? [selectedTeamId] : [], // Changed to array
    teamRoles: selectedTeamId ? { [selectedTeamId]: "editor" } : {}, // Track roles per team
    settings: {
      colorTheme: "#3b82f6", // Default blue
    },
  });

  // Refs
  const informationRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);

  // Use the create project hook
  const { mutateAsync: createProjectAsync, isPending: isCreating } =
    useCreateProject();

  // Auto-generate slug from name (simple client-side generation)
  useEffect(() => {
    if (formData.name && !isManualSlug) {
      const baseSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\\s-]/g, "")
        .replace(/\\s+/g, "-")
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
    field: keyof Omit<ProjectFormData, "settings" | "teamRoles">,
    value: string | string[]
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

  // New handlers for team management
  const handleTeamsChange = (teamIds: string[]): void => {
    setFormData((prev) => {
      // Remove roles for teams that are no longer selected
      const newTeamRoles = { ...prev.teamRoles };
      Object.keys(newTeamRoles).forEach((teamId) => {
        if (!teamIds.includes(teamId)) {
          delete newTeamRoles[teamId];
        }
      });

      // Add default roles for new teams
      teamIds.forEach((teamId) => {
        if (!newTeamRoles[teamId]) {
          newTeamRoles[teamId] = "editor";
        }
      });

      return {
        ...prev,
        teamIds,
        teamRoles: newTeamRoles,
      };
    });

    // Clear errors when user makes changes
    if (error) setError("");
  };

  const handleTeamRoleChange = (
    teamId: string,
    role: "admin" | "editor" | "viewer"
  ): void => {
    setFormData((prev) => ({
      ...prev,
      teamRoles: {
        ...prev.teamRoles,
        [teamId]: role,
      },
    }));
  };

  const navigateToProject = (projectSlug: string) => {
    router.push(`/projects/${projectSlug}`);
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!formData.teamIds.length) {
      setError("Please select at least one team for this project");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      // Prepare data for the create project API (matching your hook interface)
      const createData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        ownerId: currentUserId, // Now guaranteed to be string
        colorTheme: formData.settings.colorTheme || null,
        teamIds: formData.teamIds, // Pass array of team IDs
        teamRoles: formData.teamRoles, // Pass role assignments
      };

      const result = await createProjectAsync(createData);

      if (result.success && result.project) {
        setSuccess(true);

        // Reset form after success
        setFormData({
          name: "",
          slug: "",
          description: "",
          teamIds: selectedTeamId ? [selectedTeamId] : [],
          teamRoles: selectedTeamId ? { [selectedTeamId]: "editor" } : {},
          settings: {
            colorTheme: "#3b82f6",
          },
        });
        setIsManualSlug(false);

        // Redirect to the newly created project page after a short delay
        setTimeout(() => {
          navigateToProject(result.project.slug);
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

  return (
    <div className="p-6 max-w-2xl">
      <AlertMessages success={success} error={error} />

      <form onSubmit={handleSubmit} className="space-y-12">
        <ProjectInformationSection
          formData={formData}
          onInputChange={handleInputChange}
          onSlugChange={handleSlugChange}
          onSettingChange={handleSettingChange}
          onTeamsChange={handleTeamsChange}
          onTeamRoleChange={handleTeamRoleChange}
          teams={teams}
          error={error}
          informationRef={informationRef}
          currentUserId={currentUserId} // Now guaranteed to be string
        />

        <ProjectSettingsSection
          formData={formData}
          onInputChange={handleInputChange}
          onSlugChange={handleSlugChange}
          onSettingChange={handleSettingChange}
          onTeamsChange={handleTeamsChange}
          onTeamRoleChange={handleTeamRoleChange}
          teams={teams}
          error={error}
          settingsRef={settingsRef}
          currentUserId={currentUserId} // Now guaranteed to be string
        />

        {/* Submit Button */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onNavigateBack}
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
                !formData.teamIds.length
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
  );
}
