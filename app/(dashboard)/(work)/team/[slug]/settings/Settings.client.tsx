"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import { Info, Settings, Trash2, AlertTriangle, Users } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import {
  updateTeamAction,
  deleteTeamAction,
  archiveTeamAction,
} from "@/lib/services/teams";
import type {
  TeamSettings,
  NavigationItem,
  TeamWithRelations,
  TeamRole,
} from "@/types";

// Import components
import {
  NavigationSidebar,
  AlertMessages,
  TeamInformationSection,
  TeamMembersSection,
  TeamSettingsSection,
  DangerZoneSection,
  DeleteTeamModal,
  ArchiveTeamDialog,
} from "@/components/team";

interface FormData {
  name: string;
  slug: string;
  description: string;
  settings: TeamSettings;
}

type UpdateTeamPageProps = {
  team: TeamWithRelations & { currentUserRole: TeamRole | null };
};

export default function UpdateTeamPage({ team }: UpdateTeamPageProps) {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();

  // Early return if team is not loaded yet
  if (!team) {
    return (
      <DualPanelLayout
        left={
          <div className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
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
  const [archiveError, setArchiveError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [deleteStep, setDeleteStep] = useState<number>(1);
  const [confirmationText, setConfirmationText] = useState<string>("");

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

  const informationRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const dangerZoneRef = useRef<HTMLDivElement>(null);

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

  const handleSuccess = () => {
    setSuccess(true);
    setError("");
    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccess(false), 5000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(false);
  };

  const handleUpdate = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!currentUserId) {
      handleError("You must be logged in to update a team");
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
        handleSuccess();

        // If slug changed, redirect to new URL
        const updatedTeam = result.team;
        if (updatedTeam && updatedTeam.slug !== team.slug) {
          setTimeout(() => {
            navigateToTeam(updatedTeam.slug);
          }, 2000);
        }
      } else {
        handleError(result.error || "Failed to update team");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      handleError(errorMessage);
      console.error("Error updating team:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveClick = () => {
    setShowArchiveModal(true);
    setArchiveError("");
  };

  const handleArchive = async (): Promise<void> => {
    if (!currentUserId) {
      setArchiveError("You must be logged in to archive a team");
      return;
    }

    setIsArchiving(true);
    setArchiveError("");

    try {
      const result = await archiveTeamAction(team.id, currentUserId);

      if (result.success) {
        setShowArchiveModal(false);
        router.push("/team");
      } else {
        setArchiveError(result.error || "Failed to archive team");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setArchiveError(errorMessage);
      console.error("Error archiving team:", err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!currentUserId) {
      handleError("You must be logged in to delete a team");
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
        router.push("/team");
      } else {
        handleError(result.error || "Failed to delete team");
        setIsDeleting(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      handleError(errorMessage);
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
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
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
          <NavigationSidebar
            activeSection={activeSection}
            navigationItems={navigationItems}
            onScrollToSection={scrollToSection}
          />
        }
        right={
          <div className="p-6 max-w-2xl">
            <AlertMessages success={success} error={error} />

            <form onSubmit={handleUpdate} className="space-y-12">
              {/* Information Section */}
              <TeamInformationSection
                team={team}
                formData={formData}
                onInputChange={handleInputChange}
                sectionRef={informationRef}
              />

              {/* Members Section */}
              <TeamMembersSection
                team={team}
                currentUserId={currentUserId}
                onSuccess={handleSuccess}
                onError={handleError}
                sectionRef={membersRef}
              />

              {/* Settings Section */}
              <TeamSettingsSection
                formData={formData}
                onSettingChange={handleSettingChange}
                sectionRef={settingsRef}
              />

              {/* Danger Zone Section */}
              <DangerZoneSection
                team={team}
                onArchive={handleArchiveClick}
                onDelete={openDeleteModal}
                isArchiving={isArchiving}
                sectionRef={dangerZoneRef}
              />

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

      {/* Archive Confirmation Modal */}
      <ArchiveTeamDialog
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        team={team}
        onArchive={handleArchive}
        isArchiving={isArchiving}
        error={archiveError}
      />

      {/* Delete Confirmation Modal */}
      <DeleteTeamModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        team={team}
        deleteStep={deleteStep}
        confirmationText={confirmationText}
        setConfirmationText={setConfirmationText}
        onProceedToStep2={proceedToDeleteStep2}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        error={error}
      />
    </>
  );
}
