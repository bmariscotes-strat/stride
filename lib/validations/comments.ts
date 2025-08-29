// lib/validations/comment.ts
import { z } from "zod";

// Base schemas
const uuidSchema = z.string().uuid("Invalid UUID format");
const commentIdSchema = z.coerce
  .number()
  .int("Comment ID must be an integer")
  .positive("Comment ID must be positive");

// Content validation with mention support
const commentContentSchema = z
  .string()
  .min(1, "Comment content is required")
  .max(5000, "Comment content cannot exceed 5000 characters")
  .trim();

// Create comment validation
export const createCommentSchema = z.object({
  cardId: uuidSchema,
  content: commentContentSchema,
  parentId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
});

// Update comment validation
export const updateCommentSchema = z.object({
  commentId: z.coerce.number().int().positive(),
  content: commentContentSchema,
});

export const deleteCommentSchema = z.object({
  commentId: z.coerce.number().int().positive(),
});

// Get comments validation
export const getCardCommentsSchema = z.object({
  cardId: uuidSchema,
});

// Comment stats validation
export const getCommentStatsSchema = z.object({
  cardId: uuidSchema,
});

// Recent comments validation
export const getRecentCommentsSchema = z.object({
  projectId: uuidSchema,
  limit: z
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

// User mentioned comments validation
export const getUserMentionedCommentsSchema = z.object({
  userId: uuidSchema,
  limit: z
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50),
});

// Mark mentions as read validation
export const markMentionsAsReadSchema = z.object({
  userId: uuidSchema,
  commentIds: z
    .array(commentIdSchema)
    .min(1, "At least one comment ID is required")
    .max(50, "Cannot mark more than 50 mentions at once"),
});

// Response schemas
export const userSchema = z.object({
  id: uuidSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
});

export const mentionSchema = z.object({
  id: z.number().int(),
  commentId: z.number().int(),
  mentionedUserId: uuidSchema,
  mentionedBy: uuidSchema,
  createdAt: z.date(),
  mentionedUser: userSchema,
});

export const baseCommentSchema = z.object({
  id: z.number().int(),
  cardId: uuidSchema,
  userId: uuidSchema,
  content: z.string(),
  parentId: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: userSchema,
  mentions: z.array(mentionSchema),
});

// Recursive comment schema for replies
export const commentWithRepliesSchema: z.ZodType<any> =
  baseCommentSchema.extend({
    replies: z.lazy(() => z.array(commentWithRepliesSchema)),
  });

export const commentStatsSchema = z.object({
  totalComments: z.number().int().min(0),
  commentsWithMentions: z.number().int().min(0),
  uniqueCommenters: z.number().int().min(0),
});

export const cardInfoSchema = z.object({
  id: uuidSchema,
  title: z.string(),
});

export const projectInfoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});

export const recentCommentSchema = baseCommentSchema.extend({
  card: cardInfoSchema,
});

export const mentionedCommentSchema = baseCommentSchema.extend({
  card: cardInfoSchema.extend({
    column: z.object({
      project: projectInfoSchema,
    }),
  }),
});

// Service response schemas
export const createCommentResponseSchema = z.object({
  success: z.boolean(),
  comment: baseCommentSchema.optional(),
});

export const updateCommentResponseSchema = z.object({
  success: z.boolean(),
  comment: baseCommentSchema.optional(),
});

export const deleteCommentResponseSchema = z.object({
  success: z.boolean(),
});

export const getCommentsResponseSchema = z.array(commentWithRepliesSchema);

export const getCommentStatsResponseSchema = commentStatsSchema;

export const getRecentCommentsResponseSchema = z.array(recentCommentSchema);

export const getUserMentionedCommentsResponseSchema = z.array(
  mentionedCommentSchema
);

export const markMentionsAsReadResponseSchema = z.object({
  success: z.boolean(),
});

// Hook-specific schemas (matching your useComments hook)
export const hookCreateCommentSchema = z.object({
  cardId: uuidSchema,
  content: commentContentSchema,
  parentId: z.number().int().positive().optional(),
});

export const hookUpdateCommentSchema = z.object({
  commentId: z.number().int().positive(),
  content: commentContentSchema,
});

export const hookDeleteCommentSchema = z.object({
  commentId: z.number().int().positive(),
});

// Type exports
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type GetCardCommentsInput = z.infer<typeof getCardCommentsSchema>;
export type GetCommentStatsInput = z.infer<typeof getCommentStatsSchema>;
export type GetRecentCommentsInput = z.infer<typeof getRecentCommentsSchema>;
export type GetUserMentionedCommentsInput = z.infer<
  typeof getUserMentionedCommentsSchema
>;
export type MarkMentionsAsReadInput = z.infer<typeof markMentionsAsReadSchema>;

export type User = z.infer<typeof userSchema>;
export type Mention = z.infer<typeof mentionSchema>;
export type BaseComment = z.infer<typeof baseCommentSchema>;
export type CommentWithReplies = z.infer<typeof commentWithRepliesSchema>;
export type CommentStats = z.infer<typeof commentStatsSchema>;
export type RecentComment = z.infer<typeof recentCommentSchema>;
export type MentionedComment = z.infer<typeof mentionedCommentSchema>;

export type CreateCommentResponse = z.infer<typeof createCommentResponseSchema>;
export type UpdateCommentResponse = z.infer<typeof updateCommentResponseSchema>;
export type DeleteCommentResponse = z.infer<typeof deleteCommentResponseSchema>;
export type GetCommentsResponse = z.infer<typeof getCommentsResponseSchema>;
export type GetCommentStatsResponse = z.infer<
  typeof getCommentStatsResponseSchema
>;
export type GetRecentCommentsResponse = z.infer<
  typeof getRecentCommentsResponseSchema
>;
export type GetUserMentionedCommentsResponse = z.infer<
  typeof getUserMentionedCommentsResponseSchema
>;
export type MarkMentionsAsReadResponse = z.infer<
  typeof markMentionsAsReadResponseSchema
>;

// Hook-specific types
export type HookCreateCommentInput = z.infer<typeof hookCreateCommentSchema>;
export type HookUpdateCommentInput = z.infer<typeof hookUpdateCommentSchema>;
export type HookDeleteCommentInput = z.infer<typeof hookDeleteCommentSchema>;
