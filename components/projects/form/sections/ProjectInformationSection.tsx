// Updated ProjectInformationSection.tsx
"use client";
import React, { useState } from "react";
import { Info, FolderOpen, Plus, X, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import TeamSelectionModal from "@/components/projects/form/sections/TeamSelectionModal";
import type {
  ProjectFormSectionProps,
  TeamWithRelations,
  TeamWithProjectRoleRelations,
} from "@/types";

interface ProjectInformationSectionProps extends ProjectFormSectionProps {
  informationRef: React.RefObject<HTMLElement | null>;
  isEdit?: boolean;
  teams: TeamWithRelations[];
}

export default function ProjectInformationSection({
  formData,
  onInputChange,
  onSlugChange,
  onTeamsChange,
  onTeamRoleChange,
  teams,
  error,
  informationRef,
  currentUserId,
  isEdit = false,
}: ProjectInformationSectionProps) {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const handleSlugChange = (value: string) => {
    const basicSlug = value
      .toLowerCase()
      .replace(/\\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
    onSlugChange(basicSlug);
  };

  const handleTeamSelectionConfirm = (
    selectedTeams: TeamWithProjectRoleRelations[]
  ) => {
    const teamIds = selectedTeams
      .map((team) => team.team?.id || "")
      .filter(Boolean);
    onTeamsChange(teamIds);

    selectedTeams.forEach((team) => {
      if (team.team?.id) {
        onTeamRoleChange(team.team.id, team.projectRole);
      }
    });
  };

  const removeTeam = (teamIdToRemove: string) => {
    const updatedTeamIds = formData.teamIds.filter(
      (id) => id !== teamIdToRemove
    );
    onTeamsChange(updatedTeamIds);
  };

  // Convert your teams to the format needed for display
  const getSelectedTeams = () => {
    return teams
      .filter((team) => formData.teamIds.includes(team.id))
      .map((team) => ({
        team,
        members: team.members,
        projectRole: (formData.teamRoles[team.id] || "editor") as
          | "admin"
          | "editor"
          | "viewer",
        memberRoles: {},
      }));
  };

  const getRoleBadgeColor = (role: "admin" | "editor" | "viewer") => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "editor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
                Teams {!isEdit && <span className="text-red-500">*</span>}
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
              <div className="space-y-2">
                {getSelectedTeams().map((teamWithRole) => {
                  if (!teamWithRole.team) return null;

                  return (
                    <div
                      key={teamWithRole.team.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {teamWithRole.team.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(teamWithRole.projectRole)}`}
                            >
                              {teamWithRole.projectRole}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {teamWithRole.members?.length || 0} members
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEdit && (
                          <select
                            value={teamWithRole.projectRole}
                            onChange={(e) =>
                              onTeamRoleChange(
                                teamWithRole.team!.id,
                                e.target.value as "admin" | "editor" | "viewer"
                              )
                            }
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                        {!isEdit && formData.teamIds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTeam(teamWithRole.team!.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Remove team"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-8 bg-gray-50 border border-gray-300 rounded-md border-dashed text-center">
                <Users className="h-5 w-5 text-gray-400 mx-auto" />
                <span className="text-sm text-gray-500">
                  {isEdit
                    ? "No teams assigned to this project"
                    : "Select teams to add to this project"}
                </span>
              </div>
            )}

            {!isEdit && (
              <p className="text-xs text-gray-500">
                Choose which teams this project belongs to. Each team can have
                different permission levels.
              </p>
            )}

            {isEdit && (
              <p className="text-xs text-gray-500">
                Teams cannot be changed after project creation. Contact your
                team admin if you need to modify team assignments.
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
      />
    </>
  );
}
