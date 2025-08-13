export interface TeamMemberRole {
  userId: string;
  userName: string;
  userEmail: string;
  role: "admin" | "editor" | "viewer";
}

export interface ProjectTeamData {
  teamId: string;
  role: "admin" | "editor" | "viewer";
  members: TeamMemberRole[];
}
