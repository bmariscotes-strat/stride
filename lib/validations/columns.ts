// lib/validations/column.ts
import { z } from "zod";

// Base schemas
export const columnSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name must be less than 255 characters"),
  position: z.number().int().min(0, "Position must be a non-negative integer"),
  color: z
    .string()
    .max(50, "Color must be less than 50 characters")
    .optional()
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create column input validation
export const createColumnSchema = z.object({
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name must be less than 255 characters")
    .trim(),
  color: z.string().max(50, "Color must be less than 50 characters").optional(),
  position: z
    .number()
    .int()
    .min(0, "Position must be a non-negative integer")
    .optional(),
});

// Update column input validation
export const updateColumnSchema = z.object({
  id: z.string().uuid("Invalid column ID format"),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name must be less than 255 characters")
    .trim()
    .optional(),
  color: z
    .string()
    .max(50, "Color must be less than 50 characters")
    .optional()
    .nullable(),
  position: z
    .number()
    .int()
    .min(0, "Position must be a non-negative integer")
    .optional(),
});

// Delete column input validation
export const deleteColumnSchema = z.object({
  columnId: z.string().uuid("Invalid column ID format"),
  projectSlug: z.string().min(1, "Project slug is required"),
});

// Reorder columns input validation
export const reorderColumnsSchema = z.object({
  projectSlug: z.string().min(1, "Project slug is required"),
  columnOrders: z
    .array(
      z.object({
        id: z.string().uuid("Invalid column ID format"),
        position: z
          .number()
          .int()
          .min(0, "Position must be a non-negative integer"),
      })
    )
    .min(1, "At least one column order is required"),
});

// Project slug validation (used across multiple operations)
export const projectSlugSchema = z
  .string()
  .min(1, "Project slug is required")
  .max(255, "Project slug must be less than 255 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Project slug must contain only lowercase letters, numbers, and hyphens"
  );

// Column query parameters validation
export const columnQuerySchema = z.object({
  projectSlug: projectSlugSchema,
  enabled: z.boolean().optional().default(true),
});

// API response schemas
export const columnResponseSchema = columnSchema;

export const columnsListResponseSchema = z.array(columnSchema);

export const createColumnResponseSchema = columnSchema;

export const updateColumnResponseSchema = columnSchema;

export const deleteColumnResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedColumnId: z.string().uuid(),
});

export const reorderColumnsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  updatedColumns: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int(),
    })
  ),
});

// Hook input type validations
export const useCreateColumnInputSchema = createColumnSchema.extend({
  projectSlug: projectSlugSchema,
});

export const useUpdateColumnInputSchema = updateColumnSchema.extend({
  projectSlug: projectSlugSchema,
});

export const useDeleteColumnInputSchema = deleteColumnSchema;

export const useReorderColumnsInputSchema = reorderColumnsSchema;

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.any()).optional(),
});

// Type exports for use in your application
export type Column = z.infer<typeof columnSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type DeleteColumnInput = z.infer<typeof deleteColumnSchema>;
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;
export type ColumnResponse = z.infer<typeof columnResponseSchema>;
export type ColumnsListResponse = z.infer<typeof columnsListResponseSchema>;
export type CreateColumnResponse = z.infer<typeof createColumnResponseSchema>;
export type UpdateColumnResponse = z.infer<typeof updateColumnResponseSchema>;
export type DeleteColumnResponse = z.infer<typeof deleteColumnResponseSchema>;
export type ReorderColumnsResponse = z.infer<
  typeof reorderColumnsResponseSchema
>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
