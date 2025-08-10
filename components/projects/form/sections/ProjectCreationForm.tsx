// components/projects/form/ProjectCreationForm.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";
import { useCreateProject } from "@/hooks/useProjects";
import type { CreateProject } from "@/types";
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

  const [activeSection, setActiveSection] = useState<string>("information");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
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
  const { mutateAsync: createProjectAsync, isPending: isCreating } =
    useCreateProject();

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
    field: keyof Omit<ProjectFormData, "settings">,
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

  const navigateToProject = (teamSlug: string, projectSlug: string) => {
    router.push(`/team/${teamSlug}/project/${projectSlug}`);
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

  return (
    <div className="p-6 max-w-2xl">
      <AlertMessages success={success} error={error} />

      <form onSubmit={handleSubmit} className="space-y-12">
        <ProjectInformationSection
          formData={formData}
          onInputChange={handleInputChange}
          onSlugChange={handleSlugChange}
          onSettingChange={handleSettingChange}
          teams={teams}
          error={error}
          informationRef={informationRef}
        />

        <ProjectSettingsSection
          formData={formData}
          onInputChange={handleInputChange}
          onSlugChange={handleSlugChange}
          onSettingChange={handleSettingChange}
          teams={teams}
          error={error}
          settingsRef={settingsRef}
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
  );
}
