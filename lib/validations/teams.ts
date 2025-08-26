// lib/validations/team.ts
import { z } from "zod";

// Base schemas
const uuidSchema = z.string().uuid("Invalid UUID format");
const emailSchema = z.string().email("Invalid email format");
const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug cannot exceed 50 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug can only contain lowercase letters, numbers, and hyphens"
  )
  .refine((val) => !val.startsWith("-") && !val.endsWith("-"), {
    message: "Slug cannot start or end with a hyphen",
  });

const teamNameSchema = z
  .string()
  .min(1, "Team name is required")
  .max(255, "Team name cannot exceed 255 characters")
  .trim();

const teamDescriptionSchema = z
  .string()
  .max(1000, "Description cannot exceed 1000 characters")
  .optional();

// Enum schemas
export const teamRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export const projectTeamRoleSchema = z.enum(["admin", "editor", "viewer"]);

// Team creation validation
export const createTeamSchema = z.object({
  name: teamNameSchema,
  slug: slugSchema,
  description: teamDescriptionSchema,
  members: z
    .array(emailSchema)
    .max(50, "Cannot invite more than 50 members at once")
    .default([]),
  createdBy: uuidSchema,
});

// Team update validation
export const updateTeamSchema = z.object({
  name: teamNameSchema.optional(),
  slug: slugSchema.optional(),
  description: teamDescriptionSchema,
});

// Add team members validation
export const addTeamMembersSchema = z.object({
  teamId: uuidSchema,
  memberEmails: z
    .array(emailSchema)
    .min(1, "At least one email is required")
    .max(20, "Cannot invite more than 20 members at once"),
  invitedBy: uuidSchema,
});

// Remove team member validation
export const removeTeamMemberSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
  removedBy: uuidSchema,
});

// Update team member role validation
export const updateTeamMemberRoleSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
  newRole: teamRoleSchema.exclude(["owner"]), // Cannot update to owner role
  updatedBy: uuidSchema,
});

// Archive team validation
export const archiveTeamSchema = z.object({
  teamId: uuidSchema,
  archivedBy: uuidSchema,
});

// Delete team validation
export const deleteTeamSchema = z.object({
  teamId: uuidSchema,
  deletedBy: uuidSchema,
  confirmationText: z.string().min(1, "Confirmation text is required"),
});

// Team query validation
export const getTeamBySlugSchema = z.object({
  slug: slugSchema,
  userId: uuidSchema,
});

// Response schemas
export const teamMemberSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  userId: uuidSchema,
  role: teamRoleSchema,
  joinedAt: z.date(),
  user: z.object({
    id: uuidSchema,
    email: emailSchema,
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().url().nullable(),
  }),
});

export const teamSchema = z.object({
  id: uuidSchema,
  name: teamNameSchema,
  slug: slugSchema,
  description: teamDescriptionSchema,
  isPersonal: z.boolean(),
  isArchived: z.boolean(),
  createdBy: uuidSchema,
  schemaVersion: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  members: z.array(teamMemberSchema).optional(),
  currentUserRole: teamRoleSchema.nullable().optional(),
});

// Invitation result schema
export const invitationResultSchema = z.object({
  email: emailSchema,
  success: z.boolean(),
  invitationId: z.string().optional(),
  error: z.string().optional(),
});

// Service response schemas
export const createTeamResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    team: teamSchema,
    invitationResults: z.array(invitationResultSchema).optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const addMembersResponseSchema = z.object({
  success: z.boolean(),
  results: z.array(invitationResultSchema),
});

export const genericTeamActionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const updateTeamResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  team: teamSchema.optional(),
});

// Type exports
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMembersInput = z.infer<typeof addTeamMembersSchema>;
export type RemoveTeamMemberInput = z.infer<typeof removeTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<
  typeof updateTeamMemberRoleSchema
>;
export type ArchiveTeamInput = z.infer<typeof archiveTeamSchema>;
export type DeleteTeamInput = z.infer<typeof deleteTeamSchema>;
export type GetTeamBySlugInput = z.infer<typeof getTeamBySlugSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Team = z.infer<typeof teamSchema>;
export type InvitationResult = z.infer<typeof invitationResultSchema>;
export type CreateTeamResponse = z.infer<typeof createTeamResponseSchema>;
export type AddMembersResponse = z.infer<typeof addMembersResponseSchema>;
export type GenericTeamActionResponse = z.infer<
  typeof genericTeamActionResponseSchema
>;
export type UpdateTeamResponse = z.infer<typeof updateTeamResponseSchema>;
