// tests/lib/validations/comment.test.ts
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  getCardCommentsSchema,
  getCommentStatsSchema,
  getRecentCommentsSchema,
  getUserMentionedCommentsSchema,
  markMentionsAsReadSchema,
  hookCreateCommentSchema,
  hookUpdateCommentSchema,
  hookDeleteCommentSchema,
  baseCommentSchema,
  commentWithRepliesSchema,
  commentStatsSchema,
  createCommentResponseSchema,
  updateCommentResponseSchema,
  deleteCommentResponseSchema,
  userSchema,
  mentionSchema,
} from "@/lib/validations/comments";
import { ZodError } from "zod";

describe("Comment Validation Schemas", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const invalidUuid = "not-a-uuid";
  const validCommentId = 123;
  const validContent = "This is a test comment with @username mention";
  const longContent = "a".repeat(5001);

  describe("createCommentSchema", () => {
    const validCreateData = {
      cardId: validUuid,
      content: validContent,
      parentId: "456",
    };

    it("should accept valid comment creation data", () => {
      const result = createCommentSchema.parse(validCreateData);
      expect(result.cardId).toBe(validUuid);
      expect(result.content).toBe(validContent);
      expect(result.parentId).toBe(456);
    });

    it("should accept data without parentId", () => {
      const { parentId, ...dataWithoutParent } = validCreateData;
      const result = createCommentSchema.parse(dataWithoutParent);
      expect(result.parentId).toBeUndefined();
    });

    it("should transform string parentId to number", () => {
      const result = createCommentSchema.parse({
        ...validCreateData,
        parentId: "789",
      });
      expect(result.parentId).toBe(789);
    });

    it("should reject invalid cardId", () => {
      expect(() =>
        createCommentSchema.parse({
          ...validCreateData,
          cardId: invalidUuid,
        })
      ).toThrow(ZodError);
    });

    it("should reject empty content", () => {
      expect(() =>
        createCommentSchema.parse({
          ...validCreateData,
          content: "",
        })
      ).toThrow(ZodError);

      expect(() =>
        createCommentSchema.parse({
          ...validCreateData,
          content: "   ",
        })
      ).toThrow(ZodError);
    });

    it("should reject content that is too long", () => {
      expect(() =>
        createCommentSchema.parse({
          ...validCreateData,
          content: longContent,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid parentId", () => {
      expect(() =>
        createCommentSchema.parse({
          ...validCreateData,
          parentId: "not-a-number",
        })
      ).toThrow(ZodError);

      expect(() =>
        createCommentSchema.parse({
          ...validCreateData,
          parentId: "-1",
        })
      ).toThrow(ZodError);
    });

    it("should trim whitespace from content", () => {
      const result = createCommentSchema.parse({
        ...validCreateData,
        content: "  " + validContent + "  ",
      });
      expect(result.content).toBe(validContent);
    });
  });

  describe("updateCommentSchema", () => {
    const validUpdateData = {
      commentId: validCommentId,
      content: "Updated comment content",
    };

    it("should accept valid update data with number commentId", () => {
      const result = updateCommentSchema.parse(validUpdateData);
      expect(result).toEqual(validUpdateData);
    });

    it("should accept valid update data with string commentId", () => {
      const dataWithStringId = {
        ...validUpdateData,
        commentId: "123",
      };
      const result = updateCommentSchema.parse(dataWithStringId);
      expect(result.commentId).toBe(123);
    });

    it("should reject invalid commentId", () => {
      expect(() =>
        updateCommentSchema.parse({
          ...validUpdateData,
          commentId: "invalid",
        })
      ).toThrow(ZodError);

      expect(() =>
        updateCommentSchema.parse({
          ...validUpdateData,
          commentId: -1,
        })
      ).toThrow(ZodError);

      expect(() =>
        updateCommentSchema.parse({
          ...validUpdateData,
          commentId: 0,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid content", () => {
      expect(() =>
        updateCommentSchema.parse({
          ...validUpdateData,
          content: "",
        })
      ).toThrow(ZodError);

      expect(() =>
        updateCommentSchema.parse({
          ...validUpdateData,
          content: longContent,
        })
      ).toThrow(ZodError);
    });
  });

  describe("deleteCommentSchema", () => {
    it("should accept valid delete data with number commentId", () => {
      const data = { commentId: validCommentId };
      const result = deleteCommentSchema.parse(data);
      expect(result).toEqual(data);
    });

    it("should accept valid delete data with string commentId", () => {
      const data = { commentId: "123" };
      const result = deleteCommentSchema.parse(data);
      expect(result.commentId).toBe(123);
    });

    it("should reject invalid commentId", () => {
      expect(() =>
        deleteCommentSchema.parse({
          commentId: "invalid",
        })
      ).toThrow(ZodError);

      expect(() =>
        deleteCommentSchema.parse({
          commentId: -1,
        })
      ).toThrow(ZodError);
    });
  });

  describe("getCardCommentsSchema", () => {
    it("should accept valid cardId", () => {
      const data = { cardId: validUuid };
      const result = getCardCommentsSchema.parse(data);
      expect(result).toEqual(data);
    });

    it("should reject invalid cardId", () => {
      expect(() =>
        getCardCommentsSchema.parse({
          cardId: invalidUuid,
        })
      ).toThrow(ZodError);
    });
  });

  describe("getRecentCommentsSchema", () => {
    it("should accept valid data with limit", () => {
      const data = {
        projectId: validUuid,
        limit: 10,
      };
      const result = getRecentCommentsSchema.parse(data);
      expect(result).toEqual(data);
    });

    it("should use default limit when not provided", () => {
      const data = { projectId: validUuid };
      const result = getRecentCommentsSchema.parse(data);
      expect(result.limit).toBe(20);
    });

    it("should reject limit outside valid range", () => {
      expect(() =>
        getRecentCommentsSchema.parse({
          projectId: validUuid,
          limit: 0,
        })
      ).toThrow(ZodError);

      expect(() =>
        getRecentCommentsSchema.parse({
          projectId: validUuid,
          limit: 101,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid projectId", () => {
      expect(() =>
        getRecentCommentsSchema.parse({
          projectId: invalidUuid,
          limit: 10,
        })
      ).toThrow(ZodError);
    });
  });

  describe("getUserMentionedCommentsSchema", () => {
    it("should accept valid data", () => {
      const data = {
        userId: validUuid,
        limit: 25,
      };
      const result = getUserMentionedCommentsSchema.parse(data);
      expect(result).toEqual(data);
    });

    it("should use default limit", () => {
      const data = { userId: validUuid };
      const result = getUserMentionedCommentsSchema.parse(data);
      expect(result.limit).toBe(50);
    });
  });

  describe("markMentionsAsReadSchema", () => {
    const validData = {
      userId: validUuid,
      commentIds: [1, 2, 3],
    };

    it("should accept valid data", () => {
      const result = markMentionsAsReadSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("should reject empty commentIds array", () => {
      expect(() =>
        markMentionsAsReadSchema.parse({
          ...validData,
          commentIds: [],
        })
      ).toThrow(ZodError);
    });

    it("should reject too many commentIds", () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => i + 1);
      expect(() =>
        markMentionsAsReadSchema.parse({
          ...validData,
          commentIds: tooManyIds,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid commentIds", () => {
      expect(() =>
        markMentionsAsReadSchema.parse({
          ...validData,
          commentIds: [1, -1, 3],
        })
      ).toThrow(ZodError);
    });
  });

  describe("Hook-specific schemas", () => {
    describe("hookCreateCommentSchema", () => {
      const validHookData = {
        cardId: validUuid,
        content: validContent,
        parentId: 123,
      };

      it("should accept valid hook create data", () => {
        const result = hookCreateCommentSchema.parse(validHookData);
        expect(result).toEqual(validHookData);
      });

      it("should accept data without parentId", () => {
        const { parentId, ...dataWithoutParent } = validHookData;
        const result = hookCreateCommentSchema.parse(dataWithoutParent);
        expect(result.parentId).toBeUndefined();
      });

      it("should reject negative parentId", () => {
        expect(() =>
          hookCreateCommentSchema.parse({
            ...validHookData,
            parentId: -1,
          })
        ).toThrow(ZodError);
      });
    });

    describe("hookUpdateCommentSchema", () => {
      it("should accept valid hook update data", () => {
        const data = {
          commentId: validCommentId,
          content: "Updated content",
        };
        const result = hookUpdateCommentSchema.parse(data);
        expect(result).toEqual(data);
      });

      it("should reject zero or negative commentId", () => {
        expect(() =>
          hookUpdateCommentSchema.parse({
            commentId: 0,
            content: "Content",
          })
        ).toThrow(ZodError);
      });
    });

    describe("hookDeleteCommentSchema", () => {
      it("should accept valid hook delete data", () => {
        const data = { commentId: validCommentId };
        const result = hookDeleteCommentSchema.parse(data);
        expect(result).toEqual(data);
      });
    });
  });

  describe("Response schemas", () => {
    describe("userSchema", () => {
      it("should accept valid user data", () => {
        const user = {
          id: validUuid,
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
          email: "john@example.com",
          avatarUrl: "https://example.com/avatar.jpg",
        };
        const result = userSchema.parse(user);
        expect(result).toEqual(user);
      });

      it("should accept user data with null values", () => {
        const user = {
          id: validUuid,
          firstName: null,
          lastName: null,
          username: null,
          email: null,
          avatarUrl: null,
        };
        const result = userSchema.parse(user);
        expect(result).toEqual(user);
      });

      it("should reject invalid email format", () => {
        expect(() =>
          userSchema.parse({
            id: validUuid,
            firstName: "John",
            lastName: "Doe",
            username: "johndoe",
            email: "invalid-email",
            avatarUrl: null,
          })
        ).toThrow(ZodError);
      });

      it("should reject invalid avatar URL", () => {
        expect(() =>
          userSchema.parse({
            id: validUuid,
            firstName: "John",
            lastName: "Doe",
            username: "johndoe",
            email: "john@example.com",
            avatarUrl: "not-a-url",
          })
        ).toThrow(ZodError);
      });
    });

    describe("baseCommentSchema", () => {
      const validBaseComment = {
        id: 123,
        cardId: validUuid,
        userId: validUuid,
        content: "Test comment",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: validUuid,
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
          email: "john@example.com",
          avatarUrl: null,
        },
        mentions: [],
      };

      it("should accept valid base comment", () => {
        const result = baseCommentSchema.parse(validBaseComment);
        expect(result).toEqual(validBaseComment);
      });

      it("should accept comment with mentions", () => {
        const commentWithMentions = {
          ...validBaseComment,
          mentions: [
            {
              id: 1,
              commentId: 123,
              mentionedUserId: validUuid,
              mentionedBy: validUuid,
              createdAt: new Date(),
              mentionedUser: {
                id: validUuid,
                firstName: "Jane",
                lastName: "Doe",
                username: "janedoe",
                email: "jane@example.com",
                avatarUrl: null,
              },
            },
          ],
        };

        const result = baseCommentSchema.parse(commentWithMentions);
        expect(result.mentions).toHaveLength(1);
      });
    });

    describe("commentStatsSchema", () => {
      it("should accept valid comment stats", () => {
        const stats = {
          totalComments: 10,
          commentsWithMentions: 5,
          uniqueCommenters: 3,
        };
        const result = commentStatsSchema.parse(stats);
        expect(result).toEqual(stats);
      });

      it("should reject negative values", () => {
        expect(() =>
          commentStatsSchema.parse({
            totalComments: -1,
            commentsWithMentions: 5,
            uniqueCommenters: 3,
          })
        ).toThrow(ZodError);
      });
    });

    describe("Response schemas", () => {
      describe("createCommentResponseSchema", () => {
        it("should accept successful response", () => {
          const response = {
            success: true,
            comment: {
              id: 123,
              cardId: validUuid,
              userId: validUuid,
              content: "Test comment",
              parentId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: validUuid,
                firstName: "John",
                lastName: "Doe",
                username: "johndoe",
                email: "john@example.com",
                avatarUrl: null,
              },
              mentions: [],
            },
          };

          const result = createCommentResponseSchema.parse(response);
          expect(result.success).toBe(true);
        });

        it("should accept error response", () => {
          const response = { success: false };
          const result = createCommentResponseSchema.parse(response);
          expect(result.success).toBe(false);
          expect(result.comment).toBeUndefined();
        });
      });

      describe("deleteCommentResponseSchema", () => {
        it("should accept valid delete response", () => {
          const response = { success: true };
          const result = deleteCommentResponseSchema.parse(response);
          expect(result).toEqual(response);
        });
      });
    });
  });

  describe("Edge cases and transformations", () => {
    it("should handle string to number transformation for commentId", () => {
      const updateData = {
        commentId: "456",
        content: "Updated content",
      };
      const result = updateCommentSchema.parse(updateData);
      expect(result.commentId).toBe(456);
      expect(typeof result.commentId).toBe("number");
    });

    it("should handle parentId string to number transformation", () => {
      const createData = {
        cardId: validUuid,
        content: "Test comment",
        parentId: "789",
      };
      const result = createCommentSchema.parse(createData);
      expect(result.parentId).toBe(789);
    });

    it("should reject decimal numbers for commentId", () => {
      expect(() =>
        updateCommentSchema.parse({
          commentId: 123.45,
          content: "Test content",
        })
      ).toThrow(ZodError);
    });

    it("should handle content with special characters and mentions", () => {
      const specialContent =
        "Hello @user! This has émojis 🎉 and @another_user mention";
      const data = {
        cardId: validUuid,
        content: specialContent,
      };
      const result = createCommentSchema.parse(data);
      expect(result.content).toBe(specialContent);
    });
  });
});
