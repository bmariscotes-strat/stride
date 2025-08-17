// types/index.ts
// =============================================================================
// MAIN EXPORT FILE - Re-export all types for easy importing
// =============================================================================

// Base interfaces
export type {
  User,
  Team,
  Project,
  ProjectTeam,
  ProjectTeamMember,
  Column,
  Card,
  Label,
  TeamMember,
  CardLabel,
  CardComment,
  CardAttachment,
  ActivityLog,
  Notification,
  Mention,
} from "./base";

// Relations
export type {
  UserWithRelations,
  TeamWithRelations,
  TeamWithMemberRoles,
  ProjectWithRelations,
  ColumnWithRelations,
  CardWithRelations,
  LabelWithRelations,
  TeamMemberWithRelations,
  CardLabelWithRelations,
  CardCommentWithRelations,
  CardAttachmentWithRelations,
  ActivityLogWithRelations,
  NotificationWithRelations,
  MentionWithRelations,
  TeamWithProjectRoleRelations,
  ProjectTeamMemberWithRelations,
} from "./relations";

// Create interfaces
export type {
  CreateUser,
  CreateTeam,
  CreateProject,
  CreateProjectWithMembers,
  CreateColumn,
  CreateCard,
  CreateLabel,
  CreateTeamMember,
  CreateCardLabel,
  CreateCardComment,
  CreateCardAttachment,
  CreateActivityLog,
  CreateNotification,
  CreateMention,
} from "./create";

// Update interfaces
export type {
  UpdateUser,
  UpdateTeam,
  UpdateProject,
  UpdateColumn,
  UpdateCard,
  UpdateLabel,
  UpdateTeamMember,
  UpdateCardComment,
  UpdateNotification,
} from "./update";

// Utility types
export type {
  PaginationParams,
  FilterParams,
  ApiResponse,
  ApiError,
  PaginatedResponse,
  CardWithDetails,
  ProjectWithColumns,
  ProjectSummary,
  UserProfile,
  CardSummary,
  SearchParams,
  SortOption,
  FormState,
  DashboardStats,
  RecentActivity,
  NavigationItem,
  BaseNavSource,
} from "./utility";

// Teams
export type {
  InviteFormMember,
  PendingTeamMember,
  TeamFormData,
  TeamSettings,
} from "./forms/team";

export type {
  ProjectSettings,
  ProjectCreationProps,
  ProjectFormSectionProps,
  ProjectFormNavigationProps,
  ProjectEditFormProps,
  ProjectFormMessagesProps,
  ProjectFormData,
  ProjectWithPartialRelations,
  AssignProjectRoleParams,
  ProjectsListOptions,
  UserBasic,
} from "./forms/project";

// Notification
export type {
  Priority,
  NotificationType,
  NotificationTemplate,
  NotificationStats,
  NotificationResponse,
  NotificationProps,
} from "./enums/notif";

// Activity
export type { ActivityLogResult } from "./enums/activity";

export type {
  ProjectPermissionsResponse,
  TeamPermissionsResponse,
} from "./enums/permissions";

export type { TeamRole, ProjectTeamRole } from "./enums/roles";
