// components/projects/form/ProjectEditForm.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUpdateProject, useHardDeleteProject } from "@/hooks/useProjects";
import type {
  UpdateProject,
  ProjectWithPartialRelations,
  TeamWithRelations,
} from "@/types";

import {
  ProjectAlertMessages,
  ProjectInformationSection,
  ProjectSettingsSection,
  ProjectDangerZoneSection,
  DeleteProjectDialog,
  ArchiveProjectDialog,
} from "@/components/projects";

import type { ProjectFormData, ProjectSettings } from "@/types";

interface ProjectEditFormProps {
  project: ProjectWithPartialRelations;
  teams: TeamWithRelations[];
  currentUserId: string;
  isProjectOwner: boolean;
  onNavigateBack: () => void;
}

export default function ProjectEditForm({
  project,
  teams,
  currentUserId,
  isProjectOwner,
  onNavigateBack,
}: ProjectEditFormProps) {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<string>("information");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [archiveError, setArchiveError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [formData, setFormData] = useState<ProjectFormData>({
    name: project.name,
    slug: project.slug,
    description: project.description || "",
    teamId: project.teamId,
    settings: {
      colorTheme: project.colorTheme || "#3b82f6",
    },
  });

  // Refs
  const informationRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLElement>(null);
  const dangerZoneRef = useRef<HTMLElement>(null);

  // Use the update and delete project hooks
  const { mutateAsync: updateProjectAsync, isPending: isUpdating } =
    useUpdateProject();
  const { mutateAsync: deleteProjectAsync, isPending: isDeleting } =
    useHardDeleteProject();

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
    if (dangerZoneRef.current) observer.observe(dangerZoneRef.current);

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

  const handleArchiveClick = () => {
    setShowArchiveModal(true);
    setArchiveError("");
  };

  const handleArchive = async (): Promise<void> => {
    setIsSubmitting(true);
    setArchiveError("");

    try {
      const updateData: UpdateProject = {
        id: project.id,
        isArchived: true,
      };

      const result = await updateProjectAsync(updateData);

      if (result.success) {
        setShowArchiveModal(false);
        setSuccess(true);
        setTimeout(() => {
          router.push(`/team/${project.team?.slug}`);
        }, 2000);
      } else {
        throw new Error(result.error || "Failed to archive project");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setArchiveError(errorMessage);
      console.error("Error archiving project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModalOpen = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
    setConfirmationText("");
    setDeleteError("");
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setConfirmationText("");
    setDeleteError("");
  };

  const handleProceedToStep2 = () => {
    setDeleteStep(2);
  };

  const handleDelete = async (): Promise<void> => {
    if (confirmationText !== project.name) {
      setDeleteError("Project name does not match");
      return;
    }

    setDeleteError("");

    try {
      const result = await deleteProjectAsync(project.id);

      if (result.success) {
        setShowDeleteModal(false);
        router.push(`/team/${project.team?.slug}`);
      } else {
        throw new Error(result.error || "Failed to delete project");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setDeleteError(errorMessage);
      console.error("Error deleting project:", err);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!formData.teamId) {
      setError("Please select a team for this project");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const updateData: UpdateProject = {
        id: project.id,
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        colorTheme: formData.settings.colorTheme || null,
      };

      const result = await updateProjectAsync(updateData);

      if (result.success && result.project) {
        setSuccess(true);

        // Update form data with the server response (in case slug changed)
        setFormData((prev) => ({
          ...prev,
          slug: result.project!.slug,
        }));

        // Navigate to updated project after a short delay
        setTimeout(() => {
          if (result.project!.slug !== project.slug) {
            router.push(`../${result.project!.slug}`);
          }
        }, 2000);
      } else {
        throw new Error(result.error || "Failed to update project");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error updating project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <ProjectAlertMessages success={success} error={error} />

      <form onSubmit={handleSubmit} className="space-y-12">
        <ProjectInformationSection
          formData={formData}
          onInputChange={handleInputChange}
          onSlugChange={handleSlugChange}
          onSettingChange={handleSettingChange}
          teams={teams}
          error={error}
          informationRef={informationRef}
          isEdit={true}
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

        {isProjectOwner && (
          <ProjectDangerZoneSection
            project={project}
            onArchive={handleArchiveClick}
            onDelete={handleDeleteModalOpen}
            isArchiving={isSubmitting && !error}
            sectionRef={dangerZoneRef}
          />
        )}

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
                isUpdating ||
                !formData.name.trim() ||
                !formData.slug.trim() ||
                !formData.teamId
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting || isUpdating ? (
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
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Archive Modal */}
      <ArchiveProjectDialog
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        project={project}
        onArchive={handleArchive}
        isArchiving={isSubmitting}
        error={archiveError}
      />

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteProjectDialog
          isOpen={showDeleteModal}
          onClose={handleDeleteModalClose}
          project={project}
          deleteStep={deleteStep}
          confirmationText={confirmationText}
          setConfirmationText={setConfirmationText}
          onProceedToStep2={handleProceedToStep2}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </div>
  );
}
