// tests/lib/validations/column.test.ts
import {
  columnSchema,
  createColumnSchema,
  updateColumnSchema,
  deleteColumnSchema,
  reorderColumnsSchema,
  projectSlugSchema,
  columnQuerySchema,
  columnsListResponseSchema,
  createColumnResponseSchema,
  updateColumnResponseSchema,
  deleteColumnResponseSchema,
  reorderColumnsResponseSchema,
  useCreateColumnInputSchema,
  useUpdateColumnInputSchema,
  useDeleteColumnInputSchema,
  useReorderColumnsInputSchema,
  errorResponseSchema,
} from "@/lib/validations/columns";

describe("Column Validations", () => {
  describe("columnSchema", () => {
    const validColumn = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      projectId: "123e4567-e89b-12d3-a456-426614174001",
      name: "To Do",
      position: 0,
      color: "#3B82F6",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should validate a valid column", () => {
      const result = columnSchema.safeParse(validColumn);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for id", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("Invalid uuid");
    });

    it("should reject invalid UUID for projectId", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        projectId: "invalid-uuid",
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("Invalid uuid");
    });

    it("should reject empty name", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 255 characters", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        name: "a".repeat(256),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Column name must be less than 255 characters"
      );
    });

    it("should reject negative position", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        position: -1,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Position must be a non-negative integer"
      );
    });

    it("should allow null color", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        color: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject color longer than 50 characters", () => {
      const result = columnSchema.safeParse({
        ...validColumn,
        color: "a".repeat(51),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Color must be less than 50 characters"
      );
    });
  });

  describe("createColumnSchema", () => {
    it("should validate valid create column input", () => {
      const validInput = {
        name: "In Progress",
        color: "#F59E0B",
        position: 1,
      };
      const result = createColumnSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate minimal create column input", () => {
      const minimalInput = {
        name: "Done",
      };
      const result = createColumnSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from name", () => {
      const input = {
        name: "  Backlog  ",
      };
      const result = createColumnSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Backlog");
      }
    });

    it("should reject empty name", () => {
      const input = {
        name: "",
      };
      const result = createColumnSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Column name is required");
    });

    it("should reject whitespace-only name", () => {
      const input = {
        name: "   ",
      };
      const result = createColumnSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Column name is required");
    });

    it("should reject negative position", () => {
      const input = {
        name: "Test Column",
        position: -1,
      };
      const result = createColumnSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Position must be a non-negative integer"
      );
    });
  });

  describe("updateColumnSchema", () => {
    const validUpdateInput = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Updated Column",
      color: "#10B981",
      position: 2,
    };

    it("should validate valid update column input", () => {
      const result = updateColumnSchema.safeParse(validUpdateInput);
      expect(result.success).toBe(true);
    });

    it("should validate partial update with only id and name", () => {
      const input = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "New Name",
      };
      const result = updateColumnSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate update with null color", () => {
      const input = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        color: null,
      };
      const result = updateColumnSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for id", () => {
      const input = {
        ...validUpdateInput,
        id: "invalid-uuid",
      };
      const result = updateColumnSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Invalid column ID format");
    });

    it("should trim whitespace from name", () => {
      const input = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "  Trimmed Name  ",
      };
      const result = updateColumnSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Trimmed Name");
      }
    });
  });

  describe("deleteColumnSchema", () => {
    it("should validate valid delete column input", () => {
      const input = {
        columnId: "123e4567-e89b-12d3-a456-426614174000",
        projectSlug: "my-project",
      };
      const result = deleteColumnSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for columnId", () => {
      const input = {
        columnId: "invalid-uuid",
        projectSlug: "my-project",
      };
      const result = deleteColumnSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Invalid column ID format");
    });

    it("should reject empty project slug", () => {
      const input = {
        columnId: "123e4567-e89b-12d3-a456-426614174000",
        projectSlug: "",
      };
      const result = deleteColumnSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Project slug is required");
    });
  });

  describe("reorderColumnsSchema", () => {
    it("should validate valid reorder columns input", () => {
      const input = {
        projectSlug: "my-project",
        columnOrders: [
          { id: "123e4567-e89b-12d3-a456-426614174000", position: 0 },
          { id: "123e4567-e89b-12d3-a456-426614174001", position: 1 },
          { id: "123e4567-e89b-12d3-a456-426614174002", position: 2 },
        ],
      };
      const result = reorderColumnsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty columnOrders array", () => {
      const input = {
        projectSlug: "my-project",
        columnOrders: [],
      };
      const result = reorderColumnsSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "At least one column order is required"
      );
    });

    it("should reject invalid UUID in columnOrders", () => {
      const input = {
        projectSlug: "my-project",
        columnOrders: [{ id: "invalid-uuid", position: 0 }],
      };
      const result = reorderColumnsSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Invalid column ID format");
    });

    it("should reject negative position in columnOrders", () => {
      const input = {
        projectSlug: "my-project",
        columnOrders: [
          { id: "123e4567-e89b-12d3-a456-426614174000", position: -1 },
        ],
      };
      const result = reorderColumnsSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Position must be a non-negative integer"
      );
    });
  });

  describe("projectSlugSchema", () => {
    it("should validate valid project slug", () => {
      const validSlugs = [
        "my-project",
        "project-1",
        "simple",
        "multi-word-project",
        "project123",
        "123-project",
      ];

      validSlugs.forEach((slug) => {
        const result = projectSlugSchema.safeParse(slug);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid project slugs", () => {
      const invalidSlugs = [
        "",
        "My-Project", // uppercase
        "project_name", // underscore
        "project ", // trailing space
        " project", // leading space
        "project--name", // double hyphens
        "-project", // starting with hyphen
        "project-", // ending with hyphen
        "project.name", // dot
        "project@name", // special character
      ];

      invalidSlugs.forEach((slug) => {
        const result = projectSlugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      });
    });

    it("should reject slug longer than 255 characters", () => {
      const longSlug = "a".repeat(256);
      const result = projectSlugSchema.safeParse(longSlug);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Project slug must be less than 255 characters"
      );
    });
  });

  describe("columnQuerySchema", () => {
    it("should validate valid query parameters", () => {
      const input = {
        projectSlug: "my-project",
        enabled: true,
      };
      const result = columnQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should use default value for enabled", () => {
      const input = {
        projectSlug: "my-project",
      };
      const result = columnQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });
  });

  describe("Response schemas", () => {
    describe("deleteColumnResponseSchema", () => {
      it("should validate valid delete response", () => {
        const response = {
          success: true,
          message: "Column deleted successfully",
          deletedColumnId: "123e4567-e89b-12d3-a456-426614174000",
        };
        const result = deleteColumnResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    describe("reorderColumnsResponseSchema", () => {
      it("should validate valid reorder response", () => {
        const response = {
          success: true,
          message: "Columns reordered successfully",
          updatedColumns: [
            { id: "123e4567-e89b-12d3-a456-426614174000", position: 0 },
            { id: "123e4567-e89b-12d3-a456-426614174001", position: 1 },
          ],
        };
        const result = reorderColumnsResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    describe("errorResponseSchema", () => {
      it("should validate error response", () => {
        const error = {
          error: "Column not found",
          details: { columnId: "123" },
        };
        const result = errorResponseSchema.safeParse(error);
        expect(result.success).toBe(true);
      });

      it("should validate error response without details", () => {
        const error = {
          error: "Internal server error",
        };
        const result = errorResponseSchema.safeParse(error);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Hook input schemas", () => {
    describe("useCreateColumnInputSchema", () => {
      it("should validate valid hook input", () => {
        const input = {
          name: "New Column",
          color: "#EF4444",
          position: 1,
          projectSlug: "my-project",
        };
        const result = useCreateColumnInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe("useUpdateColumnInputSchema", () => {
      it("should validate valid hook input", () => {
        const input = {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Updated Column",
          projectSlug: "my-project",
        };
        const result = useUpdateColumnInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe("useDeleteColumnInputSchema", () => {
      it("should validate valid hook input", () => {
        const input = {
          columnId: "123e4567-e89b-12d3-a456-426614174000",
          projectSlug: "my-project",
        };
        const result = useDeleteColumnInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe("useReorderColumnsInputSchema", () => {
      it("should validate valid hook input", () => {
        const input = {
          projectSlug: "my-project",
          columnOrders: [
            { id: "123e4567-e89b-12d3-a456-426614174000", position: 0 },
            { id: "123e4567-e89b-12d3-a456-426614174001", position: 1 },
          ],
        };
        const result = useReorderColumnsInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });
});
