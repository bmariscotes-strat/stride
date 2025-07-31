// types/index.ts
// =============================================================================
// MAIN EXPORT FILE - Re-export all types for easy importing
// =============================================================================

// Base types
export type { UUID } from "./base";

// Enums
export type { TeamRole, Priority, NotificationType, UserRole } from "./enums";

// Base interfaces
export type {
  User,
  Team,
  Project,
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
} from "./relations";

// Create interfaces
export type {
  CreateUser,
  CreateTeam,
  CreateProject,
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
} from "./utility";
