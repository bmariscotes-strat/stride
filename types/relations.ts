// types/relations.ts
import type {
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

// =============================================================================
// EXTENDED INTERFACES WITH RELATIONS - For when you need related data
// =============================================================================

export interface UserWithRelations extends User {
  personalTeam?: Team;
  teamMemberships?: TeamMember[];
  ownedProjects?: Project[];
  assignedCards?: Card[];
  comments?: CardComment[];
  attachments?: CardAttachment[];
  activities?: ActivityLog[];
  notifications?: Notification[];
}

export interface TeamWithRelations extends Team {
  creator?: User;
  members?: TeamMemberWithRelations[];
  projects?: Project[];
  labels?: Label[];
}

export interface ProjectWithRelations extends Project {
  team?: Team;
  owner?: User;
  columns?: Column[];
  activities?: ActivityLog[];
  notifications?: Notification[];
}

export interface ColumnWithRelations extends Column {
  project?: Project;
  cards?: Card[];
}

export interface CardWithRelations extends Card {
  column?: Column;
  assignee?: User;
  labels?: CardLabel[];
  comments?: CardComment[];
  attachments?: CardAttachment[];
  activities?: ActivityLog[];
  notifications?: Notification[];
}

export interface LabelWithRelations extends Label {
  team?: Team;
  cards?: CardLabel[];
}

export interface TeamMemberWithRelations extends TeamMember {
  team?: Team;
  user?: User;
}

export interface CardLabelWithRelations extends CardLabel {
  card?: Card;
  label?: Label;
}

export interface CardCommentWithRelations extends CardComment {
  card?: Card;
  user?: User;
  mentions?: Mention[];
}

export interface CardAttachmentWithRelations extends CardAttachment {
  card?: Card;
  uploader?: User;
}

export interface ActivityLogWithRelations extends ActivityLog {
  project?: Project;
  card?: Card;
  user?: User;
}

export interface NotificationWithRelations extends Notification {
  user?: User;
  card?: Card;
  project?: Project;
  team?: Team;
}

export interface MentionWithRelations extends Mention {
  comment?: CardComment;
  mentionedUser?: User;
  mentionedByUser?: User;
}
