import React, { useState, useEffect } from "react";
import { X, Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { TeamWithRelations, TeamWithMemberRoles } from "@/types";

// Updated interface to focus on member roles only

interface MemberRoleAssignment {
  userId: string;
  role: "admin" | "editor" | "viewer";
  teams: string[];
}

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    selectedTeams: TeamWithMemberRoles[],
    memberRoles: Record<string, "admin" | "editor" | "viewer">
  ) => void;
  availableTeams: TeamWithRelations[];
  currentUserId: string;
  preSelectedTeamIds?: string[];
  preSelectedMemberRoles?: Record<string, "admin" | "editor" | "viewer">;
}

const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableTeams,
  currentUserId,
  preSelectedTeamIds = [],
  preSelectedMemberRoles = {},
}) => {
  const [selectedTeams, setSelectedTeams] = useState<TeamWithMemberRoles[]>([]);
  const [memberRoles, setMemberRoles] = useState<
    Record<string, "admin" | "editor" | "viewer">
  >({});
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [duplicateMembers, setDuplicateMembers] = useState<Set<string>>(
    new Set()
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (preSelectedTeamIds.length > 0) {
        const preSelected = availableTeams
          .filter((team) => team?.id && preSelectedTeamIds.includes(team.id))
          .map((team) => ({
            team,
            members: team.members || [],
          }));
        setSelectedTeams(preSelected);
        setExpandedTeams(new Set(preSelectedTeamIds));
        setMemberRoles(preSelectedMemberRoles);
      } else {
        setSelectedTeams([]);
        setExpandedTeams(new Set());
        setMemberRoles({});
      }
    }
  }, [isOpen, preSelectedTeamIds, availableTeams, preSelectedMemberRoles]);

  // Calculate duplicate members whenever selected teams change
  useEffect(() => {
    const memberTeamCount = new Map<string, string[]>();
    const duplicates = new Set<string>();

    selectedTeams.forEach((teamWithMembers) => {
      teamWithMembers.members.forEach((member) => {
        const userId = member.user?.id;
        if (!memberTeamCount.has(userId!)) {
          memberTeamCount.set(userId!, []);
        }
        memberTeamCount.get(userId!)!.push(teamWithMembers.team.name);

        if (memberTeamCount.get(userId!)!.length > 1) {
          duplicates.add(userId!);
        }
      });
    });

    setDuplicateMembers(duplicates);
  }, [selectedTeams]);

  const initializeMemberRoles = (team: TeamWithRelations) => {
    const newRoles = { ...memberRoles };

    team.members?.forEach((member) => {
      if (member.user?.id && !newRoles[member.user.id]) {
        // Set current user as admin by default, others as editor
        newRoles[member.user.id] =
          member.user.id === currentUserId ? "admin" : "editor";
      }
    });

    setMemberRoles(newRoles);
  };

  const handleTeamToggle = (team: TeamWithRelations) => {
    if (!team?.id) return;

    const isSelected = selectedTeams.some((t) => t.team?.id === team.id);

    if (isSelected) {
      // Remove team and clean up member roles for members who are only in this team
      const remainingTeams = selectedTeams.filter(
        (t) => t.team?.id !== team.id
      );
      setSelectedTeams(remainingTeams);

      // Clean up member roles for users who are no longer in any selected team
      const remainingMemberIds = new Set<string>();
      remainingTeams.forEach((t) => {
        t.members.forEach((m) => {
          if (m.user?.id) remainingMemberIds.add(m.user.id);
        });
      });

      const cleanedRoles = { ...memberRoles };
      Object.keys(cleanedRoles).forEach((userId) => {
        if (!remainingMemberIds.has(userId)) {
          delete cleanedRoles[userId];
        }
      });
      setMemberRoles(cleanedRoles);

      setExpandedTeams((prev) => {
        const newSet = new Set(prev);
        newSet.delete(team.id);
        return newSet;
      });
    } else {
      const teamWithMembers: TeamWithMemberRoles = {
        team,
        members: team.members || [],
      };
      setSelectedTeams((prev) => [...prev, teamWithMembers]);
      initializeMemberRoles(team);
      setExpandedTeams((prev) => new Set([...prev, team.id]));
    }
  };

  const handleMemberRoleChange = (
    userId: string,
    role: "admin" | "editor" | "viewer"
  ) => {
    setMemberRoles((prev) => ({
      ...prev,
      [userId]: role,
    }));
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
    onConfirm(selectedTeams, memberRoles);
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
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getMemberTeams = (userId: string): string[] => {
    const teams: string[] = [];
    selectedTeams.forEach((teamWithMembers) => {
      if (teamWithMembers.members.some((m) => m.user?.id === userId)) {
        teams.push(teamWithMembers.team.name);
      }
    });
    return teams;
  };

  const canConfirm = selectedTeams.length > 0 && duplicateMembers.size === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} />
              Select Teams and Assign Member Roles
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose teams and set individual member roles for this project
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Duplicate Members Warning */}
        {duplicateMembers.size > 0 && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">
                  Duplicate Members Detected
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Some members belong to multiple selected teams. Each member
                  can only have one role per project. Please resolve conflicts
                  before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}

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
                .filter((team) => team && !team.isArchived)
                .map((team) => {
                  if (!team?.id) return null;

                  return (
                    <div key={team.id} className="border-b border-gray-100">
                      <label className="flex items-center p-4 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeams.some(
                            (t) => t.team?.id === team.id
                          )}
                          onChange={() => handleTeamToggle(team)}
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

          {/* Selected Teams and Member Role Assignment */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">
                Selected Teams ({selectedTeams.length})
              </h3>
              <p className="text-sm text-gray-600">
                Assign roles to individual team members
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedTeams.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  Select teams from the left to assign member roles
                </div>
              ) : (
                selectedTeams.map((teamWithMembers) => {
                  if (!teamWithMembers.team?.id) return null;

                  return (
                    <div
                      key={teamWithMembers.team.id}
                      className="border-b border-gray-100"
                    >
                      {/* Team Header */}
                      <div className="p-4 bg-white border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                toggleTeamExpansion(teamWithMembers.team!.id)
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {expandedTeams.has(teamWithMembers.team.id) ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                            <div>
                              <div className="font-medium text-gray-900">
                                {teamWithMembers.team.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {teamWithMembers.members?.length || 0} members
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team Members */}
                      {expandedTeams.has(teamWithMembers.team.id) &&
                        teamWithMembers.members && (
                          <div className="bg-gray-50 px-4 pb-4">
                            <div className="space-y-2">
                              {teamWithMembers.members.map((member) => {
                                if (!member.user?.id) return null;

                                const isDuplicate = duplicateMembers.has(
                                  member.user.id
                                );
                                const memberTeams = getMemberTeams(
                                  member.user.id
                                );

                                return (
                                  <div
                                    key={member.id}
                                    className={`flex items-center justify-between py-3 px-4 bg-white rounded border ${
                                      isDuplicate
                                        ? "border-amber-300 bg-amber-50"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                        {member.user.avatarUrl ? (
                                          <img
                                            src={member.user.avatarUrl}
                                            alt={`${member.user.firstName} ${member.user.lastName}`}
                                            className="w-full h-full rounded-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-xs font-medium text-gray-600">
                                            {member.user.firstName?.charAt(0) ||
                                              ""}
                                            {member.user.lastName?.charAt(0) ||
                                              ""}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <div className="text-sm font-medium text-gray-900 truncate">
                                            {member.user.firstName}{" "}
                                            {member.user.lastName}
                                            {member.user.id ===
                                              currentUserId && (
                                              <span className="ml-2 text-xs text-blue-600">
                                                (You)
                                              </span>
                                            )}
                                          </div>
                                          {isDuplicate && (
                                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 truncate">
                                          {member.user.email}
                                        </div>
                                        {isDuplicate && (
                                          <div className="text-xs text-amber-700 mt-1">
                                            Also in:{" "}
                                            {memberTeams
                                              .filter(
                                                (t) =>
                                                  t !==
                                                  teamWithMembers.team.name
                                              )
                                              .join(", ")}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <select
                                      value={
                                        memberRoles[member.user.id] || "editor"
                                      }
                                      onChange={(e) =>
                                        handleMemberRoleChange(
                                          member.user!.id,
                                          e.target.value as
                                            | "admin"
                                            | "editor"
                                            | "viewer"
                                        )
                                      }
                                      className={`text-sm border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-3 ${
                                        isDuplicate
                                          ? "border-amber-300 bg-amber-50"
                                          : "border-gray-300"
                                      }`}
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
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {duplicateMembers.size > 0 && (
              <span className="text-amber-700 font-medium">
                ⚠️ Resolve {duplicateMembers.size} member conflict
                {duplicateMembers.size !== 1 ? "s" : ""} to continue
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add {selectedTeams.length} Team
              {selectedTeams.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionModal;
