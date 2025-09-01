// Updated ProjectInformationSection.tsx - Use useProject hook for fresh data
"use client";
import React, { useState } from "react";
import {
  Info,
  FolderOpen,
  Plus,
  X,
  Users,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import TeamSelectionModal from "@/components/projects/form/sections/TeamSelectionModal";
import { useAssignProjectRole, useProject } from "@/hooks/useProjects"; // Add useProject import
import type {
  ProjectFormSectionProps,
  TeamWithRelations,
  TeamWithMemberRoles,
  ProjectTeamMemberWithRelations,
} from "@/types";
import { useMediaQuery } from "usehooks-ts";

interface ProjectInformationSectionProps extends ProjectFormSectionProps {
  informationRef: React.RefObject<HTMLElement | null>;
  isEdit?: boolean;
  teams: TeamWithRelations[];
  projectId?: string;
  projectTeamMembers?: ProjectTeamMemberWithRelations[];
}

export default function ProjectInformationSection({
  formData,
  onInputChange,
  onSlugChange,
  onTeamsChange,
  onMemberRolesChange,
  teams,
  error,
  informationRef,
  currentUserId,
  isEdit = false,
  projectId,
  projectTeamMembers = [],
}: ProjectInformationSectionProps) {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Use the project hook to get fresh data in edit mode
  const { data: freshProjectData } = useProject(isEdit ? projectId : undefined);

  // Use the standalone role assignment hook
  const { mutateAsync: assignProjectRoleAsync, isPending: isAssigningRole } =
    useAssignProjectRole();

  const isMobile = useMediaQuery("(max-width: 640px)");

  const handleSlugChange = (value: string) => {
    const basicSlug = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
    onSlugChange(basicSlug);
  };

  // UPDATED: Handle team selection and role changes from modal
  const handleTeamSelectionConfirm = async (
    selectedTeams: TeamWithMemberRoles[],
    memberRoles: Record<string, "admin" | "editor" | "viewer">
  ) => {
    const teamIds = selectedTeams
      .map((team) => team.team?.id)
      .filter((id): id is string => Boolean(id));

    onTeamsChange(teamIds);

    // Handle role assignments in edit mode
    if (isEdit && projectId) {
      try {
        // Get the current project team members (fresh data if available)
        const currentProjectTeamMembers =
          freshProjectData?.projectTeamMembers || projectTeamMembers;

        // Process role changes for existing members
        for (const [userId, newRole] of Object.entries(memberRoles)) {
          const projectTeamMember = currentProjectTeamMembers.find(
            (ptm) => ptm.teamMember?.user?.id === userId
          );

          if (projectTeamMember && projectTeamMember.role !== newRole) {
            await assignProjectRoleAsync({
              projectId,
              memberId: projectTeamMember.id,
              newRole,
            });
          }
        }

        console.log("Successfully updated all member roles");
      } catch (error) {
        console.error("Failed to assign roles:", error);
      }
    }

    // Update form data with new roles
    if (onMemberRolesChange) {
      onMemberRolesChange(memberRoles);
    }
  };

  // Enable team removal in both edit and creation modes
  const removeTeam = (teamIdToRemove: string) => {
    const updatedTeamIds = formData.teamIds.filter(
      (id) => id !== teamIdToRemove
    );

    // In edit mode, warn if trying to remove the last team
    if (isEdit && updatedTeamIds.length === 0) {
      alert(
        "Cannot remove all teams from a project. A project must be associated with at least one team."
      );
      return;
    }

    // Update team IDs
    onTeamsChange(updatedTeamIds);

    // Clean up member roles for users who are no longer in any selected teams
    if (onMemberRolesChange) {
      const remainingTeams = teams.filter((team) =>
        updatedTeamIds.includes(team.id)
      );
      const remainingUserIds = new Set<string>();

      remainingTeams.forEach((team) => {
        team.members?.forEach((member) => {
          if (member.user?.id) {
            remainingUserIds.add(member.user.id);
          }
        });
      });

      const newMemberRoles = { ...formData.memberRoles };
      Object.keys(newMemberRoles).forEach((userId) => {
        if (!remainingUserIds.has(userId)) {
          delete newMemberRoles[userId];
        }
      });

      onMemberRolesChange(newMemberRoles);
    }
  };

  // Get selected teams with their members
  const getSelectedTeamsWithMembers = () => {
    return teams
      .filter((team) => team?.id && formData.teamIds.includes(team.id))
      .map((team) => ({
        team,
        members: team.members || [],
      }));
  };

  // Get unique members across all selected teams with proper null safety
  const getAllUniqueMembers = () => {
    const memberMap = new Map<
      string,
      {
        id: string;
        userId: string;
        user: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          avatarUrl: string | null;
        };
        teams: string[];
        role: "admin" | "editor" | "viewer";
      }
    >();

    getSelectedTeamsWithMembers().forEach(({ team, members }) => {
      members.forEach((member) => {
        if (member.user?.id) {
          const existing = memberMap.get(member.user.id);
          if (existing) {
            if (!existing.teams.includes(team.name)) {
              existing.teams.push(team.name);
            }
          } else {
            // Get user role - prioritize fresh project data, then form data, then database data
            let userRole: "admin" | "editor" | "viewer" = "editor";

            if (isEdit) {
              // First try fresh project data
              if (freshProjectData?.projectTeamMembers) {
                const freshMember = freshProjectData.projectTeamMembers.find(
                  (ptm) => ptm.teamMember?.user?.id === member.user?.id
                );
                if (freshMember?.role) {
                  userRole = freshMember.role;
                }
              }
              // Then try formData (for updated roles during current session)
              else if (formData.memberRoles?.[member.user.id]) {
                userRole = formData.memberRoles[member.user.id] as
                  | "admin"
                  | "editor"
                  | "viewer";
              }
              // Finally fallback to props data
              else {
                const ptm = projectTeamMembers.find(
                  (ptm) => ptm.teamMember?.user?.id === member.user?.id
                );
                userRole = ptm?.role || "editor";
              }
            } else {
              // In create mode, use form data or default
              userRole = (formData.memberRoles?.[member.user.id] ||
                "editor") as "admin" | "editor" | "viewer";
            }

            memberMap.set(member.user.id, {
              ...member,
              user: member.user!,
              teams: [team.name],
              role: userRole,
            });
          }
        }
      });
    });

    return Array.from(memberMap.values());
  };

  const getRoleBadgeColor = (role: "admin" | "editor" | "viewer") => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "editor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const uniqueMembers = getAllUniqueMembers();

  console.log("DEBUG: getAllUniqueMembers called", {
    isEdit,
    hasFreshData: !!freshProjectData,
    freshDataTeamMembersCount:
      freshProjectData?.projectTeamMembers?.length || 0,
    formDataMemberRolesCount: Object.keys(formData.memberRoles || {}).length,
    formDataMemberRoles: formData.memberRoles,
    projectTeamMembersCount: projectTeamMembers.length,
    uniqueMembersCount: uniqueMembers.length,
    uniqueMembers: uniqueMembers.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      role: m.role,
    })),
  });

  return (
    <>
      <section id="information" ref={informationRef} className="scroll-mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Info size={18} className="sm:w-5 sm:h-5" />
            Project Information
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {isEdit
              ? "Update your project details."
              : "Basic details about your project."}
          </p>
        </div>

        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="Enter project name"
            required
            maxLength={100}
          />

          <Input
            label="Project URL Slug"
            value={formData.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="project-url"
            required
            pattern="[a-z0-9-]+"
            maxLength={50}
            leftAddon={isMobile ? "projects/" : "stride-pm.app/.../projects/"}
            helperText="Only lowercase letters, numbers, and hyphens. The server will ensure uniqueness."
            disabled={isEdit}
          />

          <TextArea
            label="Description"
            rows={4}
            value={formData.description}
            onChange={(e) => onInputChange("description", e.target.value)}
            placeholder="What's this project about?"
            maxLength={500}
            showCharCount
          />

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Teams & Members{" "}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 w-full sm:w-auto"
                disabled={isAssigningRole}
              >
                {isAssigningRole ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    <span className="sm:hidden">Saving...</span>
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    {isEdit ? (
                      <Settings size={16} className="mr-2" />
                    ) : (
                      <Plus size={16} className="mr-2" />
                    )}
                    <span className="sm:hidden">
                      {isEdit ? "Manage Teams" : "Add Teams"}
                    </span>
                    <span className="hidden sm:inline">
                      {isEdit ? "Manage Teams & Roles" : "Add Teams"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {formData.teamIds.length > 0 ? (
              <div className="space-y-4">
                {/* Teams Overview */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 sm:p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Selected Teams
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedTeamsWithMembers().map(({ team }) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm"
                      >
                        <FolderOpen className="h-3 w-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {team.name}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 flex-shrink-0">
                          ({team.members?.length || 0})
                        </span>
                        {/* Enable team removal for both edit and create, with minimum team validation */}
                        {((!isEdit && formData.teamIds.length > 0) ||
                          (isEdit && formData.teamIds.length > 1)) && (
                          <button
                            type="button"
                            onClick={() => removeTeam(team.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-1 flex-shrink-0"
                            title="Remove team"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Show warning in edit mode if only one team */}
                  {isEdit && formData.teamIds.length === 1 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span>Cannot remove the last team from a project</span>
                    </div>
                  )}
                </div>

                {/* UPDATED: Members without role dropdowns - roles managed in modal only */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                  <div className="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Project Members ({uniqueMembers.length})
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          Individual member roles across all selected teams
                        </p>
                      </div>
                      {uniqueMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsTeamModalOpen(true)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 self-end sm:self-auto"
                          disabled={isAssigningRole}
                        >
                          <Settings className="h-3 w-3" />
                          {isEdit ? "Edit Roles" : "Set Roles"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                    {uniqueMembers.map((member, index) => (
                      <div
                        key={`${member.userId}-${index}`}
                        className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                              {member.user.avatarUrl ? (
                                <img
                                  src={member.user.avatarUrl}
                                  alt={`${member.user.firstName} ${member.user.lastName}`}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {member.user.firstName?.charAt(0) || ""}
                                  {member.user.lastName?.charAt(0) || ""}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {member.user.firstName} {member.user.lastName}
                                  {member.user.id === currentUserId && (
                                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                      (You)
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)} flex-shrink-0 self-start sm:self-auto`}
                                >
                                  {member.role}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                {member.user.email}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                Teams: {member.teams.join(", ")}
                              </div>
                            </div>
                          </div>
                          {/* REMOVED: Role dropdown - now only showing current role badge */}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 py-6 sm:py-8 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md border-dashed text-center">
                <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isEdit
                    ? "No teams assigned to this project"
                    : "Select teams to add to this project"}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isEdit
                ? "Use 'Manage Teams & Roles' to add/remove teams and modify individual member roles."
                : "Choose which teams this project belongs to. Set individual member roles during team selection."}
            </p>
          </div>
        </div>
      </section>

      <TeamSelectionModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onConfirm={handleTeamSelectionConfirm}
        availableTeams={teams}
        currentUserId={currentUserId}
        preSelectedTeamIds={formData.teamIds}
        preSelectedMemberRoles={formData.memberRoles || {}}
        isEditMode={isEdit}
        projectId={projectId}
      />
    </>
  );
}
