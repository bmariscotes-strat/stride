export interface InviteFormMember {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string | null;
  isExistingUser: boolean;
}
