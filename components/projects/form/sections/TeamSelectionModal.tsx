"use client";
import React, { useState, useEffect, useMemo } from "react";
import { X, Check, Users } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { getRoleIcon, getRoleBadgeClass, getIcon } from "@/lib/ui/icons-colors";
import type { TeamWithRelations, TeamWithMemberRoles } from "@/types";

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
  isEditMode?: boolean;
  projectId?: string;
}

interface UniqueUser {
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

export default function TeamSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  availableTeams,
  currentUserId,
  preSelectedTeamIds = [],
  preSelectedMemberRoles = {},
  isEditMode = false,
  projectId,
}: TeamSelectionModalProps) {
  const [selectedTeamIds, setSelectedTeamIds] =
    useState<string[]>(preSelectedTeamIds);
  const [memberRoles, setMemberRoles] = useState<
    Record<string, "admin" | "editor" | "viewer">
  >(preSelectedMemberRoles);

  // Use the project hook to get fresh data in edit mode
  const {
    data: freshProjectData,
    isLoading: isLoadingProject,
    error: projectError,
  } = useProject(isEditMode ? projectId : undefined);

  // Filter teams to only show those where the current user is admin/owner
  const adminTeams = useMemo(() => {
    return availableTeams.filter((team) => {
      // Find the current user's membership in this team
      const userMembership = team.members?.find(
        (member) => member.user?.id === currentUserId
      );

      // Check if user has admin or owner role
      return (
        userMembership &&
        (userMembership.role === "admin" || userMembership.role === "owner")
      );
    });
  }, [availableTeams, currentUserId]);

  // Get the most up-to-date member roles
  const getCurrentMemberRoles = (): Record<
    string,
    "admin" | "editor" | "viewer"
  > => {
    if (!isEditMode) {
      return preSelectedMemberRoles;
    }

    // In edit mode, prioritize fresh project data, then fall back to preSelected
    if (freshProjectData?.projectTeamMembers) {
      const freshRoles: Record<string, "admin" | "editor" | "viewer"> = {};

      freshProjectData.projectTeamMembers.forEach((ptm: any) => {
        if (ptm.teamMember?.user?.id && ptm.role) {
          freshRoles[ptm.teamMember.user.id] = ptm.role;
        }
      });

      // Merge with preSelected roles for any users not in fresh data
      return { ...preSelectedMemberRoles, ...freshRoles };
    }

    return preSelectedMemberRoles;
  };

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      // Only keep preselected teams that the user is admin/owner of
      const validPreselectedTeams = preSelectedTeamIds.filter((teamId) =>
        adminTeams.some((team) => team.id === teamId)
      );

      setSelectedTeamIds(validPreselectedTeams);

      // Use fresh roles if available in edit mode
      const currentRoles = getCurrentMemberRoles();
      setMemberRoles(currentRoles);
    }
  }, [
    isOpen,
    preSelectedTeamIds,
    preSelectedMemberRoles,
    freshProjectData,
    adminTeams,
  ]);

  const handleTeamToggle = (teamId: string) => {
    const newSelectedTeamIds = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter((id) => id !== teamId)
      : [...selectedTeamIds, teamId];

    setSelectedTeamIds(newSelectedTeamIds);

    // If deselecting a team, clean up member roles for users who are only in that team
    if (!newSelectedTeamIds.includes(teamId)) {
      const remainingTeams = adminTeams.filter(
        (t) => newSelectedTeamIds.includes(t.id) && t.id !== teamId
      );

      const remainingUserIds = new Set<string>();
      remainingTeams.forEach((team) => {
        team.members?.forEach((member) => {
          if (member.user?.id) {
            remainingUserIds.add(member.user.id);
          }
        });
      });

      // Clean up roles for users who are no longer in any selected teams
      const newMemberRoles = { ...memberRoles };
      const removedTeam = adminTeams.find((t) => t.id === teamId);
      removedTeam?.members?.forEach((member) => {
        if (member.user?.id && !remainingUserIds.has(member.user.id)) {
          delete newMemberRoles[member.user.id];
        }
      });

      setMemberRoles(newMemberRoles);
    } else {
      // If selecting a team, add roles for new users
      const addedTeam = adminTeams.find((t) => t.id === teamId);
      const newMemberRoles = { ...memberRoles };
      const currentRoles = getCurrentMemberRoles();

      addedTeam?.members?.forEach((member) => {
        if (member.user?.id && !newMemberRoles[member.user.id]) {
          // Use fresh role if available, otherwise default to editor
          newMemberRoles[member.user.id] =
            currentRoles[member.user.id] || "editor";
        }
      });

      setMemberRoles(newMemberRoles);
    }
  };

  const handleRoleChange = (
    userId: string,
    role: "admin" | "editor" | "viewer"
  ) => {
    setMemberRoles((prev) => ({
      ...prev,
      [userId]: role,
    }));
  };

  const handleConfirm = () => {
    const selectedTeams: TeamWithMemberRoles[] = adminTeams
      .filter((team) => selectedTeamIds.includes(team.id))
      .map((team) => ({
        team,
        members: team.members || [],
      }));

    onConfirm(selectedTeams, memberRoles);
    onClose();
  };

  // Get unique members across all selected teams - handle duplicates properly and show correct roles
  const getUniqueMembers = (): UniqueUser[] => {
    const memberMap = new Map<string, UniqueUser>();
    const currentRoles = getCurrentMemberRoles();

    adminTeams
      .filter((team) => selectedTeamIds.includes(team.id))
      .forEach((team) => {
        team.members?.forEach((member) => {
          if (member.user?.id) {
            const userId = member.user.id;
            const existing = memberMap.get(userId);

            if (existing) {
              // Only add team name if not already present
              if (!existing.teams.includes(team.name)) {
                existing.teams.push(team.name);
              }
            } else {
              // Get the current role: first from local state (for unsaved changes),
              // then from fresh data, then from preSelected, then default to editor
              const currentRole =
                memberRoles[userId] || currentRoles[userId] || "editor";

              // Create new entry
              memberMap.set(userId, {
                id: member.id,
                userId: userId,
                user: member.user,
                teams: [team.name],
                role: currentRole,
              });
            }
          }
        });
      });

    return Array.from(memberMap.values());
  };

  const uniqueMembers = getUniqueMembers();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isEditMode
                ? "Manage Project Teams & Roles"
                : "Select Teams & Set Roles"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex h-[calc(90vh-180px)]">
            {/* Teams Selection */}
            <div className="w-1/3 border-r border-gray-200 p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Teams You Can Manage ({adminTeams.length})
              </h4>
              <p className="text-xs text-gray-500 mb-4">
                Only showing teams where you are an admin or owner
              </p>

              <div className="space-y-2 max-h-[calc(90vh-300px)] overflow-y-auto">
                {adminTeams.length > 0 ? (
                  adminTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedTeamIds.includes(team.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => handleTeamToggle(team.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {selectedTeamIds.includes(team.id) ? (
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {team.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {team.members?.length || 0} members
                            </div>
                          </div>
                        </div>
                        <Users className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      You don't have admin access to any teams
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Contact a team owner to get admin permissions
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Member Roles */}
            <div className="w-2/3 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Project Member Roles ({uniqueMembers.length})
                </h4>
                {isEditMode && freshProjectData && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Live data
                  </div>
                )}
              </div>

              {uniqueMembers.length > 0 ? (
                <div className="space-y-3 max-h-[calc(90vh-260px)] overflow-y-auto">
                  {uniqueMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
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
                              {member.user.firstName?.charAt(0) || ""}
                              {member.user.lastName?.charAt(0) || ""}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {member.user.firstName} {member.user.lastName}
                              {member.user.id === currentUserId && (
                                <span className="ml-2 text-xs text-blue-600">
                                  (You)
                                </span>
                              )}
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

                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.userId,
                              e.target.value as "admin" | "editor" | "viewer"
                            )
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        {getRoleIcon(member.role)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    Select teams to see their members and assign roles
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedTeamIds.length} team
              {selectedTeamIds.length !== 1 ? "s" : ""} selected,{" "}
              {uniqueMembers.length} member
              {uniqueMembers.length !== 1 ? "s" : ""} total
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedTeamIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode ? "Update Teams & Roles" : "Confirm Selection"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
