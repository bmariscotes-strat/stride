export type TeamRole = "owner" | "admin" | "member" | "viewer";
export type ProjectTeamRole = "admin" | "editor" | "viewer";

export interface TeamMemberRole {
  userId: string;
  userName: string;
  userEmail: string;
  role: TeamRole;
}

export interface ProjectTeamData {
  teamId: string;
  role: ProjectTeamRole;
  members: TeamMemberRole[];
}
