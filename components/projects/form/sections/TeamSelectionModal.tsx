import React, { useState, useEffect } from "react";
import { X, Users, ChevronDown, ChevronUp } from "lucide-react";
import type { TeamWithRelations, TeamWithProjectRoleRelations } from "@/types";

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTeams: TeamWithProjectRoleRelations[]) => void;
  availableTeams: TeamWithRelations[];
  currentUserId: string;
  preSelectedTeamIds?: string[];
}

const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableTeams,
  currentUserId,
  preSelectedTeamIds = [],
}) => {
  const [selectedTeams, setSelectedTeams] = useState<
    TeamWithProjectRoleRelations[]
  >([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && preSelectedTeamIds.length > 0) {
      const preSelected = availableTeams
        .filter((teamMember) => preSelectedTeamIds.includes(teamMember.id))
        .map((teamMember) => initializeTeamWithRoles(teamMember));
      setSelectedTeams(preSelected);
      setExpandedTeams(new Set(preSelectedTeamIds));
    }
  }, [isOpen, preSelectedTeamIds, availableTeams]);

  const initializeTeamWithRoles = (
    teamMember: TeamWithRelations
  ): TeamWithProjectRoleRelations => {
    const memberRoles: Record<string, "admin" | "editor" | "viewer"> = {};

    // Set all members to "editor" by default, except current user gets "admin"
    if (teamMember.members) {
      teamMember.members.forEach((member) => {
        if (member.user) {
          memberRoles[member.user.id] =
            member.user.id === currentUserId ? "admin" : "editor";
        }
      });
    }

    return {
      team: teamMember,
      members: teamMember?.members,
      projectRole: "editor",
      memberRoles,
    };
  };

  const handleTeamToggle = (teamMember: TeamWithRelations) => {
    const isSelected = selectedTeams.some((t) => t.team?.id === teamMember?.id);

    if (isSelected) {
      setSelectedTeams((prev) =>
        prev.filter((t) => t.team?.id !== teamMember?.id)
      );
      setExpandedTeams((prev) => {
        const newSet = new Set(prev);
        if (teamMember?.id) {
          newSet.delete(teamMember.id);
        }
        return newSet;
      });
    } else {
      const teamWithRoles = initializeTeamWithRoles(teamMember);
      setSelectedTeams((prev) => [...prev, teamWithRoles]);
      setExpandedTeams((prev) => new Set([...prev, teamMember?.id || ""]));
    }
  };

  const handleTeamRoleChange = (
    teamId: string,
    role: "admin" | "editor" | "viewer"
  ) => {
    setSelectedTeams((prev) =>
      prev.map((team) =>
        team.team?.id === teamId ? { ...team, projectRole: role } : team
      )
    );
  };

  const handleMemberRoleChange = (
    teamId: string,
    memberId: string,
    role: "admin" | "editor" | "viewer"
  ) => {
    setSelectedTeams((prev) =>
      prev.map((team) =>
        team.team?.id === teamId
          ? {
              ...team,
              memberRoles: { ...team.memberRoles, [memberId]: role },
            }
          : team
      )
    );
  };

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedTeams);
    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users size={20} />
            Select Teams and Assign Roles
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Available Teams */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Available Teams</h3>
              <p className="text-sm text-gray-600">
                Select teams to add to this project
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {availableTeams
                .filter((team) => !team?.isArchived)
                .map((team) => {
                  if (!team) return null;

                  // Debug logs
                  console.log("Rendering team:", team.name, team.id);
                  console.log("Team members raw:", team.members);
                  console.log("Team member count:", team.members?.length);

                  return (
                    <div key={team.id} className="border-b border-gray-100">
                      <label className="flex items-center p-4 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeams.some(
                            (t) => t.team?.id === team?.id
                          )}
                          onChange={() => {
                            console.log(
                              "Toggling team selection:",
                              team.id,
                              team.name
                            );
                            handleTeamToggle(team);
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">
                            {team.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {team.members?.length || 0} members
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Selected Teams and Role Assignment */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">
                Selected Teams ({selectedTeams.length})
              </h3>
              <p className="text-sm text-gray-600">
                Configure roles for each team and their members
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedTeams.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  Select teams from the left to configure roles
                </div>
              ) : (
                selectedTeams.map((teamWithRole) => {
                  if (!teamWithRole.team) return null;

                  return (
                    <div
                      key={teamWithRole.team.id}
                      className="border-b border-gray-100"
                    >
                      {/* Team Header */}
                      <div className="p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                toggleTeamExpansion(teamWithRole.team!.id)
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {expandedTeams.has(teamWithRole.team.id) ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                            <div>
                              <div className="font-medium text-gray-900">
                                {teamWithRole.team.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {teamWithRole.members?.length || 0} members
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              Team Role:
                            </span>
                            <select
                              value={teamWithRole.projectRole}
                              onChange={(e) =>
                                handleTeamRoleChange(
                                  teamWithRole.team!.id,
                                  e.target.value as
                                    | "admin"
                                    | "editor"
                                    | "viewer"
                                )
                              }
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Team Members */}
                      {expandedTeams.has(teamWithRole.team.id) &&
                        teamWithRole.members && (
                          <div className="bg-gray-50 px-4 pb-4">
                            <div className="space-y-2">
                              {teamWithRole.members.map((member) => {
                                if (!member.user) return null;

                                return (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                                  >
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
                                            {member.user.firstName.charAt(0)}
                                            {member.user.lastName.charAt(0)}
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {member.user.firstName}{" "}
                                          {member.user.lastName}
                                          {member.user.id === currentUserId && (
                                            <span className="ml-2 text-xs text-blue-600">
                                              (You)
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {member.user.email}
                                        </div>
                                      </div>
                                    </div>
                                    <select
                                      value={
                                        teamWithRole.memberRoles[
                                          member.user.id
                                        ] || "editor"
                                      }
                                      onChange={(e) =>
                                        handleMemberRoleChange(
                                          teamWithRole.team!.id,
                                          member.user!.id,
                                          e.target.value as
                                            | "admin"
                                            | "editor"
                                            | "viewer"
                                        )
                                      }
                                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="admin">Admin</option>
                                      <option value="editor">Editor</option>
                                      <option value="viewer">Viewer</option>
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedTeams.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedTeams.length} Team
            {selectedTeams.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionModal;
