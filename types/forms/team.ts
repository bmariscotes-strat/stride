export interface InviteFormMember {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string | null;
  isExistingUser: boolean;
}

export interface PendingTeamMember {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  isExistingUser?: boolean;
}

export interface TeamFormData {
  name: string;
  slug: string;
  description: string;
  settings: TeamSettings;
}

export interface TeamSettings {
  isPrivate: boolean;
  allowMemberInvites: boolean;
  requireApproval: boolean;
}
