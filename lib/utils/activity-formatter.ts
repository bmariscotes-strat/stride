// lib\utils\activity-formatter.ts
// =============================================================================
// ACTIVITY MESSAGE FORMATTER
// =============================================================================

import { ActivityMetadata, ActivityLogResult } from "@/types";
import {
  FolderPlus,
  Archive,
  Trash2,
  Users,
  Columns,
  FileText,
  RotateCcw,
  User,
  Calendar,
  Zap,
  Tag,
  MessageCircle,
  Paperclip,
  Building2,
  Key,
  Megaphone,
  Activity,
} from "lucide-react";

// Extend ActivityLogResult to make oldValue/newValue optional and add userId
interface ActivityInput
  extends Omit<ActivityLogResult, "oldValue" | "newValue"> {
  metadata?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  userId?: string; // For backward compatibility
}

export function formatActivityMessage(activity: ActivityInput): string {
  const { actionType, oldValue, newValue, user, card, team, userId } = activity;
  const userName = user ? `${user.firstName} ${user.lastName}` : "Someone";

  // Helper function to safely extract value from potentially JSON string
  const extractValue = (value: string | null | undefined): string | null => {
    if (!value) return null;

    // If it's already a simple string, return it
    if (!value.startsWith("{") && !value.startsWith("[")) {
      return value;
    }

    // Try to parse JSON and extract the actual value
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed.value) {
        return parsed.value;
      }
      if (typeof parsed === "string") {
        return parsed;
      }
      return value; // fallback to original
    } catch {
      return value; // fallback to original if parsing fails
    }
  };

  // Parse metadata if it exists, with better error handling
  let metadata: ActivityMetadata = {};
  try {
    if (activity.metadata) {
      if (typeof activity.metadata === "string") {
        metadata = JSON.parse(activity.metadata);
      } else if (typeof activity.metadata === "object") {
        metadata = activity.metadata;
      }
    }
  } catch (e) {
    console.warn("Failed to parse activity metadata:", e);
    // Continue with empty metadata
  }

  // Extract clean values
  const cleanOldValue = extractValue(oldValue);
  const cleanNewValue = extractValue(newValue);

  switch (actionType) {
    // Project Actions
    case "project_created":
      return `${userName} created a new project`;

    case "project_updated":
      if (cleanOldValue && cleanNewValue) {
        return `${userName} updated project from "${cleanOldValue}" to "${cleanNewValue}"`;
      }
      return `${userName} updated the project`;

    case "project_archived":
      return `${userName} archived the project`;

    case "project_unarchived":
      return `${userName} unarchived the project`;

    case "project_deleted":
      return `${userName} deleted the project`;

    case "project_member_added":
      const addedMember =
        metadata.newAssigneeName || cleanNewValue || "a team member";
      return `${userName} added ${addedMember} to the project`;

    case "project_member_removed":
      const removedMember =
        metadata.previousAssigneeName || cleanOldValue || "a team member";
      return `${userName} removed ${removedMember} from the project`;

    case "project_transferred":
      return `${userName} transferred the project to ${cleanNewValue || "another user"}`;

    // Column Actions
    case "column_created":
      const columnName = cleanNewValue || "a new column";
      return `${userName} created column "${columnName}"`;

    case "column_updated":
      if (cleanOldValue && cleanNewValue) {
        return `${userName} renamed column from "${cleanOldValue}" to "${cleanNewValue}"`;
      }
      return `${userName} updated a column`;

    case "column_deleted":
      const deletedColumn = cleanOldValue || "a column";
      return `${userName} deleted column "${deletedColumn}"`;

    case "column_reordered":
      return `${userName} reordered the columns`;

    // Card Actions
    case "card_created":
      const cardTitle = card?.title || cleanNewValue || "a new card";
      return `${userName} created card "${cardTitle}"`;

    case "card_updated":
      if (card?.title) {
        return `${userName} updated card "${card.title}"`;
      }
      return `${userName} updated a card`;

    case "card_deleted":
      const deletedCard = card?.title || cleanOldValue || "a card";
      return `${userName} deleted card "${deletedCard}"`;

    case "card_moved":
      const cardName = card?.title || "a card";
      if (metadata.fromColumnName && metadata.toColumnName) {
        return `${userName} moved "${cardName}" from "${metadata.fromColumnName}" to "${metadata.toColumnName}"`;
      }
      return `${userName} moved card "${cardName}"`;

    case "card_assigned":
      const assignedTo = metadata.newAssigneeName || cleanNewValue || "someone";
      const assignedCard = card?.title || "a card";
      return `${userName} assigned "${assignedCard}" to ${assignedTo}`;

    case "card_unassigned":
      const unassignedFrom =
        metadata.previousAssigneeName || cleanOldValue || "someone";
      const unassignedCard = card?.title || "a card";
      return `${userName} unassigned "${unassignedCard}" from ${unassignedFrom}`;

    case "card_archived":
      const archivedCard = card?.title || "a card";
      return `${userName} archived card "${archivedCard}"`;

    case "card_unarchived":
      const unarchivedCard = card?.title || "a card";
      return `${userName} unarchived card "${unarchivedCard}"`;

    case "card_due_date_set":
      const cardWithDue = card?.title || "a card";
      const dueDate = cleanNewValue
        ? new Date(cleanNewValue).toLocaleDateString()
        : "a due date";
      return `${userName} set due date for "${cardWithDue}" to ${dueDate}`;

    case "card_due_date_changed":
      const cardDueChange = card?.title || "a card";
      if (cleanOldValue && cleanNewValue) {
        const oldDate = new Date(cleanOldValue).toLocaleDateString();
        const newDate = new Date(cleanNewValue).toLocaleDateString();
        return `${userName} changed due date for "${cardDueChange}" from ${oldDate} to ${newDate}`;
      }
      return `${userName} changed the due date for "${cardDueChange}"`;

    case "card_due_date_removed":
      const cardDueRemoved = card?.title || "a card";
      return `${userName} removed due date from "${cardDueRemoved}"`;

    case "card_priority_changed":
      const cardPriority = card?.title || "a card";
      if (cleanOldValue && cleanNewValue) {
        return `${userName} changed priority for "${cardPriority}" from ${cleanOldValue} to ${cleanNewValue}`;
      }
      return `${userName} changed priority for "${cardPriority}"`;

    case "card_status_changed":
      const cardStatus = card?.title || "a card";
      if (cleanOldValue && cleanNewValue) {
        return `${userName} changed status for "${cardStatus}" from ${cleanOldValue} to ${cleanNewValue}`;
      }
      return `${userName} changed status for "${cardStatus}"`;

    // Label Actions
    case "label_created":
      const labelName = metadata.labelName || cleanNewValue || "a new label";
      return `${userName} created label "${labelName}"`;

    case "label_updated":
      const updatedLabel = metadata.labelName || cleanNewValue || "a label";
      return `${userName} updated label "${updatedLabel}"`;

    case "label_deleted":
      const deletedLabel = metadata.labelName || cleanOldValue || "a label";
      return `${userName} deleted label "${deletedLabel}"`;

    case "card_label_added":
      const cardWithLabel = card?.title || "a card";
      const addedLabel = metadata.labelName || cleanNewValue || "a label";
      return `${userName} added label "${addedLabel}" to "${cardWithLabel}"`;

    case "card_label_removed":
      const cardLabelRemoved = card?.title || "a card";
      const removedLabel = metadata.labelName || cleanOldValue || "a label";
      return `${userName} removed label "${removedLabel}" from "${cardLabelRemoved}"`;

    // Comment Actions
    case "comment_created":
      const commentCard = card?.title || "a card";
      return `${userName} commented on "${commentCard}"`;

    case "comment_updated":
      const updatedCommentCard = card?.title || "a card";
      return `${userName} updated a comment on "${updatedCommentCard}"`;

    case "comment_deleted":
      const deletedCommentCard = card?.title || "a card";
      return `${userName} deleted a comment on "${deletedCommentCard}"`;

    // Attachment Actions
    case "attachment_uploaded":
      const uploadCard = card?.title || "a card";
      const fileName = metadata.fileName || "a file";
      return `${userName} uploaded "${fileName}" to "${uploadCard}"`;

    case "attachment_deleted":
      const deleteAttachCard = card?.title || "a card";
      const deletedFile = metadata.fileName || "a file";
      return `${userName} deleted "${deletedFile}" from "${deleteAttachCard}"`;

    // Team Actions
    case "team_created":
      const teamName =
        team?.name || metadata.teamName || cleanNewValue || "a new team";
      return `${userName} created team "${teamName}"`;

    case "team_updated":
      const updatedTeam = team?.name || metadata.teamName || "the team";
      if (metadata.field) {
        return `${userName} updated ${metadata.field} for "${updatedTeam}"`;
      }
      return `${userName} updated "${updatedTeam}"`;

    case "team_archived":
      const archivedTeam = team?.name || metadata.teamName || "the team";
      return `${userName} archived team "${archivedTeam}"`;

    case "team_deleted":
      const deletedTeam =
        team?.name || metadata.teamName || cleanOldValue || "a team";
      return `${userName} deleted team "${deletedTeam}"`;

    case "team_member_invited":
      const invitedEmail = metadata.invitedEmail || cleanNewValue || "someone";
      const inviteTeam = team?.name || metadata.teamName || "the team";
      return `${userName} invited ${invitedEmail} to "${inviteTeam}"`;

    case "team_member_joined":
      const joinedTeam = team?.name || metadata.teamName || "the team";
      return `${userName} joined "${joinedTeam}"`;

    case "team_member_left":
      const leftTeam = team?.name || metadata.teamName || "the team";
      return `${userName} left "${leftTeam}"`;

    case "team_member_removed":
      const removedFromTeam = team?.name || metadata.teamName || "the team";
      const removedMemberName = cleanOldValue || "a member";
      return `${userName} removed ${removedMemberName} from "${removedFromTeam}"`;

    case "team_member_role_changed":
      const roleTeam = team?.name || metadata.teamName || "the team";
      if (metadata.previousRole && metadata.newRole) {
        return `${userName} changed role in "${roleTeam}" from ${metadata.previousRole} to ${metadata.newRole}`;
      }
      return `${userName} changed a member's role in "${roleTeam}"`;

    // Mention Actions
    case "user_mentioned":
      const mentionCard = card?.title || "a card";
      const mentionedUsers =
        metadata.mentionedUsernames?.join(", ") || "someone";
      return `${userName} mentioned ${mentionedUsers} in "${mentionCard}"`;

    // Default fallback
    default:
      return `${userName} performed ${actionType.replace(/_/g, " ")}`;
  }
}

// Helper function to get appropriate Lucide icon component for activity type
export function getActivityIconComponent(actionType: string) {
  switch (actionType) {
    case "project_created":
    case "project_updated":
      return FolderPlus;

    case "project_archived":
    case "project_unarchived":
    case "card_archived":
    case "card_unarchived":
      return Archive;

    case "project_deleted":
    case "card_deleted":
      return Trash2;

    case "project_member_added":
    case "project_member_removed":
    case "team_member_invited":
    case "team_member_joined":
    case "team_member_left":
    case "team_member_removed":
      return Users;

    case "column_created":
    case "column_updated":
    case "column_deleted":
    case "column_reordered":
      return Columns;

    case "card_created":
    case "card_updated":
      return FileText;

    case "card_moved":
      return RotateCcw;

    case "card_assigned":
    case "card_unassigned":
      return User;

    case "card_due_date_set":
    case "card_due_date_changed":
    case "card_due_date_removed":
      return Calendar;

    case "card_priority_changed":
      return Zap;

    case "card_status_changed":
    case "label_created":
    case "label_updated":
    case "label_deleted":
    case "card_label_added":
    case "card_label_removed":
      return Tag;

    case "comment_created":
    case "comment_updated":
    case "comment_deleted":
      return MessageCircle;

    case "attachment_uploaded":
    case "attachment_deleted":
      return Paperclip;

    case "team_created":
    case "team_updated":
    case "team_archived":
    case "team_deleted":
      return Building2;

    case "team_member_role_changed":
      return Key;

    case "user_mentioned":
      return Megaphone;

    default:
      return Activity;
  }
}
