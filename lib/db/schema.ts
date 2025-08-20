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
  foreignKey,
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

// NEW: Project-specific roles for teams
export const projectTeamRoleEnum = pgEnum("project_team_role", [
  "admin", // Can manage project settings, invite teams, delete project
  "editor", // Can create/edit/delete cards, manage columns
  "viewer", // Can only view project content
]);

export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_updated",
  "comment_added",
  "mention",
  "due_date_reminder",
  "team_invitation",
  "team_role_changed",
  "task_created",
  "task_moved",
  "task_reassigned",
  "project_created",
  "project_updated",
  "project_archived",
  "project_deleted",
  "project_restored",
  "project_team_added",
  "project_team_removed",
  "project_permissions_changed",
]);

// =============================================================================
// CORE ENTITY TABLES - Main business entities
// =============================================================================

// Users table - defined first without foreign key references
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    personalTeamId: uuid("personal_team_id"), // No foreign key constraint here to avoid circular dependency
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clerkUserIdIdx: index("users_clerk_user_id_idx").on(table.clerkUserId),
  })
);

// Teams table - now can reference users
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
    createdByFk: foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: "fk_teams_created_by",
    }).onDelete("restrict"),
  })
);

// Team Members - Links users to teams with roles (owner/admin/member/viewer)
// MOVED: This needs to be defined before projectTeamMembers since it's referenced
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
    teamIdFk: foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "fk_team_members_team_id",
    }).onDelete("cascade"),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fk_team_members_user_id",
    }).onDelete("cascade"),
  })
);

// REFACTORED: Projects - Individual kanban boards with many-to-many team relationships
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    // REMOVED: teamId - projects no longer belong to a single team
    ownerId: uuid("owner_id").notNull(), // Keep owner for administrative purposes
    colorTheme: varchar("color_theme", { length: 50 }),
    isArchived: boolean("is_archived").default(false).notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // UPDATED: Slug uniqueness is now global since we removed teamId
    slugUnique: unique("project_slug_unique").on(table.slug),
    ownerIdIdx: index("projects_owner_id_idx").on(table.ownerId),
    ownerIdFk: foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: "fk_projects_owner_id",
    }).onDelete("restrict"),
  })
);

export const projectTeams = pgTable(
  "project_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    teamId: uuid("team_id").notNull(),
    addedBy: uuid("added_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectTeamUnique: unique("project_team_unique").on(
      table.projectId,
      table.teamId
    ),
    projectIdIdx: index("project_teams_project_id_idx").on(table.projectId),
    teamIdIdx: index("project_teams_team_id_idx").on(table.teamId),
    addedByIdx: index("project_teams_added_by_idx").on(table.addedBy),
    projectIdFk: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "fk_project_teams_project_id",
    }).onDelete("cascade"),
    teamIdFk: foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "fk_project_teams_team_id",
    }).onDelete("cascade"),
    addedByFk: foreignKey({
      columns: [table.addedBy],
      foreignColumns: [users.id],
      name: "fk_project_teams_added_by",
    }).onDelete("restrict"),
  })
);

// NEW: Assign project roles to team members
export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    teamMemberId: uuid("team_member_id").notNull(),
    role: projectTeamRoleEnum("role").notNull(),
    addedBy: uuid("added_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectMemberUnique: unique("project_member_unique").on(
      table.projectId,
      table.teamMemberId
    ),
    projectIdIdx: index("project_team_members_project_id_idx").on(
      table.projectId
    ),
    teamMemberIdIdx: index("project_team_members_team_member_id_idx").on(
      table.teamMemberId
    ),
    addedByIdx: index("project_team_members_added_by_idx").on(table.addedBy),

    projectIdFk: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "fk_project_team_members_project_id",
    }).onDelete("cascade"),

    teamMemberIdFk: foreignKey({
      columns: [table.teamMemberId],
      foreignColumns: [teamMembers.id],
      name: "fk_project_team_members_team_member_id",
    }).onDelete("cascade"),

    addedByFk: foreignKey({
      columns: [table.addedBy],
      foreignColumns: [users.id],
      name: "fk_project_team_members_added_by",
    }).onDelete("restrict"),
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
    projectIdFk: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "fk_columns_project_id",
    }).onDelete("cascade"),
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
    ownerId: uuid("owner_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    columnIdIdx: index("cards_column_id_idx").on(table.columnId),
    assigneeIdIdx: index("cards_assignee_id_idx").on(table.assigneeId),
    dueDateIdx: index("cards_due_date_idx").on(table.dueDate),
    priorityIdx: index("cards_priority_idx").on(table.priority),
    positionIdx: index("cards_position_idx").on(table.columnId, table.position),
    columnIdFk: foreignKey({
      columns: [table.columnId],
      foreignColumns: [columns.id],
      name: "fk_cards_column_id",
    }).onDelete("cascade"),
    assigneeIdFk: foreignKey({
      columns: [table.assigneeId],
      foreignColumns: [users.id],
      name: "fk_cards_assignee_id",
    }).onDelete("set null"),
    ownerIdIdx: index("cards_owner_id_idx").on(table.ownerId),
    ownerIdFk: foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: "fk_cards_owner_id",
    }).onDelete("restrict"),
  })
);

export const labels = pgTable(
  "labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    projectId: uuid("project_id").notNull(), // Changed from teamId to projectId
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("labels_project_id_idx").on(table.projectId),
    projectIdFk: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "fk_labels_project_id",
    }).onDelete("cascade"),
  })
);

// =============================================================================
// RELATIONSHIP/JUNCTION TABLES - Many-to-many relationships
// =============================================================================

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
    cardIdFk: foreignKey({
      columns: [table.cardId],
      foreignColumns: [cards.id],
      name: "fk_card_labels_card_id",
    }).onDelete("cascade"),
    labelIdFk: foreignKey({
      columns: [table.labelId],
      foreignColumns: [labels.id],
      name: "fk_card_labels_label_id",
    }).onDelete("cascade"),
  })
);

// =============================================================================
// COLLABORATION & COMMUNICATION TABLES - Comments, attachments, activity
// =============================================================================

// Card Comments - Discussion threads on individual cards
export const cardComments = pgTable(
  "card_comments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    cardId: uuid("card_id").notNull(),
    userId: uuid("user_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    cardIdIdx: index("card_comments_card_id_idx").on(table.cardId),
    userIdIdx: index("card_comments_user_id_idx").on(table.userId),
    cardIdFk: foreignKey({
      columns: [table.cardId],
      foreignColumns: [cards.id],
      name: "fk_card_comments_card_id",
    }).onDelete("cascade"),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fk_card_comments_user_id",
    }).onDelete("cascade"),
  })
);

// Card Attachments - Files uploaded to cards
export const cardAttachments = pgTable(
  "card_attachments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
    cardIdFk: foreignKey({
      columns: [table.cardId],
      foreignColumns: [cards.id],
      name: "fk_card_attachments_card_id",
    }).onDelete("cascade"),
    uploadedByFk: foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [users.id],
      name: "fk_card_attachments_uploaded_by",
    }).onDelete("restrict"),
  })
);

// =============================================================================
// TRACKING & NOTIFICATION TABLES - Activity logs, notifications, mentions
// =============================================================================

// Activity Log - Audit trail of all changes made to projects and cards
export const activityLog = pgTable(
  "activity_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    projectId: uuid("project_id"),
    teamId: uuid("team_id"),
    cardId: uuid("card_id"),
    userId: uuid("user_id").notNull(),
    actionType: varchar("action_type", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("activity_log_project_id_idx").on(table.projectId),
    teamIdIdx: index("activity_log_team_id_idx").on(table.teamId),
    cardIdIdx: index("activity_log_card_id_idx").on(table.cardId),
    userIdIdx: index("activity_log_user_id_idx").on(table.userId),
    createdAtIdx: index("activity_log_created_at_idx").on(table.createdAt),
    projectIdFk: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "fk_activity_log_project_id",
    }).onDelete("cascade"),
    cardIdFk: foreignKey({
      columns: [table.cardId],
      foreignColumns: [cards.id],
      name: "fk_activity_log_card_id",
    }).onDelete("cascade"),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fk_activity_log_user_id",
    }).onDelete("cascade"),
    teamIdFk: foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "fk_activity_log_team_id",
    }).onDelete("cascade"),
  })
);

// Notifications - In-app and email notifications for users
export const notifications = pgTable(
  "notifications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    cardId: uuid("card_id"),
    projectId: uuid("project_id"),
    teamId: uuid("team_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIsReadIdx: index("notifications_user_id_is_read_idx").on(
      table.userId,
      table.isRead
    ),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fk_notifications_user_id",
    }).onDelete("cascade"),
    cardIdFk: foreignKey({
      columns: [table.cardId],
      foreignColumns: [cards.id],
      name: "fk_notifications_card_id",
    }).onDelete("cascade"),
    projectIdFk: foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "fk_notifications_project_id",
    }).onDelete("cascade"),
    teamIdFk: foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "fk_notifications_team_id",
    }).onDelete("cascade"),
  })
);

// Mentions - Track @username mentions in comments
export const mentions = pgTable(
  "mentions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    commentId: integer("comment_id").notNull(), // Changed from uuid to integer
    mentionedUserId: uuid("mentioned_user_id").notNull(),
    mentionedBy: uuid("mentioned_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    commentIdIdx: index("mentions_comment_id_idx").on(table.commentId),
    mentionedUserIdIdx: index("mentions_mentioned_user_id_idx").on(
      table.mentionedUserId
    ),
    commentIdFk: foreignKey({
      columns: [table.commentId],
      foreignColumns: [cardComments.id],
      name: "fk_mentions_comment_id",
    }).onDelete("cascade"),
    mentionedUserIdFk: foreignKey({
      columns: [table.mentionedUserId],
      foreignColumns: [users.id],
      name: "fk_mentions_mentioned_user_id",
    }).onDelete("cascade"),
    mentionedByFk: foreignKey({
      columns: [table.mentionedBy],
      foreignColumns: [users.id],
      name: "fk_mentions_mentioned_by",
    }).onDelete("cascade"),
  })
);

// =============================================================================
// UPDATED DRIZZLE RELATIONS
// =============================================================================

// Projects Relations - Updated to reflect many-to-many with teams
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  teams: many(projectTeams), // Changed from single team to many teams
  columns: many(columns),
  labels: many(labels), // Added labels relation
  activities: many(activityLog),
  notifications: many(notifications),
}));

// NEW: Project Teams Relations
export const projectTeamsRelations = relations(projectTeams, ({ one }) => ({
  project: one(projects, {
    fields: [projectTeams.projectId],
    references: [projects.id],
  }),
  team: one(teams, {
    fields: [projectTeams.teamId],
    references: [teams.id],
  }),
  addedBy: one(users, {
    fields: [projectTeams.addedBy],
    references: [users.id],
  }),
}));

// NEW: Project Team Members Relations
export const projectTeamMembersRelations = relations(
  projectTeamMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectTeamMembers.projectId],
      references: [projects.id],
    }),
    teamMember: one(teamMembers, {
      fields: [projectTeamMembers.teamMemberId],
      references: [teamMembers.id],
    }),
    addedBy: one(users, {
      fields: [projectTeamMembers.addedBy],
      references: [users.id],
    }),
  })
);

// Teams Relations - Updated to include project relationships
export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  members: many(teamMembers),
  projects: many(projectTeams), // Changed from direct projects to projectTeams
  // Removed labels since they're now project-scoped
}));

// Labels Relations - Updated to use projectId
export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, {
    fields: [labels.projectId],
    references: [projects.id],
  }),
  cards: many(cardLabels),
}));

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

// Team Members Relations - Connect team memberships to users and teams
export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  projectMemberships: many(projectTeamMembers), // Added relation to project memberships
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
  team: one(teams, {
    fields: [activityLog.teamId],
    references: [teams.id],
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
  team: one(teams, {
    fields: [notifications.teamId],
    references: [teams.id],
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
