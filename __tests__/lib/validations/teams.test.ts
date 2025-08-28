// tests/lib/validations/team.test.ts
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMembersSchema,
  removeTeamMemberSchema,
  updateTeamMemberRoleSchema,
  archiveTeamSchema,
  deleteTeamSchema,
  getTeamBySlugSchema,
  teamRoleSchema,
  projectTeamRoleSchema,
  teamSchema,
  teamMemberSchema,
  createTeamResponseSchema,
  addMembersResponseSchema,
  genericTeamActionResponseSchema,
  updateTeamResponseSchema,
} from "@/lib/validations/teams";
import { ZodError } from "zod";

describe("Team Validation Schemas", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const invalidUuid = "not-a-uuid";
  const validEmail = "test@example.com";
  const invalidEmail = "not-an-email";

  describe("teamRoleSchema", () => {
    it("should accept valid team roles", () => {
      expect(teamRoleSchema.parse("owner")).toBe("owner");
      expect(teamRoleSchema.parse("admin")).toBe("admin");
      expect(teamRoleSchema.parse("member")).toBe("member");
      expect(teamRoleSchema.parse("viewer")).toBe("viewer");
    });

    it("should reject invalid team roles", () => {
      expect(() => teamRoleSchema.parse("invalid")).toThrow(ZodError);
      expect(() => teamRoleSchema.parse("")).toThrow(ZodError);
      expect(() => teamRoleSchema.parse(null)).toThrow(ZodError);
    });
  });

  describe("projectTeamRoleSchema", () => {
    it("should accept valid project team roles", () => {
      expect(projectTeamRoleSchema.parse("admin")).toBe("admin");
      expect(projectTeamRoleSchema.parse("editor")).toBe("editor");
      expect(projectTeamRoleSchema.parse("viewer")).toBe("viewer");
    });

    it("should reject invalid project team roles", () => {
      expect(() => projectTeamRoleSchema.parse("owner")).toThrow(ZodError);
      expect(() => projectTeamRoleSchema.parse("invalid")).toThrow(ZodError);
    });
  });

  describe("createTeamSchema", () => {
    const validCreateTeamData = {
      name: "Test Team",
      slug: "test-team",
      description: "A test team",
      members: [validEmail],
      createdBy: validUuid,
    };

    it("should accept valid team creation data", () => {
      const result = createTeamSchema.parse(validCreateTeamData);
      expect(result).toEqual(validCreateTeamData);
    });

    it("should accept minimal required data", () => {
      const minimalData = {
        name: "Team",
        slug: "team",
        createdBy: validUuid,
      };
      const result = createTeamSchema.parse(minimalData);
      expect(result.members).toEqual([]);
      expect(result.description).toBeUndefined();
    });

    it("should reject invalid team names", () => {
      expect(() =>
        createTeamSchema.parse({
          ...validCreateTeamData,
          name: "",
        })
      ).toThrow(ZodError);

      expect(() =>
        createTeamSchema.parse({
          ...validCreateTeamData,
          name: "a".repeat(256),
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid slugs", () => {
      const invalidSlugs = [
        "ab", // too short
        "a".repeat(51), // too long
        "Team With Spaces",
        "UPPERCASE",
        "special!chars",
        "-starts-with-hyphen",
        "ends-with-hyphen-",
        "123_underscore",
      ];

      invalidSlugs.forEach((slug) => {
        expect(() =>
          createTeamSchema.parse({
            ...validCreateTeamData,
            slug,
          })
        ).toThrow(ZodError);
      });
    });

    it("should accept valid slugs", () => {
      const validSlugs = [
        "abc",
        "team-name",
        "team123",
        "123team",
        "very-long-team-name-with-numbers-123",
      ];

      validSlugs.forEach((slug) => {
        expect(() =>
          createTeamSchema.parse({
            ...validCreateTeamData,
            slug,
          })
        ).not.toThrow();
      });
    });

    it("should reject invalid member emails", () => {
      expect(() =>
        createTeamSchema.parse({
          ...validCreateTeamData,
          members: [invalidEmail],
        })
      ).toThrow(ZodError);
    });

    it("should reject too many members", () => {
      const tooManyEmails = Array(51).fill(validEmail);
      expect(() =>
        createTeamSchema.parse({
          ...validCreateTeamData,
          members: tooManyEmails,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid createdBy UUID", () => {
      expect(() =>
        createTeamSchema.parse({
          ...validCreateTeamData,
          createdBy: invalidUuid,
        })
      ).toThrow(ZodError);
    });

    it("should reject description that is too long", () => {
      expect(() =>
        createTeamSchema.parse({
          ...validCreateTeamData,
          description: "a".repeat(1001),
        })
      ).toThrow(ZodError);
    });
  });

  describe("updateTeamSchema", () => {
    it("should accept valid update data", () => {
      const updateData = {
        name: "Updated Team",
        slug: "updated-team",
        description: "Updated description",
      };
      const result = updateTeamSchema.parse(updateData);
      expect(result).toEqual(updateData);
    });

    it("should accept partial update data", () => {
      const partialData = { name: "New Name" };
      const result = updateTeamSchema.parse(partialData);
      expect(result).toEqual(partialData);
    });

    it("should accept empty description", () => {
      const result = updateTeamSchema.parse({ description: "" });
      expect(result.description).toBe("");
    });

    it("should reject invalid update data", () => {
      expect(() =>
        updateTeamSchema.parse({
          name: "",
        })
      ).toThrow(ZodError);

      expect(() =>
        updateTeamSchema.parse({
          slug: "INVALID SLUG",
        })
      ).toThrow(ZodError);
    });
  });

  describe("addTeamMembersSchema", () => {
    const validAddMembersData = {
      teamId: validUuid,
      memberEmails: [validEmail, "test2@example.com"],
      invitedBy: validUuid,
    };

    it("should accept valid add members data", () => {
      const result = addTeamMembersSchema.parse(validAddMembersData);
      expect(result).toEqual(validAddMembersData);
    });

    it("should reject empty member emails array", () => {
      expect(() =>
        addTeamMembersSchema.parse({
          ...validAddMembersData,
          memberEmails: [],
        })
      ).toThrow(ZodError);
    });

    it("should reject too many member emails", () => {
      const tooManyEmails = Array(21).fill(validEmail);
      expect(() =>
        addTeamMembersSchema.parse({
          ...validAddMembersData,
          memberEmails: tooManyEmails,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid UUIDs", () => {
      expect(() =>
        addTeamMembersSchema.parse({
          ...validAddMembersData,
          teamId: invalidUuid,
        })
      ).toThrow(ZodError);

      expect(() =>
        addTeamMembersSchema.parse({
          ...validAddMembersData,
          invitedBy: invalidUuid,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid emails", () => {
      expect(() =>
        addTeamMembersSchema.parse({
          ...validAddMembersData,
          memberEmails: [validEmail, invalidEmail],
        })
      ).toThrow(ZodError);
    });
  });

  describe("removeTeamMemberSchema", () => {
    const validRemoveMemberData = {
      teamId: validUuid,
      userId: validUuid,
      removedBy: validUuid,
    };

    it("should accept valid remove member data", () => {
      const result = removeTeamMemberSchema.parse(validRemoveMemberData);
      expect(result).toEqual(validRemoveMemberData);
    });

    it("should reject invalid UUIDs", () => {
      expect(() =>
        removeTeamMemberSchema.parse({
          ...validRemoveMemberData,
          teamId: invalidUuid,
        })
      ).toThrow(ZodError);

      expect(() =>
        removeTeamMemberSchema.parse({
          ...validRemoveMemberData,
          userId: invalidUuid,
        })
      ).toThrow(ZodError);

      expect(() =>
        removeTeamMemberSchema.parse({
          ...validRemoveMemberData,
          removedBy: invalidUuid,
        })
      ).toThrow(ZodError);
    });
  });

  describe("updateTeamMemberRoleSchema", () => {
    const validRoleUpdateData = {
      teamId: validUuid,
      userId: validUuid,
      newRole: "admin" as const,
      updatedBy: validUuid,
    };

    it("should accept valid role update data", () => {
      const result = updateTeamMemberRoleSchema.parse(validRoleUpdateData);
      expect(result).toEqual(validRoleUpdateData);
    });

    it("should accept all non-owner roles", () => {
      const validRoles = ["admin", "member", "viewer"] as const;

      validRoles.forEach((role) => {
        expect(() =>
          updateTeamMemberRoleSchema.parse({
            ...validRoleUpdateData,
            newRole: role,
          })
        ).not.toThrow();
      });
    });

    it("should reject owner role", () => {
      expect(() =>
        updateTeamMemberRoleSchema.parse({
          ...validRoleUpdateData,
          newRole: "owner" as any,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid roles", () => {
      expect(() =>
        updateTeamMemberRoleSchema.parse({
          ...validRoleUpdateData,
          newRole: "invalid" as any,
        })
      ).toThrow(ZodError);
    });
  });

  describe("archiveTeamSchema", () => {
    it("should accept valid archive data", () => {
      const data = {
        teamId: validUuid,
        archivedBy: validUuid,
      };
      const result = archiveTeamSchema.parse(data);
      expect(result).toEqual(data);
    });

    it("should reject invalid UUIDs", () => {
      expect(() =>
        archiveTeamSchema.parse({
          teamId: invalidUuid,
          archivedBy: validUuid,
        })
      ).toThrow(ZodError);
    });
  });

  describe("deleteTeamSchema", () => {
    const validDeleteData = {
      teamId: validUuid,
      deletedBy: validUuid,
      confirmationText: "Team Name",
    };

    it("should accept valid delete data", () => {
      const result = deleteTeamSchema.parse(validDeleteData);
      expect(result).toEqual(validDeleteData);
    });

    it("should reject empty confirmation text", () => {
      expect(() =>
        deleteTeamSchema.parse({
          ...validDeleteData,
          confirmationText: "",
        })
      ).toThrow(ZodError);
    });
  });

  describe("getTeamBySlugSchema", () => {
    it("should accept valid query data", () => {
      const data = {
        slug: "valid-slug",
        userId: validUuid,
      };
      const result = getTeamBySlugSchema.parse(data);
      expect(result).toEqual(data);
    });

    it("should reject invalid slug", () => {
      expect(() =>
        getTeamBySlugSchema.parse({
          slug: "Invalid Slug",
          userId: validUuid,
        })
      ).toThrow(ZodError);
    });

    it("should reject invalid userId", () => {
      expect(() =>
        getTeamBySlugSchema.parse({
          slug: "valid-slug",
          userId: invalidUuid,
        })
      ).toThrow(ZodError);
    });
  });

  describe("Response Schemas", () => {
    describe("createTeamResponseSchema", () => {
      it("should accept successful response", () => {
        const successResponse = {
          success: true,
          team: {
            id: validUuid,
            name: "Test Team",
            slug: "test-team",
            description: "Test description",
            isPersonal: false,
            isArchived: false,
            createdBy: validUuid,
            schemaVersion: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          invitationResults: [
            {
              email: validEmail,
              success: true,
              invitationId: validUuid,
            },
          ],
        };

        const result = createTeamResponseSchema.parse(successResponse);
        expect(result.success).toBe(true);
      });

      it("should accept error response", () => {
        const errorResponse = {
          success: false,
          error: "Team creation failed",
        } as const;

        const result = createTeamResponseSchema.parse(errorResponse);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Team creation failed");
        }
      });
    });

    describe("addMembersResponseSchema", () => {
      it("should accept valid response", () => {
        const response = {
          success: true,
          results: [
            {
              email: validEmail,
              success: true,
              invitationId: validUuid,
            },
          ],
        };

        const result = addMembersResponseSchema.parse(response);
        expect(result).toEqual(response);
      });
    });

    describe("genericTeamActionResponseSchema", () => {
      it("should accept success response", () => {
        const response = { success: true };
        const result = genericTeamActionResponseSchema.parse(response);
        expect(result).toEqual(response);
      });

      it("should accept error response", () => {
        const response = {
          success: false,
          error: "Action failed",
        };
        const result = genericTeamActionResponseSchema.parse(response);
        expect(result).toEqual(response);
      });
    });

    describe("teamMemberSchema", () => {
      it("should accept valid team member", () => {
        const member = {
          id: validUuid,
          teamId: validUuid,
          userId: validUuid,
          role: "member" as const,
          joinedAt: new Date(),
          user: {
            id: validUuid,
            email: validEmail,
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            avatarUrl: "https://example.com/avatar.jpg",
          },
        };

        const result = teamMemberSchema.parse(member);
        expect(result).toEqual(member);
      });

      it("should accept null avatarUrl", () => {
        const member = {
          id: validUuid,
          teamId: validUuid,
          userId: validUuid,
          role: "member" as const,
          joinedAt: new Date(),
          user: {
            id: validUuid,
            email: validEmail,
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            avatarUrl: null,
          },
        };

        const result = teamMemberSchema.parse(member);
        expect(result.user.avatarUrl).toBeNull();
      });
    });

    describe("teamSchema", () => {
      it("should accept valid team", () => {
        const team = {
          id: validUuid,
          name: "Test Team",
          slug: "test-team",
          description: "Test description",
          isPersonal: false,
          isArchived: false,
          createdBy: validUuid,
          schemaVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = teamSchema.parse(team);
        expect(result).toEqual(team);
      });

      it("should accept team with optional fields", () => {
        const team = {
          id: validUuid,
          name: "Test Team",
          slug: "test-team",
          description: null,
          isPersonal: false,
          isArchived: false,
          createdBy: validUuid,
          schemaVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [],
          currentUserRole: "admin" as const,
        };

        const result = teamSchema.parse(team);
        expect(result.members).toEqual([]);
        expect(result.currentUserRole).toBe("admin");
      });
    });
  });
});
