import { z } from "zod";

// Base card validation schemas
export const cardPrioritySchema = z
  .enum(["high", "medium", "low"])
  .nullable()
  .optional();

export const cardDateSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  })
  .nullable()
  .optional();

export const cardLabelIdsSchema = z
  .array(z.string().min(1, "Label ID cannot be empty"))
  .optional();

// Create card validation schema
export const createCardSchema = z
  .object({
    columnId: z.string().min(1, "Column ID is required"),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 255 characters"),
    description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .nullable()
      .optional(),
    priority: cardPrioritySchema,
    assigneeId: z.string().min(1).nullable().optional(),
    dueDate: cardDateSchema,
    startDate: cardDateSchema,
    status: z
      .string()
      .max(50, "Status must be less than 50 characters")
      .nullable()
      .optional(),
    position: z
      .number()
      .min(0, "Position must be a non-negative number")
      .optional(),
    labelIds: cardLabelIdsSchema,
  })
  .refine(
    (data) => {
      // Custom validation: startDate should not be after dueDate
      if (data.startDate && data.dueDate) {
        const start = new Date(data.startDate);
        const due = new Date(data.dueDate);
        return start <= due;
      }
      return true;
    },
    {
      message: "Start date cannot be after due date",
      path: ["startDate"], // This will attach the error to startDate field
    }
  );

// Update card validation schema
export const updateCardSchema = z
  .object({
    id: z.string().min(1, "Card ID is required"),
    columnId: z.string().min(1).optional(),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 255 characters")
      .optional(),
    description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .nullable()
      .optional(),
    priority: cardPrioritySchema,
    assigneeId: z.string().min(1).nullable().optional(),
    dueDate: cardDateSchema,
    startDate: cardDateSchema,
    status: z
      .string()
      .max(50, "Status must be less than 50 characters")
      .nullable()
      .optional(),
    position: z
      .number()
      .min(0, "Position must be a non-negative number")
      .optional(),
    labelIds: cardLabelIdsSchema,
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Custom validation: startDate should not be after dueDate
      if (data.startDate && data.dueDate) {
        const start = new Date(data.startDate);
        const due = new Date(data.dueDate);
        return start <= due;
      }
      return true;
    },
    {
      message: "Start date cannot be after due date",
      path: ["startDate"],
    }
  );

// Bulk update cards schema (for drag & drop operations)
export const bulkUpdateCardsSchema = z.array(
  z.object({
    id: z.string().min(1, "Card ID is required"),
    columnId: z.string().min(1, "Column ID is required"),
    position: z.number().min(0, "Position must be a non-negative number"),
  })
);

// Query parameters schema for GET requests
export const getCardsQuerySchema = z.object({
  includeArchived: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  labelId: z.string().optional(),
  search: z
    .string()
    .max(255, "Search term must be less than 255 characters")
    .optional(),
});

// Type exports for use in your application
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type BulkUpdateCardsInput = z.infer<typeof bulkUpdateCardsSchema>;
export type GetCardsQuery = z.infer<typeof getCardsQuerySchema>;

// Validation helper functions
export const validateCreateCard = (data: unknown): CreateCardInput => {
  return createCardSchema.parse(data);
};

export const validateUpdateCard = (data: unknown): UpdateCardInput => {
  return updateCardSchema.parse(data);
};

export const validateBulkUpdateCards = (
  data: unknown
): BulkUpdateCardsInput => {
  return bulkUpdateCardsSchema.parse(data);
};

export const validateGetCardsQuery = (data: unknown): GetCardsQuery => {
  return getCardsQuerySchema.parse(data);
};

// Safe validation helpers that return results instead of throwing
export const safeValidateCreateCard = (data: unknown) => {
  return createCardSchema.safeParse(data);
};

export const safeValidateUpdateCard = (data: unknown) => {
  return updateCardSchema.safeParse(data);
};

export const safeValidateBulkUpdateCards = (data: unknown) => {
  return bulkUpdateCardsSchema.safeParse(data);
};

export const safeValidateGetCardsQuery = (data: unknown) => {
  return getCardsQuerySchema.safeParse(data);
};
