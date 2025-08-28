import { z } from "zod";

// Enums
export const PriorityEnum = z.enum(["high", "medium", "low"]);
export const TeamRoleEnum = z.enum(["owner", "admin", "member", "viewer"]);
export const ProjectTeamRoleEnum = z.enum(["admin", "editor", "viewer"]);

// Base schemas
export const UUIDSchema = z.string().uuid("Invalid UUID format");
export const SlugSchema = z
  .string()
  .min(1, "Slug cannot be empty")
  .max(255, "Slug must be less than 255 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  );

// User schemas
export const UserSchema = z.object({
  id: UUIDSchema,
  clerkUserId: z.string().min(1, "Clerk user ID is required"),
  email: z.string().email("Invalid email format"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(255, "Username must be less than 255 characters"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(255, "First name must be less than 255 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(255, "Last name must be less than 255 characters"),
  jobPosition: z
    .string()
    .max(50, "Job position must be less than 50 characters")
    .optional()
    .nullable(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
  personalTeamId: UUIDSchema.optional().nullable(),
  schemaVersion: z.number().int().min(1).default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserPartialSchema = z.object({
  id: UUIDSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable().optional(),
  username: z.string().optional(),
});

// Team schemas
export const TeamSchema = z.object({
  id: UUIDSchema,
  name: z
    .string()
    .min(1, "Team name is required")
    .max(255, "Team name must be less than 255 characters"),
  slug: SlugSchema,
  description: z.string().optional().nullable(),
  isPersonal: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  createdBy: UUIDSchema,
  schemaVersion: z.number().int().min(1).default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TeamPartialSchema = z.object({
  id: UUIDSchema,
  name: z.string(),
  slug: SlugSchema,
});

// Team member schemas
export const TeamMemberSchema = z.object({
  id: UUIDSchema,
  teamId: UUIDSchema,
  userId: UUIDSchema,
  role: TeamRoleEnum.default("member"),
  joinedAt: z.date(),
});

export const TeamMemberWithUserSchema = TeamMemberSchema.extend({
  user: UserSchema,
});

// Project schemas
export const ProjectBaseSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be less than 255 characters")
    .trim(),
  slug: SlugSchema,
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .nullable(),
  colorTheme: z
    .string()
    .max(50, "Color theme must be less than 50 characters")
    .optional()
    .nullable(),
  isArchived: z.boolean().default(false),
});

export const ProjectSchema = ProjectBaseSchema.extend({
  id: UUIDSchema,
  ownerId: UUIDSchema,
  schemaVersion: z.number().int().min(1).default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProjectWithRelationsSchema = ProjectSchema.extend({
  owner: UserPartialSchema,
  teams: z.array(TeamPartialSchema).optional(),
  projectTeamMembers: z
    .array(
      z.object({
        id: UUIDSchema,
        projectId: UUIDSchema,
        teamMemberId: UUIDSchema,
        role: ProjectTeamRoleEnum,
        addedBy: UUIDSchema,
        createdAt: z.date(),
        updatedAt: z.date(),
        teamMember: z.object({
          id: UUIDSchema,
          teamId: UUIDSchema,
          userId: UUIDSchema,
          role: TeamRoleEnum,
          joinedAt: z.date(),
          user: UserSchema,
        }),
      })
    )
    .optional(),
  columns: z
    .array(
      z.object({
        id: UUIDSchema,
        projectId: UUIDSchema,
        name: z.string(),
        position: z.number().int().min(0),
        color: z.string().optional().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        cards: z
          .array(
            z.object({
              id: UUIDSchema,
              columnId: UUIDSchema,
              title: z.string(),
              description: z.string().optional().nullable(),
              assigneeId: UUIDSchema.optional().nullable(),
              priority: PriorityEnum.optional().nullable(),
              startDate: z.date().optional().nullable(),
              dueDate: z.date().optional().nullable(),
              position: z.number().int().min(0),
              status: z.string().optional().nullable(),
              isArchived: z.boolean().default(false),
              schemaVersion: z.number().int().min(1).default(1),
              createdAt: z.date(),
              updatedAt: z.date(),
              assignee: UserPartialSchema.optional().nullable(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  labels: z
    .array(
      z.object({
        id: UUIDSchema,
        name: z.string().max(100),
        color: z.string().max(50),
        createdAt: z.date(),
      })
    )
    .optional(),
  userRole: z.string().optional(),
});

// Create project schemas
export const CreateProjectSchema = ProjectBaseSchema.extend({
  ownerId: UUIDSchema,
});

export const CreateProjectWithTeamsSchema = CreateProjectSchema.extend({
  teamIds: z
    .array(UUIDSchema)
    .min(1, "At least one team must be selected")
    .max(10, "Cannot assign more than 10 teams"),
  memberRoles: z.record(UUIDSchema, ProjectTeamRoleEnum).optional().default({}),
});

// Update project schemas
export const UpdateProjectSchema = z.object({
  id: UUIDSchema,
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be less than 255 characters")
    .trim()
    .optional(),
  slug: SlugSchema.optional(),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .nullable(),
  colorTheme: z
    .string()
    .max(50, "Color theme must be less than 50 characters")
    .optional()
    .nullable(),
  isArchived: z.boolean().optional(),
});

export const UpdateProjectWithTeamsSchema = UpdateProjectSchema.extend({
  userId: UUIDSchema,
  teamIds: z
    .array(UUIDSchema)
    .min(1, "At least one team must be selected")
    .max(10, "Cannot assign more than 10 teams")
    .optional(),
  memberRoles: z.record(UUIDSchema, ProjectTeamRoleEnum).optional().default({}),
});

// Project list options
export const ProjectsListOptionsSchema = z.object({
  teamId: UUIDSchema.optional(),
  ownerId: UUIDSchema.optional(),
  isArchived: z.boolean().optional().default(false),
  search: z
    .string()
    .max(255, "Search term must be less than 255 characters")
    .optional(),
  orderBy: z.enum(["name", "createdAt", "updatedAt"]).default("updatedAt"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50),
  offset: z.number().int().min(0, "Offset must be non-negative").default(0),
});

// Project role assignment
export const AssignProjectRoleSchema = z.object({
  projectId: UUIDSchema,
  memberId: UUIDSchema,
  newRole: ProjectTeamRoleEnum,
});

// Project team management
export const AddTeamsToProjectSchema = z.object({
  projectId: UUIDSchema,
  teamIds: z
    .array(UUIDSchema)
    .min(1, "At least one team must be selected")
    .max(10, "Cannot add more than 10 teams"),
  userId: UUIDSchema,
  memberRoles: z.record(UUIDSchema, ProjectTeamRoleEnum).optional().default({}),
});

export const RemoveTeamsFromProjectSchema = z.object({
  projectId: UUIDSchema,
  teamIds: z.array(UUIDSchema).min(1, "At least one team must be selected"),
  userId: UUIDSchema,
});

// Service response schemas
export const ProjectActionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable(),
  project: ProjectSchema.nullable(),
});

export const ProjectActionWithTeamsResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable(),
  project: ProjectSchema.nullable(),
  addedTeams: z.array(UUIDSchema).optional(),
  removedTeams: z.array(UUIDSchema).optional(),
});

export const AssignProjectRoleResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable(),
  updatedRole: ProjectTeamRoleEnum.optional(),
});

// Validation helper functions
export const validateCreateProject = (data: unknown) => {
  return CreateProjectWithTeamsSchema.parse(data);
};

export const validateUpdateProject = (data: unknown) => {
  return UpdateProjectWithTeamsSchema.parse(data);
};

export const validateProjectsListOptions = (data: unknown) => {
  return ProjectsListOptionsSchema.parse(data);
};

export const validateAssignProjectRole = (data: unknown) => {
  return AssignProjectRoleSchema.parse(data);
};

export const validateAddTeamsToProject = (data: unknown) => {
  return AddTeamsToProjectSchema.parse(data);
};

export const validateRemoveTeamsFromProject = (data: unknown) => {
  return RemoveTeamsFromProjectSchema.parse(data);
};

// Type exports for use in application
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type CreateProjectWithTeams = z.infer<
  typeof CreateProjectWithTeamsSchema
>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type UpdateProjectWithTeams = z.infer<
  typeof UpdateProjectWithTeamsSchema
>;
export type ProjectsListOptions = z.infer<typeof ProjectsListOptionsSchema>;
export type AssignProjectRole = z.infer<typeof AssignProjectRoleSchema>;
export type ProjectActionResponse = z.infer<typeof ProjectActionResponseSchema>;
export type ProjectWithRelations = z.infer<typeof ProjectWithRelationsSchema>;
