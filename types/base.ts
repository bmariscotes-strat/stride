// types/base.ts
import type { TeamRole } from "@/types/enums/roles";
import type { Priority, NotificationType } from "@/types/enums/notif";

// =============================================================================
// CORE ENTITY INTERFACES - Main business entities
// =============================================================================

export interface User {
  id: string;
  clerkUserId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  personalTeamId: string | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPersonal: boolean;
  isArchived: boolean;
  createdBy: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// UPDATED: Project interface - removed teamId since projects now have many-to-many relationships with teams
export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  isArchived: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTeam {
  id: string;
  projectId: string;
  teamId: string;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  teamMemberId: string;
  role: "admin" | "editor" | "viewer";
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  position: number;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
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

// UPDATED: Label interface - changed from teamId to projectId
export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string; // Changed from teamId to projectId
  createdAt: Date;
}

// =============================================================================
// NEW: PROJECT-TEAM RELATIONSHIP INTERFACE
// =============================================================================

export interface ProjectTeam {
  id: string;
  projectId: string;
  teamId: string;
  role: "admin" | "editor" | "viewer";
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// RELATIONSHIP/JUNCTION INTERFACES - Many-to-many relationships
// =============================================================================

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface CardLabel {
  id: string;
  cardId: string;
  labelId: string;
  color: string;
}

// =============================================================================
// COLLABORATION & COMMUNICATION INTERFACES - Comments, attachments, activity
// =============================================================================

export interface CardComment {
  id: number;
  cardId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardAttachment {
  id: number;
  cardId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string;
  createdAt: Date;
}

// =============================================================================
// TRACKING & NOTIFICATION INTERFACES - Activity logs, notifications, mentions
// =============================================================================

export interface ActivityLog {
  id: number;
  projectId: string | null;
  teamId: string | null;
  cardId: string | null;
  userId: string;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface Notification {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  cardId: string | null;
  projectId: string | null;
  teamId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface Mention {
  id: number;
  commentId: number;
  mentionedUserId: string;
  mentionedBy: string;
  createdAt: Date;
}
