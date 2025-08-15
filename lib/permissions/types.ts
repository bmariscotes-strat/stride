export type TeamRole = "owner" | "admin" | "member" | "viewer";
export type ProjectTeamRole = "admin" | "editor" | "viewer";

export interface UserPermissionContext {
  userId: string;
  projectId: string;
  teamMemberships: Array<{
    teamId: string;
    teamRole: TeamRole;
    projectRole?: ProjectTeamRole;
  }>;
  isProjectOwner: boolean;
}

export interface TeamPermissionContext {
  userId: string;
  teamId: string;
  userRole: TeamRole | null;
  isTeamCreator: boolean;
}

export interface Permission {
  action: string;
  resource: string;
}

// Define all possible permissions
export const PERMISSIONS = {
  // Project-level permissions
  PROJECT_VIEW: { action: "view", resource: "project" },
  PROJECT_EDIT: { action: "edit", resource: "project" },
  PROJECT_DELETE: { action: "delete", resource: "project" },
  PROJECT_ARCHIVE: { action: "archive", resource: "project" },
  PROJECT_MANAGE_TEAMS: { action: "manage_teams", resource: "project" },

  // Team-level permissions
  TEAM_VIEW: { action: "view", resource: "team" },
  TEAM_EDIT: { action: "edit", resource: "team" },
  TEAM_DELETE: { action: "delete", resource: "team" },
  TEAM_MANAGE_MEMBERS: { action: "manage_members", resource: "team" },
  TEAM_MANAGE_ROLES: { action: "manage_roles", resource: "team" },
  TEAM_INVITE_MEMBERS: { action: "invite_members", resource: "team" },
  TEAM_REMOVE_MEMBERS: { action: "remove_members", resource: "team" },
  TEAM_LEAVE: { action: "leave", resource: "team" },

  // Column permissions
  COLUMN_CREATE: { action: "create", resource: "column" },
  COLUMN_EDIT: { action: "edit", resource: "column" },
  COLUMN_DELETE: { action: "delete", resource: "column" },
  COLUMN_REORDER: { action: "reorder", resource: "column" },

  // Card permissions
  CARD_CREATE: { action: "create", resource: "card" },
  CARD_EDIT: { action: "edit", resource: "card" },
  CARD_DELETE: { action: "delete", resource: "card" },
  CARD_ASSIGN: { action: "assign", resource: "card" },
  CARD_MOVE: { action: "move", resource: "card" },

  // Comment permissions
  COMMENT_CREATE: { action: "create", resource: "comment" },
  COMMENT_EDIT: { action: "edit", resource: "comment" },
  COMMENT_DELETE: { action: "delete", resource: "comment" },

  // Label permissions
  LABEL_CREATE: { action: "create", resource: "label" },
  LABEL_EDIT: { action: "edit", resource: "label" },
  LABEL_DELETE: { action: "delete", resource: "label" },

  // Attachment permissions
  ATTACHMENT_UPLOAD: { action: "upload", resource: "attachment" },
  ATTACHMENT_DELETE: { action: "delete", resource: "attachment" },
} as const;
