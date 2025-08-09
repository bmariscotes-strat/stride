// types/utility.ts
import type { Priority } from "@/types";
import type {
  User,
  Card,
  CardLabel,
  Label,
  CardComment,
  Column,
  Project,
} from "./base";
import type {
  CardWithRelations,
  ColumnWithRelations,
  ProjectWithRelations,
} from "./relations";

// =============================================================================
// UTILITY TYPES - Helper types for common operations
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface FilterParams {
  search?: string;
  teamId?: string;
  projectId?: string;
  assigneeId?: string;
  priority?: Priority;
  isArchived?: boolean;
}

// API Response wrapper types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common query result types
export type CardWithDetails = CardWithRelations & {
  labels: (CardLabel & { label: Label })[];
  comments: (CardComment & {
    user: Pick<
      User,
      "id" | "username" | "firstName" | "lastName" | "avatarUrl"
    >;
  })[];
};

export type ProjectWithColumns = ProjectWithRelations & {
  columns: (ColumnWithRelations & {
    cards: CardWithDetails[];
  })[];
};

export type ProjectSummary = Pick<
  Project,
  "id" | "name" | "slug" | "description" | "colorTheme" | "isArchived"
> & {
  cardCount: number;
  memberCount: number;
};

export type UserProfile = Pick<
  User,
  "id" | "username" | "firstName" | "lastName" | "avatarUrl" | "email"
>;

export type CardSummary = Pick<
  Card,
  "id" | "title" | "priority" | "dueDate" | "isArchived"
> & {
  assignee?: UserProfile;
  labelCount: number;
  commentCount: number;
};

// Search and filtering types
export interface SearchParams {
  query?: string;
  filters?: FilterParams;
  pagination?: PaginationParams;
}

export interface SortOption {
  field: string;
  direction: "asc" | "desc";
  label: string;
}

// Form types
export type FormState<T> = {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
};

// Dashboard types
export interface DashboardStats {
  totalProjects: number;
  totalCards: number;
  completedCards: number;
  overdueTasks: number;
  recentActivity: number;
}

export interface RecentActivity {
  id: string;
  type: "card_created" | "card_updated" | "card_moved" | "comment_added";
  title: string;
  description: string;
  user: UserProfile;
  timestamp: Date;
  cardId?: string;
  projectId?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface BaseNavSource {
  name: string;
  slug: string;
  description?: string | null;
}

export function mapToNavItem<T extends BaseNavSource>(
  item: T,
  options: {
    baseHref: string;
    overrideHref?: (item: T) => string;
    extra?: Partial<{
      icon: React.ReactNode;
      type: string;
    }>;
  }
) {
  return {
    name: item.name,
    slug: item.slug,
    description: item.description ?? undefined,
    href: options.overrideHref
      ? options.overrideHref(item)
      : `${options.baseHref}/${item.slug}`,
    ...(options.extra || {}),
  };
}
