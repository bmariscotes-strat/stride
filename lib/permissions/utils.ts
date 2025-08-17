export function mapRoleToPermissions(role: string) {
  switch (role) {
    case "owner":
    case "admin":
      return {
        canViewProject: true,
        canEditProject: true,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canManageTeams: true,
      };
    case "editor":
      return {
        canViewProject: true,
        canEditProject: true,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canManageTeams: false,
      };
    case "viewer":
    default:
      return {
        canViewProject: true,
        canEditProject: false,
        canCreateCards: false,
        canEditCards: false,
        canDeleteCards: false,
        canManageTeams: false,
      };
  }
}
