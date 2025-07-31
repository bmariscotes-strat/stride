// types/base.ts
import type { TeamRole, Priority, NotificationType } from "./enums";
export type UUID = string & { readonly __brand: unique symbol };

// =============================================================================
// CORE ENTITY INTERFACES - Main business entities
// =============================================================================

export interface User {
  id: UUID;
  clerkUserId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  personalTeamId: UUID | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  isPersonal: boolean;
  isArchived: boolean;
  createdBy: UUID;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  teamId: UUID;
  ownerId: UUID;
  colorTheme: string | null;
  isArchived: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: UUID;
  projectId: UUID;
  name: string;
  position: number;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: UUID;
  columnId: UUID;
  title: string;
  description: string | null;
  assigneeId: UUID | null;
  priority: Priority | null;
  startDate: Date | null;
  dueDate: Date | null;
  position: number;
  status: string | null;
  isArchived: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Label {
  id: UUID;
  name: string;
  color: string;
  teamId: UUID;
  createdAt: Date;
}

// =============================================================================
// RELATIONSHIP/JUNCTION INTERFACES - Many-to-many relationships
// =============================================================================

export interface TeamMember {
  id: UUID;
  teamId: UUID;
  userId: UUID;
  role: TeamRole;
  joinedAt: Date;
}

export interface CardLabel {
  id: UUID;
  cardId: UUID;
  labelId: UUID;
}

// =============================================================================
// COLLABORATION & COMMUNICATION INTERFACES - Comments, attachments, activity
// =============================================================================

export interface CardComment {
  id: number;
  cardId: UUID;
  userId: UUID;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardAttachment {
  id: number;
  cardId: UUID;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: UUID;
  createdAt: Date;
}

// =============================================================================
// TRACKING & NOTIFICATION INTERFACES - Activity logs, notifications, mentions
// =============================================================================

export interface ActivityLog {
  id: number;
  projectId: UUID | null;
  cardId: UUID | null;
  userId: UUID;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface Notification {
  id: number;
  userId: UUID;
  type: NotificationType;
  title: string;
  message: string | null;
  cardId: UUID | null;
  projectId: UUID | null;
  isRead: boolean;
  createdAt: Date;
}

export interface Mention {
  id: number;
  commentId: UUID;
  mentionedUserId: UUID;
  mentionedBy: UUID;
  createdAt: Date;
}
