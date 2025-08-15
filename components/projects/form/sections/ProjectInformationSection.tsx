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
        // You might want to show a toast notification here
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
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Info size={20} />
            Project Information
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {isEdit
              ? "Update your project details."
              : "Basic details about your project."}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => onInputChange("name", e.target.value)}
            placeholder="Enter project name"
            required
            maxLength={100}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Teams & Members{" "}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                    Saving...
                  </>
                ) : (
                  <>
                    {isEdit ? (
                      <Settings size={16} className="mr-2" />
                    ) : (
                      <Plus size={16} className="mr-2" />
                    )}
                    {isEdit ? "Manage Teams & Roles" : "Add Teams"}
                  </>
                )}
              </button>
            </div>

            {formData.teamIds.length > 0 ? (
              <div className="space-y-4">
                {/* Teams Overview */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Selected Teams
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedTeamsWithMembers().map(({ team }) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                      >
                        <FolderOpen className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {team.name}
                        </span>
                        <span className="text-gray-600">
                          ({team.members?.length || 0})
                        </span>
                        {/* Enable team removal for both edit and create, with minimum team validation */}
                        {((!isEdit && formData.teamIds.length > 0) ||
                          (isEdit && formData.teamIds.length > 1)) && (
                          <button
                            type="button"
                            onClick={() => removeTeam(team.id)}
                            className="text-red-600 hover:text-red-800 ml-1"
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
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Cannot remove the last team from a project</span>
                    </div>
                  )}
                </div>

                {/* UPDATED: Members without role dropdowns - roles managed in modal only */}
                <div className="bg-white border border-gray-200 rounded-md">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          Project Members ({uniqueMembers.length})
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Individual member roles across all selected teams
                        </p>
                      </div>
                      {uniqueMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsTeamModalOpen(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          disabled={isAssigningRole}
                        >
                          <Settings className="h-3 w-3" />
                          {isEdit ? "Edit Roles" : "Set Roles"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {uniqueMembers.map((member, index) => (
                      <div
                        key={`${member.userId}-${index}`}
                        className="p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              {member.user.avatarUrl ? (
                                <img
                                  src={member.user.avatarUrl}
                                  alt={`${member.user.firstName} ${member.user.lastName}`}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium text-gray-600">
                                  {member.user.firstName?.charAt(0) || ""}
                                  {member.user.lastName?.charAt(0) || ""}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {member.user.firstName} {member.user.lastName}
                                  {member.user.id === currentUserId && (
                                    <span className="ml-2 text-xs text-blue-600">
                                      (You)
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}
                                >
                                  {member.role}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {member.user.email}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
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
              <div className="flex flex-col items-center gap-2 px-3 py-8 bg-gray-50 border border-gray-300 rounded-md border-dashed text-center">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {isEdit
                    ? "No teams assigned to this project"
                    : "Select teams to add to this project"}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-500">
              {isEdit
                ? "Use 'Manage Teams & Roles' to add/remove teams and modify individual member roles."
                : "Choose which teams this project belongs to. Set individual member roles during team selection."}
            </p>
          </div>

          <Input
            label="Project URL Slug"
            value={formData.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="project-url"
            required
            pattern="[a-z0-9-]+"
            maxLength={50}
            leftAddon="stride-pm.app/.../projects/"
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
