// types/tasks.ts - Updated with fixed pagination types
import type { Priority } from "@/types/enums/notif";

// =============================================================================
// TASK/CARD INPUT TYPES - For service layer operations
// =============================================================================

export interface CreateCardInput {
  columnId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: Priority | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  position?: number; // Optional - will be calculated if not provided
  status?: string | null;
}

export interface UpdateCardInput {
  id: string;
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: Priority | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  position?: number;
  status?: string | null;
  columnId?: string; // For moving between columns
}

export interface MoveCardInput {
  cardId: string;
  newColumnId: string;
  newPosition: number;
}

// =============================================================================
// FILTERING AND QUERY TYPES
// =============================================================================

export interface CardFilters {
  columnId?: string;
  assigneeId?: string;
  priority?: Priority;
  status?: string;
  startDateAfter?: Date;
  startDateBefore?: Date;
  dueDateAfter?: Date;
  dueDateBefore?: Date;
  isOverdue?: boolean;
  hasDescription?: boolean;
  labelIds?: string[];
  search?: string; // For title/description search
  isArchived?: boolean;
}

// Fixed pagination options - make core fields required with defaults handled in service
export interface PaginationOptions {
  page?: number; // Will default to 1 in service
  limit?: number; // Will default to appropriate value in service
  offset?: number; // Will be calculated from page/limit
}

// Alternative: Strict pagination (if you prefer to make them required)
export interface StrictPaginationOptions {
  page: number;
  limit: number;
  offset?: number; // Calculated field
}

export interface SortOptions {
  field:
    | "createdAt"
    | "updatedAt"
    | "dueDate"
    | "priority"
    | "position"
    | "title";
  direction: "asc" | "desc";
}

export interface CardQueryResult {
  cards: CardWithServiceRelations[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export interface BulkUpdateCardsInput {
  cardIds: string[];
  updates: Partial<UpdateCardInput>;
}

export interface BulkArchiveCardsInput {
  cardIds: string[];
}

export interface DuplicateCardInput {
  cardId: string;
  overrides?: Partial<CreateCardInput>;
}

// =============================================================================
// STATISTICS AND ANALYTICS
// =============================================================================

export interface ProjectCardsStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<Priority, number>;
  byAssignee: Record<string, number>;
  overdue: number;
  completed: number;
  archived: number;
}

export interface ColumnCardsStats {
  columnId: string;
  total: number;
  byPriority: Record<Priority, number>;
  overdue: number;
}

// =============================================================================
// PERMISSION CHECKING
// =============================================================================

export interface CardPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canMove: boolean;
  canArchive: boolean;
}

export interface ProjectCardPermissions {
  canCreateCards: boolean;
  canEditAnyCard: boolean;
  canDeleteAnyCard: boolean;
  canManageLabels: boolean;
}

// =============================================================================
// PARTIAL CARD RELATIONS TYPE FOR SERVICE LAYER
// =============================================================================

// Type that matches what your service actually returns (with limited user fields)
export type CardWithServiceRelations = {
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
  column: {
    id: string;
    projectId: string;
    name: string;
    position: number;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
    project: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      ownerId: string;
      isArchived: boolean;
      schemaVersion: number;
      createdAt: Date;
      updatedAt: Date;
    };
  };
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  labels: Array<{
    id: string;
    cardId: string;
    labelId: string;
    label: {
      id: string;
      name: string;
      color: string;
      projectId: string;
      createdAt: Date;
    };
  }>;
  comments: Array<{
    id: number;
    cardId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  }>;
  attachments: Array<{
    id: number;
    cardId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    uploadedBy: string;
    createdAt: Date;
    uploader: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  commentsCount: number;
};

export type CardWithPartialRelations = {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  priority: "high" | "medium" | "low" | null;
  startDate: Date | null;
  dueDate: Date | null;
  position: number;
  status: string | null;
  isArchived: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
  column: {
    id: string;
    projectId: string;
    name: string;
    position: number;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
    project: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      ownerId: string;
      isArchived: boolean;
      schemaVersion: number;
      createdAt: Date;
      updatedAt: Date;
    };
  };
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  labels: Array<{
    id: string;
    cardId: string;
    labelId: string;
    label: {
      id: string;
      name: string;
      color: string;
      projectId: string;
      createdAt: Date;
    };
  }>;
  comments: Array<{
    id: number;
    cardId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  }>;
  attachments: Array<{
    id: number;
    cardId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    uploadedBy: string;
    createdAt: Date;
    uploader: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  commentsCount: number;
};
