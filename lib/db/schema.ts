import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// ENUMS - Define all enum types used across the schema
// =============================================================================
export const teamRoleEnum = pgEnum("team_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);
export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_updated",
  "comment_added",
  "mention",
  "due_date_reminder",
  "team_invitation",
]);

// =============================================================================
// CORE ENTITY TABLES - Main business entities
// =============================================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    personalTeamId: uuid("personal_team_id"),
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clerkUserIdIdx: index("users_clerk_user_id_idx").on(table.clerkUserId),
  })
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    isPersonal: boolean("is_personal").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdBy: uuid("created_by").notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("teams_slug_idx").on(table.slug),
    createdByIdx: index("teams_created_by_idx").on(table.createdBy),
  })
);

// Projects - Individual kanban boards that belong to teams
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    teamId: uuid("team_id").notNull(),
    ownerId: uuid("owner_id").notNull(),
    colorTheme: varchar("color_theme", { length: 50 }),
    isArchived: boolean("is_archived").default(false).notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamSlugUnique: unique("team_slug_unique").on(table.teamId, table.slug),
    teamIdIdx: index("projects_team_id_idx").on(table.teamId),
    ownerIdIdx: index("projects_owner_id_idx").on(table.ownerId),
  })
);

// Columns - Vertical lanes in kanban boards (To Do, In Progress, Done, etc.)
export const columns = pgTable(
  "columns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    position: integer("position").notNull(),
    color: varchar("color", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("columns_project_id_idx").on(table.projectId),
    positionIdx: index("columns_position_idx").on(
      table.projectId,
      table.position
    ),
  })
);

// Cards - Individual tasks/items that move between columns
export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    columnId: uuid("column_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id"),
    priority: priorityEnum("priority").default("medium"),
    startDate: timestamp("start_date"),
    dueDate: timestamp("due_date"),
    position: integer("position").notNull(),
    status: varchar("status", { length: 50 }),
    isArchived: boolean("is_archived").default(false).notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    columnIdIdx: index("cards_column_id_idx").on(table.columnId),
    assigneeIdIdx: index("cards_assignee_id_idx").on(table.assigneeId),
    dueDateIdx: index("cards_due_date_idx").on(table.dueDate),
    priorityIdx: index("cards_priority_idx").on(table.priority),
    positionIdx: index("cards_position_idx").on(table.columnId, table.position),
  })
);

// Labels - Tags/categories that can be applied to cards (scoped to teams)
export const labels = pgTable(
  "labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    teamId: uuid("team_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("labels_team_id_idx").on(table.teamId),
  })
);

// =============================================================================
// RELATIONSHIP/JUNCTION TABLES - Many-to-many relationships
// =============================================================================

// Team Members - Links users to teams with roles (owner/admin/member/viewer)
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: teamRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    teamUserUnique: unique("team_user_unique").on(table.teamId, table.userId),
    teamIdIdx: index("team_members_team_id_idx").on(table.teamId),
    userIdIdx: index("team_members_user_id_idx").on(table.userId),
  })
);

// Card Labels - Links cards to labels (many-to-many)
export const cardLabels = pgTable(
  "card_labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").notNull(),
    labelId: uuid("label_id").notNull(),
  },
  (table) => ({
    cardLabelUnique: unique("card_label_unique").on(
      table.cardId,
      table.labelId
    ),
    cardIdIdx: index("card_labels_card_id_idx").on(table.cardId),
    labelIdIdx: index("card_labels_label_id_idx").on(table.labelId),
  })
);

// =============================================================================
// COLLABORATION & COMMUNICATION TABLES - Comments, attachments, activity
// =============================================================================

// Card Comments - Discussion threads on individual cards
export const cardComments = pgTable(
  "card_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").notNull(),
    userId: uuid("user_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    cardIdIdx: index("card_comments_card_id_idx").on(table.cardId),
    userIdIdx: index("card_comments_user_id_idx").on(table.userId),
  })
);

// Card Attachments - Files uploaded to cards
export const cardAttachments = pgTable(
  "card_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    uploadedBy: uuid("uploaded_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    cardIdIdx: index("card_attachments_card_id_idx").on(table.cardId),
    uploadedByIdx: index("card_attachments_uploaded_by_idx").on(
      table.uploadedBy
    ),
  })
);

// =============================================================================
// TRACKING & NOTIFICATION TABLES - Activity logs, notifications, mentions
// =============================================================================

// Activity Log - Audit trail of all changes made to projects and cards
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    cardId: uuid("card_id"),
    userId: uuid("user_id").notNull(),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("activity_log_project_id_idx").on(table.projectId),
    cardIdIdx: index("activity_log_card_id_idx").on(table.cardId),
    userIdIdx: index("activity_log_user_id_idx").on(table.userId),
    createdAtIdx: index("activity_log_created_at_idx").on(table.createdAt),
  })
);

// Notifications - In-app and email notifications for users
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    cardId: uuid("card_id"),
    projectId: uuid("project_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIsReadIdx: index("notifications_user_id_is_read_idx").on(
      table.userId,
      table.isRead
    ),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  })
);

// Mentions - Track @username mentions in comments
export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id").notNull(),
    mentionedUserId: uuid("mentioned_user_id").notNull(),
    mentionedBy: uuid("mentioned_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    commentIdIdx: index("mentions_comment_id_idx").on(table.commentId),
    mentionedUserIdIdx: index("mentions_mentioned_user_id_idx").on(
      table.mentionedUserId
    ),
  })
);

// =============================================================================
// DRIZZLE RELATIONS - Define relationships between tables for type-safe queries
// =============================================================================

// Users Relations - Connect users to all their related data
export const usersRelations = relations(users, ({ one, many }) => ({
  personalTeam: one(teams, {
    fields: [users.personalTeamId],
    references: [teams.id],
  }),
  teamMemberships: many(teamMembers),
  ownedProjects: many(projects),
  assignedCards: many(cards),
  comments: many(cardComments),
  attachments: many(cardAttachments),
  activities: many(activityLog),
  notifications: many(notifications),
}));

// Teams Relations - Connect teams to their members, projects, and labels
export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  members: many(teamMembers),
  projects: many(projects),
  labels: many(labels),
}));

// Projects Relations - Connect projects to their team, owner, and content
export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  columns: many(columns),
  activities: many(activityLog),
  notifications: many(notifications),
}));

// Columns Relations - Connect columns to their project and cards
export const columnsRelations = relations(columns, ({ one, many }) => ({
  project: one(projects, {
    fields: [columns.projectId],
    references: [projects.id],
  }),
  cards: many(cards),
}));

// Cards Relations - Connect cards to all their related data
export const cardsRelations = relations(cards, ({ one, many }) => ({
  column: one(columns, {
    fields: [cards.columnId],
    references: [columns.id],
  }),
  assignee: one(users, {
    fields: [cards.assigneeId],
    references: [users.id],
  }),
  labels: many(cardLabels),
  comments: many(cardComments),
  attachments: many(cardAttachments),
  activities: many(activityLog),
  notifications: many(notifications),
}));

// Labels Relations - Connect labels to their team and cards
export const labelsRelations = relations(labels, ({ one, many }) => ({
  team: one(teams, {
    fields: [labels.teamId],
    references: [teams.id],
  }),
  cards: many(cardLabels),
}));

// Team Members Relations - Connect team memberships to users and teams
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// Card Labels Relations - Junction table relations
export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, {
    fields: [cardLabels.cardId],
    references: [cards.id],
  }),
  label: one(labels, {
    fields: [cardLabels.labelId],
    references: [labels.id],
  }),
}));

// Card Comments Relations - Connect comments to cards, users, and mentions
export const cardCommentsRelations = relations(
  cardComments,
  ({ one, many }) => ({
    card: one(cards, {
      fields: [cardComments.cardId],
      references: [cards.id],
    }),
    user: one(users, {
      fields: [cardComments.userId],
      references: [users.id],
    }),
    mentions: many(mentions),
  })
);

// Card Attachments Relations - Connect attachments to cards and uploaders
export const cardAttachmentsRelations = relations(
  cardAttachments,
  ({ one }) => ({
    card: one(cards, {
      fields: [cardAttachments.cardId],
      references: [cards.id],
    }),
    uploader: one(users, {
      fields: [cardAttachments.uploadedBy],
      references: [users.id],
    }),
  })
);

// Activity Log Relations - Connect activity logs to related entities
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  project: one(projects, {
    fields: [activityLog.projectId],
    references: [projects.id],
  }),
  card: one(cards, {
    fields: [activityLog.cardId],
    references: [cards.id],
  }),
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Notifications Relations - Connect notifications to users and related entities
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [notifications.cardId],
    references: [cards.id],
  }),
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
}));

// Mentions Relations - Connect mentions to comments and users
export const mentionsRelations = relations(mentions, ({ one }) => ({
  comment: one(cardComments, {
    fields: [mentions.commentId],
    references: [cardComments.id],
  }),
  mentionedUser: one(users, {
    fields: [mentions.mentionedUserId],
    references: [users.id],
  }),
  mentionedByUser: one(users, {
    fields: [mentions.mentionedBy],
    references: [users.id],
  }),
}));
