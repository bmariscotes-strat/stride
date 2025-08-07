// =============================================================================
// ACTIVITY LOG ENUMS AND TYPES
// =============================================================================

import { pgEnum } from "drizzle-orm/pg-core";

// Detailed action types for comprehensive activity tracking
export const activityActionEnum = pgEnum("activity_action", [
  // Project Actions
  "project_created",
  "project_updated",
  "project_archived",
  "project_unarchived",
  "project_deleted",
  "project_member_added",
  "project_member_removed",
  "project_transferred",

  // Column Actions
  "column_created",
  "column_updated",
  "column_deleted",
  "column_reordered",

  // Card Actions
  "card_created",
  "card_updated",
  "card_deleted",
  "card_moved",
  "card_assigned",
  "card_unassigned",
  "card_archived",
  "card_unarchived",
  "card_due_date_set",
  "card_due_date_changed",
  "card_due_date_removed",
  "card_priority_changed",
  "card_status_changed",

  // Label Actions
  "label_created",
  "label_updated",
  "label_deleted",
  "card_label_added",
  "card_label_removed",

  // Comment Actions
  "comment_created",
  "comment_updated",
  "comment_deleted",

  // Attachment Actions
  "attachment_uploaded",
  "attachment_deleted",

  // Team Actions
  "team_created",
  "team_updated",
  "team_archived",
  "team_deleted",
  "team_member_invited",
  "team_member_joined",
  "team_member_left",
  "team_member_removed",
  "team_member_role_changed",

  // Mention Actions
  "user_mentioned",
]);

// Types for structured activity data
export type ActivityMetadata = {
  // Card movement tracking
  fromColumnId?: string;
  toColumnId?: string;
  fromColumnName?: string;
  toColumnName?: string;

  // Position changes
  oldPosition?: number;
  newPosition?: number;

  // Assignment changes
  previousAssigneeId?: string;
  newAssigneeId?: string;
  previousAssigneeName?: string;
  newAssigneeName?: string;

  // Label changes
  labelId?: string;
  labelName?: string;
  labelColor?: string;

  // Team/role changes
  previousRole?: string;
  newRole?: string;
  invitedEmail?: string;

  // Team-specific metadata
  teamId?: string;
  teamName?: string;
  teamSlug?: string;
  slug?: string; // For backward compatibility
  description?: string;
  invitationType?: "email" | "link" | "direct";
  archivedAt?: string;
  deletedAt?: string;
  confirmationText?: string;
  field?: string; // For team updates (name, slug, description, etc.)

  // File information
  fileName?: string;
  fileSize?: number;

  // Mention information
  mentionedUserIds?: string[];
  mentionedUsernames?: string[];

  // Additional context
  reason?: string;
  source?: "web" | "mobile" | "api" | "automation";
};

// Type for activity log parameters
export type ActivityLogParams = {
  userId: string;
  actionType: (typeof activityActionEnum.enumValues)[number];
  projectId?: string | null; // Allow explicit null for team-level activities
  cardId?: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: ActivityMetadata;
  teamId?: string;
};

// Type for field changes (used in bulk updates)
export type FieldChange = {
  field: string;
  oldValue: any;
  newValue: any;
};

// Type for activity log query results
export type ActivityLogResult = {
  id: number;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  card?: {
    id: string;
    title: string;
  } | null;
  // Optional team information for team-level activities
  team?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};
