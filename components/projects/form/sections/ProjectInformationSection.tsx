// Updated ProjectInformationSection.tsx
"use client";
import React, { useState } from "react";
import { Info, FolderOpen, Plus, X, Users, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import TeamSelectionModal from "@/components/projects/form/sections/TeamSelectionModal";
import { useProjects } from "@/hooks/useProjects";
import type {
  ProjectFormSectionProps,
  TeamWithRelations,
  TeamWithMemberRoles,
} from "@/types";

interface ProjectInformationSectionProps extends ProjectFormSectionProps {
  informationRef: React.RefObject<HTMLElement | null>;
  isEdit?: boolean;
  teams: TeamWithRelations[];
  projectId?: string;
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
}: ProjectInformationSectionProps) {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Use the projects hook for role assignment
  const { assignProjectRole, isAssigningRole } = useProjects();

  const handleSlugChange = (value: string) => {
    const basicSlug = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
    onSlugChange(basicSlug);
  };

  const handleTeamSelectionConfirm = (
    selectedTeams: TeamWithMemberRoles[],
    memberRoles: Record<string, "admin" | "editor" | "viewer">
  ) => {
    const teamIds = selectedTeams
      .map((team) => team.team?.id)
      .filter((id): id is string => Boolean(id));

    onTeamsChange(teamIds);
    if (onMemberRolesChange) {
      onMemberRolesChange(memberRoles);
    }
  };

  const handleMemberRoleChangeInEditMode = async (
    memberId: string,
    newRole: "admin" | "editor" | "viewer"
  ) => {
    if (isEdit && projectId) {
      try {
        await assignProjectRole({
          projectId,
          memberId,
          newRole,
        });
      } catch (error) {
        console.error("Failed to assign role:", error);
        // Handle error (show toast, etc.)
      }
    }
  };

  const removeTeam = (teamIdToRemove: string) => {
    const updatedTeamIds = formData.teamIds.filter(
      (id) => id !== teamIdToRemove
    );
    onTeamsChange(updatedTeamIds);
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

  // Get unique members across all selected teams
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
            existing.teams.push(team.name);
          } else {
            memberMap.set(member.user.id, {
              ...member,
              user: member.user!,
              teams: [team.name],
              role: (formData.memberRoles?.[member.user.id] || "editor") as
                | "admin"
                | "editor"
                | "viewer",
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
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus size={16} className="mr-2" />
                  Add Teams
                </button>
              )}
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
                        {!isEdit && formData.teamIds.length > 1 && (
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
                </div>

                {/* Members with Roles */}
                <div className="bg-white border border-gray-200 rounded-md">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-900">
                      Project Members ({uniqueMembers.length})
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Individual member roles across all selected teams
                    </p>
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
                          {isEdit ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleMemberRoleChangeInEditMode(
                                  member.id,
                                  e.target.value as
                                    | "admin"
                                    | "editor"
                                    | "viewer"
                                )
                              }
                              disabled={isAssigningRole}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <div className="text-sm text-gray-500">
                              Role set during team selection
                            </div>
                          )}
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

            {!isEdit && (
              <p className="text-xs text-gray-500">
                Choose which teams this project belongs to. Set individual
                member roles during team selection.
              </p>
            )}

            {isEdit && (
              <p className="text-xs text-gray-500">
                Teams cannot be changed after project creation. You can modify
                individual member roles above.
              </p>
            )}
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
      />
    </>
  );
}
