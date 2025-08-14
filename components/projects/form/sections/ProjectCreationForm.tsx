// components/projects/form/ProjectCreationForm.tsx - Fixed version
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
    teamIds: selectedTeamId ? [selectedTeamId] : [],
    memberRoles: selectedTeamId ? { [selectedTeamId]: "editor" } : {},
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
        .replace(/[^a-z0-9\s-]/g, "") // Fixed regex
        .replace(/\s+/g, "-") // Fixed: use \s+ instead of \\s+
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

  // Clear error when form data changes
  useEffect(() => {
    if (
      error &&
      (createError || formData.name || formData.slug || formData.teamIds.length)
    ) {
      setError("");
    }
  }, [formData.name, formData.slug, formData.teamIds, createError, error]);

  const handleInputChange = (
    field: keyof ProjectFormData,
    value: any
  ): void => {
    if (field === "memberRoles") {
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSlugChange = (value: string): void => {
    setIsManualSlug(true);
    setFormData((prev) => ({ ...prev, slug: value }));
  };

  // New handlers for team management
  const handleTeamsChange = (teamIds: string[]): void => {
    setFormData((prev) => {
      // Remove roles for teams that are no longer selected
      const newTeamRoles = { ...prev.memberRoles };
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
        memberRoles: newTeamRoles,
      };
    });
  };

  const handleMemberRolesChange = (
    updatedRoles: Record<string, "admin" | "editor" | "viewer">
  ) => {
    setFormData((prev) => ({
      ...prev,
      memberRoles: updatedRoles,
    }));
  };

  const navigateToProject = (projectSlug: string) => {
    router.push(`/projects/${projectSlug}`);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "Project name is required";
    }
    if (!formData.slug.trim()) {
      return "Project slug is required";
    }
    if (!formData.teamIds.length) {
      return "Please select at least one team for this project";
    }
    if (formData.name.trim().length < 2) {
      return "Project name must be at least 2 characters long";
    }
    if (formData.slug.trim().length < 2) {
      return "Project slug must be at least 2 characters long";
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug.trim())) {
      return "Project slug can only contain lowercase letters, numbers, and hyphens";
    }
    return null;
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      // Prepare data for the create project API
      const createData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        ownerId: currentUserId,
        teamIds: formData.teamIds,
        memberRoles: formData.memberRoles,
      };

      console.log("Creating project with data:", createData);

      const result = await createProjectAsync(createData);

      if (result.success && result.project) {
        setSuccess(true);

        // Reset form after success
        setFormData({
          name: "",
          slug: "",
          description: "",
          teamIds: selectedTeamId ? [selectedTeamId] : [],
          memberRoles: selectedTeamId ? { [selectedTeamId]: "editor" } : {},
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
      let errorMessage = "An unexpected error occurred";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (createError) {
        errorMessage = createError.message || "Failed to create project";
      }

      setError(errorMessage);
      console.error("Error creating project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading if teams are being fetched
  if (!teams) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <AlertMessages success={success} error={error} />

      <form onSubmit={handleSubmit} className="space-y-12">
        <ProjectInformationSection
          formData={formData}
          onInputChange={handleInputChange}
          onSlugChange={handleSlugChange}
          onTeamsChange={handleTeamsChange}
          onMemberRolesChange={handleMemberRolesChange}
          teams={teams}
          error={error}
          informationRef={informationRef}
          currentUserId={currentUserId}
        />

        {/* Submit Button */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting || isCreating}
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
