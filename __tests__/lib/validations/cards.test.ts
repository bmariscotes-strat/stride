// __tests__/lib/validations/cards.test.ts
import {
  createCardSchema,
  updateCardSchema,
  bulkUpdateCardsSchema,
  getCardsQuerySchema,
  validateCreateCard,
  validateUpdateCard,
  safeValidateCreateCard,
  safeValidateUpdateCard,
  type CreateCardInput,
  type UpdateCardInput,
} from "@/lib/validations/cards";
import { z } from "zod";

describe("Card Validations", () => {
  describe("createCardSchema", () => {
    const validCreateCardData: CreateCardInput = {
      columnId: "col_123",
      title: "Test Card",
      description: "Test description",
      priority: "high",
      assigneeId: "user_123",
      dueDate: "2024-12-31T23:59:59Z",
      startDate: "2024-12-01T00:00:00Z",
      status: "todo",
      position: 0,
      labelIds: ["label_1", "label_2"],
    };

    it("should validate a complete valid card creation request", () => {
      const result = createCardSchema.parse(validCreateCardData);
      expect(result).toEqual(validCreateCardData);
    });

    it("should validate minimal required fields only", () => {
      const minimalData = {
        columnId: "col_123",
        title: "Test Card",
      };

      const result = createCardSchema.parse(minimalData);
      expect(result.columnId).toBe("col_123");
      expect(result.title).toBe("Test Card");
    });

    it("should reject missing required columnId", () => {
      const invalidData = {
        title: "Test Card",
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow();
    });

    it("should reject empty columnId", () => {
      const invalidData = {
        columnId: "",
        title: "Test Card",
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Column ID is required"
      );
    });

    it("should reject missing required title", () => {
      const invalidData = {
        columnId: "col_123",
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow();
    });

    it("should reject empty title", () => {
      const invalidData = {
        columnId: "col_123",
        title: "",
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Title is required"
      );
    });

    it("should reject title that is too long", () => {
      const invalidData = {
        columnId: "col_123",
        title: "a".repeat(256), // 256 characters
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Title must be less than 255 characters"
      );
    });

    it("should reject invalid priority values", () => {
      const invalidData = {
        columnId: "col_123",
        title: "Test Card",
        priority: "urgent", // invalid priority
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow();
    });

    it("should accept valid priority values", () => {
      const validPriorities = ["high", "medium", "low", null];

      validPriorities.forEach((priority) => {
        const data = {
          columnId: "col_123",
          title: "Test Card",
          priority,
        };

        expect(() => createCardSchema.parse(data)).not.toThrow();
      });
    });

    it("should reject invalid date formats", () => {
      const invalidData = {
        columnId: "col_123",
        title: "Test Card",
        dueDate: "invalid-date",
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Invalid date format"
      );
    });

    it("should accept valid date formats", () => {
      const validDates = [
        "2024-12-31T23:59:59Z",
        "2024-12-31",
        "2024-12-31T10:30:00.000Z",
        null,
      ];

      validDates.forEach((date) => {
        const data = {
          columnId: "col_123",
          title: "Test Card",
          dueDate: date,
        };

        expect(() => createCardSchema.parse(data)).not.toThrow();
      });
    });

    it("should reject when startDate is after dueDate", () => {
      const invalidData = {
        columnId: "col_123",
        title: "Test Card",
        startDate: "2024-12-31T23:59:59Z",
        dueDate: "2024-12-01T00:00:00Z", // due date is before start date
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Start date cannot be after due date"
      );
    });

    it("should accept when startDate is before or equal to dueDate", () => {
      const validData = {
        columnId: "col_123",
        title: "Test Card",
        startDate: "2024-12-01T00:00:00Z",
        dueDate: "2024-12-31T23:59:59Z",
      };

      expect(() => createCardSchema.parse(validData)).not.toThrow();
    });

    it("should reject negative position values", () => {
      const invalidData = {
        columnId: "col_123",
        title: "Test Card",
        position: -1,
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Position must be a non-negative number"
      );
    });

    it("should reject empty strings in labelIds array", () => {
      const invalidData = {
        columnId: "col_123",
        title: "Test Card",
        labelIds: ["label_1", "", "label_2"],
      };

      expect(() => createCardSchema.parse(invalidData)).toThrow(
        "Label ID cannot be empty"
      );
    });

    it("should accept valid labelIds array", () => {
      const validData = {
        columnId: "col_123",
        title: "Test Card",
        labelIds: ["label_1", "label_2", "label_3"],
      };

      expect(() => createCardSchema.parse(validData)).not.toThrow();
    });
  });

  describe("updateCardSchema", () => {
    it("should validate a complete valid card update request", () => {
      const validData: UpdateCardInput = {
        id: "card_123",
        title: "Updated Card",
        description: "Updated description",
        priority: "medium",
        assigneeId: "user_456",
        dueDate: "2024-12-31T23:59:59Z",
        startDate: "2024-12-01T00:00:00Z",
        status: "in-progress",
        position: 5,
        labelIds: ["label_1"],
        isArchived: false,
      };

      const result = updateCardSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("should validate minimal update with only id", () => {
      const minimalData = {
        id: "card_123",
      };

      const result = updateCardSchema.parse(minimalData);
      expect(result.id).toBe("card_123");
    });

    it("should reject missing required id", () => {
      const invalidData = {
        title: "Updated Card",
      };

      expect(() => updateCardSchema.parse(invalidData)).toThrow();
    });

    it("should reject empty id", () => {
      const invalidData = {
        id: "",
        title: "Updated Card",
      };

      expect(() => updateCardSchema.parse(invalidData)).toThrow(
        "Card ID is required"
      );
    });

    it("should apply the same date validation as create schema", () => {
      const invalidData = {
        id: "card_123",
        startDate: "2024-12-31T23:59:59Z",
        dueDate: "2024-12-01T00:00:00Z",
      };

      expect(() => updateCardSchema.parse(invalidData)).toThrow(
        "Start date cannot be after due date"
      );
    });
  });

  describe("bulkUpdateCardsSchema", () => {
    it("should validate array of card updates", () => {
      const validData = [
        { id: "card_1", columnId: "col_1", position: 0 },
        { id: "card_2", columnId: "col_1", position: 1 },
        { id: "card_3", columnId: "col_2", position: 0 },
      ];

      const result = bulkUpdateCardsSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("should reject empty array items", () => {
      const invalidData = [{ id: "", columnId: "col_1", position: 0 }];

      expect(() => bulkUpdateCardsSchema.parse(invalidData)).toThrow();
    });

    it("should reject negative positions in bulk updates", () => {
      const invalidData = [{ id: "card_1", columnId: "col_1", position: -1 }];

      expect(() => bulkUpdateCardsSchema.parse(invalidData)).toThrow();
    });
  });

  describe("getCardsQuerySchema", () => {
    it("should validate query parameters", () => {
      const validQuery = {
        includeArchived: "true",
        assigneeId: "user_123",
        priority: "high",
        labelId: "label_456",
        search: "test query",
      };

      const result = getCardsQuerySchema.parse(validQuery);
      expect(result.includeArchived).toBe(true);
      expect(result.assigneeId).toBe("user_123");
    });

    it("should transform includeArchived string to boolean", () => {
      const queryTrue = { includeArchived: "true" };
      const queryFalse = { includeArchived: "false" };

      const resultTrue = getCardsQuerySchema.parse(queryTrue);
      const resultFalse = getCardsQuerySchema.parse(queryFalse);

      expect(resultTrue.includeArchived).toBe(true);
      expect(resultFalse.includeArchived).toBe(false);
    });

    it("should reject search terms that are too long", () => {
      const invalidQuery = {
        search: "a".repeat(256),
      };

      expect(() => getCardsQuerySchema.parse(invalidQuery)).toThrow();
    });
  });

  describe("validation helper functions", () => {
    describe("validateCreateCard", () => {
      it("should return parsed data for valid input", () => {
        const validData = {
          columnId: "col_123",
          title: "Test Card",
        };

        const result = validateCreateCard(validData);
        expect(result).toEqual(validData);
      });

      it("should throw ZodError for invalid input", () => {
        const invalidData = {
          title: "Test Card", // missing columnId
        };

        expect(() => validateCreateCard(invalidData)).toThrow(z.ZodError);
      });
    });

    describe("safeValidateCreateCard", () => {
      it("should return success result for valid input", () => {
        const validData = {
          columnId: "col_123",
          title: "Test Card",
        };

        const result = safeValidateCreateCard(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error result for invalid input", () => {
        const invalidData = {
          title: "Test Card", // missing columnId
        };

        const result = safeValidateCreateCard(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined values appropriately", () => {
      const dataWithNulls = {
        columnId: "col_123",
        title: "Test Card",
        description: null,
        priority: null,
        assigneeId: null,
        dueDate: null,
        startDate: null,
        status: null,
        labelIds: undefined,
      };

      expect(() => createCardSchema.parse(dataWithNulls)).not.toThrow();
    });

    it("should handle very large position numbers", () => {
      const dataWithLargePosition = {
        columnId: "col_123",
        title: "Test Card",
        position: Number.MAX_SAFE_INTEGER,
      };

      expect(() => createCardSchema.parse(dataWithLargePosition)).not.toThrow();
    });

    it("should handle timezone-aware dates correctly", () => {
      const dataWithTimezones = {
        columnId: "col_123",
        title: "Test Card",
        startDate: "2024-12-01T00:00:00+05:00",
        dueDate: "2024-12-01T23:59:59-05:00", // This is actually the next day in UTC
      };

      expect(() => createCardSchema.parse(dataWithTimezones)).not.toThrow();
    });
  });
});
