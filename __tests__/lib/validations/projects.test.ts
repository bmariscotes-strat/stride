import { z } from "zod";
import {
  CreateProjectWithTeamsSchema,
  UpdateProjectWithTeamsSchema,
  ProjectsListOptionsSchema,
  AssignProjectRoleSchema,
  AddTeamsToProjectSchema,
  RemoveTeamsFromProjectSchema,
  ProjectActionResponseSchema,
  SlugSchema,
  UUIDSchema,
  PriorityEnum,
  TeamRoleEnum,
  ProjectTeamRoleEnum,
  validateCreateProject,
  validateUpdateProject,
  validateProjectsListOptions,
  validateAssignProjectRole,
} from "../../../lib/validations/projects";

describe("Project Validations", () => {
  // Helper function to generate valid UUID
  const generateUUID = () => "550e8400-e29b-41d4-a716-446655440000";
  const generateUUID2 = () => "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

  describe("Base Schemas", () => {
    describe("UUIDSchema", () => {
      it("should validate valid UUIDs", () => {
        const validUUIDs = [
          "550e8400-e29b-41d4-a716-446655440000",
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "12345678-1234-5678-1234-123456789abc",
        ];

        validUUIDs.forEach((uuid) => {
          expect(() => UUIDSchema.parse(uuid)).not.toThrow();
        });
      });

      it("should reject invalid UUIDs", () => {
        const invalidUUIDs = [
          "invalid-uuid",
          "123",
          "",
          "550e8400-e29b-41d4-a716-44665544000", // too short
          "550e8400-e29b-41d4-a716-446655440000-extra", // too long
          "550e8400-e29b-41d4-a716-44665544000g", // invalid character
        ];

        invalidUUIDs.forEach((uuid) => {
          expect(() => UUIDSchema.parse(uuid)).toThrow();
        });
      });
    });

    describe("SlugSchema", () => {
      it("should validate valid slugs", () => {
        const validSlugs = [
          "my-project",
          "project-1",
          "a",
          "my-awesome-project-123",
          "project123",
        ];

        validSlugs.forEach((slug) => {
          expect(() => SlugSchema.parse(slug)).not.toThrow();
        });
      });

      it("should reject invalid slugs", () => {
        const invalidSlugs = [
          "",
          "My-Project", // uppercase
          "my_project", // underscore
          "my project", // space
          "my-project-", // trailing hyphen
          "-my-project", // leading hyphen
          "my--project", // double hyphen
          "a".repeat(256), // too long
        ];

        invalidSlugs.forEach((slug) => {
          expect(() => SlugSchema.parse(slug)).toThrow();
        });
      });
    });

    describe("Enum Schemas", () => {
      it("should validate PriorityEnum", () => {
        const validPriorities = ["high", "medium", "low"];
        validPriorities.forEach((priority) => {
          expect(() => PriorityEnum.parse(priority)).not.toThrow();
        });

        expect(() => PriorityEnum.parse("invalid")).toThrow();
      });

      it("should validate TeamRoleEnum", () => {
        const validRoles = ["owner", "admin", "member", "viewer"];
        validRoles.forEach((role) => {
          expect(() => TeamRoleEnum.parse(role)).not.toThrow();
        });

        expect(() => TeamRoleEnum.parse("invalid")).toThrow();
      });

      it("should validate ProjectTeamRoleEnum", () => {
        const validRoles = ["admin", "editor", "viewer"];
        validRoles.forEach((role) => {
          expect(() => ProjectTeamRoleEnum.parse(role)).not.toThrow();
        });

        expect(() => ProjectTeamRoleEnum.parse("owner")).toThrow();
      });
    });
  });

  describe("CreateProjectWithTeamsSchema", () => {
    const validProjectData = {
      name: "Test Project",
      slug: "test-project",
      description: "A test project",
      ownerId: generateUUID(),
      teamIds: [generateUUID(), generateUUID2()],
      memberRoles: {
        [generateUUID()]: "admin" as const,
        [generateUUID2()]: "editor" as const,
      },
      colorTheme: "blue",
      isArchived: false,
    };

    it("should validate valid project creation data", () => {
      expect(() =>
        CreateProjectWithTeamsSchema.parse(validProjectData)
      ).not.toThrow();
    });

    it("should validate minimal project creation data", () => {
      const minimalData = {
        name: "Test",
        slug: "test",
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(minimalData)
      ).not.toThrow();
    });

    it("should require project name", () => {
      const dataWithoutName = { ...validProjectData };
      delete (dataWithoutName as any).name;

      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithoutName)
      ).toThrow();
    });

    it("should reject empty project name", () => {
      const dataWithEmptyName = { ...validProjectData, name: "" };
      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithEmptyName)
      ).toThrow();
    });

    it("should reject project name that's too long", () => {
      const dataWithLongName = { ...validProjectData, name: "a".repeat(256) };
      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithLongName)
      ).toThrow();
    });

    it("should require at least one team", () => {
      const dataWithoutTeams = { ...validProjectData, teamIds: [] };
      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithoutTeams)
      ).toThrow();
    });

    it("should reject more than 10 teams", () => {
      const tooManyTeams = Array(11)
        .fill(0)
        .map(() => generateUUID());
      const dataWithTooManyTeams = {
        ...validProjectData,
        teamIds: tooManyTeams,
      };
      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithTooManyTeams)
      ).toThrow();
    });

    it("should require valid UUID for ownerId", () => {
      const dataWithInvalidOwner = {
        ...validProjectData,
        ownerId: "invalid-uuid",
      };
      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithInvalidOwner)
      ).toThrow();
    });

    it("should require valid UUIDs for teamIds", () => {
      const dataWithInvalidTeamIds = {
        ...validProjectData,
        teamIds: [generateUUID(), "invalid-uuid"],
      };
      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithInvalidTeamIds)
      ).toThrow();
    });

    it("should validate memberRoles with valid roles", () => {
      const dataWithValidRoles = {
        ...validProjectData,
        memberRoles: {
          [generateUUID()]: "admin" as const,
          [generateUUID2()]: "viewer" as const,
        },
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithValidRoles)
      ).not.toThrow();
    });

    it("should reject invalid member roles", () => {
      const dataWithInvalidRole = {
        ...validProjectData,
        memberRoles: {
          [generateUUID()]: "invalid-role" as any,
        },
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithInvalidRole)
      ).toThrow();
    });

    it("should trim project name", () => {
      const dataWithWhitespace = {
        ...validProjectData,
        name: "  Test Project  ",
      };
      const result = CreateProjectWithTeamsSchema.parse(dataWithWhitespace);
      expect(result.name).toBe("Test Project");
    });

    it("should have default empty object for memberRoles", () => {
      const dataWithoutMemberRoles = { ...validProjectData };
      delete (dataWithoutMemberRoles as any).memberRoles;

      const result = CreateProjectWithTeamsSchema.parse(dataWithoutMemberRoles);
      expect(result.memberRoles).toEqual({});
    });
  });

  describe("UpdateProjectWithTeamsSchema", () => {
    const validUpdateData = {
      id: generateUUID(),
      userId: generateUUID(),
      name: "Updated Project",
      slug: "updated-project",
      description: "Updated description",
      isArchived: true,
      teamIds: [generateUUID()],
      memberRoles: {
        [generateUUID()]: "editor" as const,
      },
    };

    it("should validate valid project update data", () => {
      expect(() =>
        UpdateProjectWithTeamsSchema.parse(validUpdateData)
      ).not.toThrow();
    });

    it("should validate minimal update data", () => {
      const minimalData = {
        id: generateUUID(),
        userId: generateUUID(),
      };

      expect(() =>
        UpdateProjectWithTeamsSchema.parse(minimalData)
      ).not.toThrow();
    });

    it("should require valid project ID", () => {
      const dataWithInvalidId = { ...validUpdateData, id: "invalid-uuid" };
      expect(() =>
        UpdateProjectWithTeamsSchema.parse(dataWithInvalidId)
      ).toThrow();
    });

    it("should require valid user ID", () => {
      const dataWithInvalidUserId = {
        ...validUpdateData,
        userId: "invalid-uuid",
      };
      expect(() =>
        UpdateProjectWithTeamsSchema.parse(dataWithInvalidUserId)
      ).toThrow();
    });

    it("should validate optional fields", () => {
      const dataWithOptionalFields = {
        id: generateUUID(),
        userId: generateUUID(),
        name: "New Name",
        description: null,
        colorTheme: null,
      };

      expect(() =>
        UpdateProjectWithTeamsSchema.parse(dataWithOptionalFields)
      ).not.toThrow();
    });

    it("should reject invalid team count", () => {
      const dataWithTooManyTeams = {
        ...validUpdateData,
        teamIds: Array(11)
          .fill(0)
          .map(() => generateUUID()),
      };

      expect(() =>
        UpdateProjectWithTeamsSchema.parse(dataWithTooManyTeams)
      ).toThrow();
    });

    it("should reject empty team array", () => {
      const dataWithEmptyTeams = { ...validUpdateData, teamIds: [] };
      expect(() =>
        UpdateProjectWithTeamsSchema.parse(dataWithEmptyTeams)
      ).toThrow();
    });
  });

  describe("ProjectsListOptionsSchema", () => {
    it("should validate with all options", () => {
      const options = {
        teamId: generateUUID(),
        ownerId: generateUUID(),
        isArchived: false,
        search: "test project",
        orderBy: "name" as const,
        orderDirection: "asc" as const,
        limit: 25,
        offset: 10,
      };

      expect(() => ProjectsListOptionsSchema.parse(options)).not.toThrow();
    });

    it("should validate with minimal options", () => {
      const options = {};
      const result = ProjectsListOptionsSchema.parse(options);

      expect(result.isArchived).toBe(false);
      expect(result.orderBy).toBe("updatedAt");
      expect(result.orderDirection).toBe("desc");
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("should reject invalid orderBy values", () => {
      const options = { orderBy: "invalid" as any };
      expect(() => ProjectsListOptionsSchema.parse(options)).toThrow();
    });

    it("should reject invalid orderDirection values", () => {
      const options = { orderDirection: "invalid" as any };
      expect(() => ProjectsListOptionsSchema.parse(options)).toThrow();
    });

    it("should reject limit outside valid range", () => {
      const tooSmall = { limit: 0 };
      const tooLarge = { limit: 101 };

      expect(() => ProjectsListOptionsSchema.parse(tooSmall)).toThrow();
      expect(() => ProjectsListOptionsSchema.parse(tooLarge)).toThrow();
    });

    it("should reject negative offset", () => {
      const negativeOffset = { offset: -1 };
      expect(() => ProjectsListOptionsSchema.parse(negativeOffset)).toThrow();
    });

    it("should reject search term that's too long", () => {
      const longSearch = { search: "a".repeat(256) };
      expect(() => ProjectsListOptionsSchema.parse(longSearch)).toThrow();
    });
  });

  describe("AssignProjectRoleSchema", () => {
    const validRoleAssignment = {
      projectId: generateUUID(),
      memberId: generateUUID(),
      newRole: "admin" as const,
    };

    it("should validate valid role assignment", () => {
      expect(() =>
        AssignProjectRoleSchema.parse(validRoleAssignment)
      ).not.toThrow();
    });

    it("should require all fields", () => {
      const fields = ["projectId", "memberId", "newRole"];

      fields.forEach((field) => {
        const incomplete = { ...validRoleAssignment };
        delete (incomplete as any)[field];
        expect(() => AssignProjectRoleSchema.parse(incomplete)).toThrow();
      });
    });

    it("should validate all role types", () => {
      const roles = ["admin", "editor", "viewer"] as const;

      roles.forEach((role) => {
        const data = { ...validRoleAssignment, newRole: role };
        expect(() => AssignProjectRoleSchema.parse(data)).not.toThrow();
      });
    });

    it("should reject invalid role", () => {
      const invalidRole = { ...validRoleAssignment, newRole: "invalid" as any };
      expect(() => AssignProjectRoleSchema.parse(invalidRole)).toThrow();
    });
  });

  describe("AddTeamsToProjectSchema", () => {
    const validTeamAddition = {
      projectId: generateUUID(),
      teamIds: [generateUUID(), generateUUID2()],
      userId: generateUUID(),
      memberRoles: {
        [generateUUID()]: "editor" as const,
      },
    };

    it("should validate valid team addition", () => {
      expect(() =>
        AddTeamsToProjectSchema.parse(validTeamAddition)
      ).not.toThrow();
    });

    it("should require at least one team", () => {
      const noTeams = { ...validTeamAddition, teamIds: [] };
      expect(() => AddTeamsToProjectSchema.parse(noTeams)).toThrow();
    });

    it("should reject more than 10 teams", () => {
      const tooManyTeams = {
        ...validTeamAddition,
        teamIds: Array(11)
          .fill(0)
          .map(() => generateUUID()),
      };
      expect(() => AddTeamsToProjectSchema.parse(tooManyTeams)).toThrow();
    });

    it("should have default empty memberRoles", () => {
      const withoutRoles = { ...validTeamAddition };
      delete (withoutRoles as any).memberRoles;

      const result = AddTeamsToProjectSchema.parse(withoutRoles);
      expect(result.memberRoles).toEqual({});
    });
  });

  describe("RemoveTeamsFromProjectSchema", () => {
    const validTeamRemoval = {
      projectId: generateUUID(),
      teamIds: [generateUUID()],
      userId: generateUUID(),
    };

    it("should validate valid team removal", () => {
      expect(() =>
        RemoveTeamsFromProjectSchema.parse(validTeamRemoval)
      ).not.toThrow();
    });

    it("should require at least one team", () => {
      const noTeams = { ...validTeamRemoval, teamIds: [] };
      expect(() => RemoveTeamsFromProjectSchema.parse(noTeams)).toThrow();
    });

    it("should require all fields", () => {
      const fields = ["projectId", "teamIds", "userId"];

      fields.forEach((field) => {
        const incomplete = { ...validTeamRemoval };
        delete (incomplete as any)[field];
        expect(() => RemoveTeamsFromProjectSchema.parse(incomplete)).toThrow();
      });
    });
  });

  describe("ProjectActionResponseSchema", () => {
    it("should validate successful response", () => {
      const successResponse = {
        success: true,
        error: null,
        project: {
          id: generateUUID(),
          name: "Test Project",
          slug: "test-project",
          description: "A test project",
          ownerId: generateUUID(),
          colorTheme: "blue",
          isArchived: false,
          schemaVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(() =>
        ProjectActionResponseSchema.parse(successResponse)
      ).not.toThrow();
    });

    it("should validate error response", () => {
      const errorResponse = {
        success: false,
        error: "Something went wrong",
        project: null,
      };

      expect(() =>
        ProjectActionResponseSchema.parse(errorResponse)
      ).not.toThrow();
    });

    it("should require success field", () => {
      const withoutSuccess = {
        error: null,
        project: null,
      };

      expect(() => ProjectActionResponseSchema.parse(withoutSuccess)).toThrow();
    });
  });

  describe("Validation Helper Functions", () => {
    describe("validateCreateProject", () => {
      it("should validate and return parsed data", () => {
        const validData = {
          name: "Test Project",
          slug: "test-project",
          ownerId: generateUUID(),
          teamIds: [generateUUID()],
        };

        const result = validateCreateProject(validData);
        expect(result.name).toBe("Test Project");
        expect(result.teamIds).toHaveLength(1);
      });

      it("should throw on invalid data", () => {
        const invalidData = { name: "", teamIds: [] };
        expect(() => validateCreateProject(invalidData)).toThrow();
      });
    });

    describe("validateUpdateProject", () => {
      it("should validate and return parsed data", () => {
        const validData = {
          id: generateUUID(),
          userId: generateUUID(),
          name: "Updated Name",
        };

        const result = validateUpdateProject(validData);
        expect(result.id).toBe(validData.id);
        expect(result.name).toBe("Updated Name");
      });

      it("should throw on invalid data", () => {
        const invalidData = { id: "invalid-uuid" };
        expect(() => validateUpdateProject(invalidData)).toThrow();
      });
    });

    describe("validateProjectsListOptions", () => {
      it("should apply defaults for empty options", () => {
        const result = validateProjectsListOptions({});
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
        expect(result.orderBy).toBe("updatedAt");
        expect(result.orderDirection).toBe("desc");
        expect(result.isArchived).toBe(false);
      });

      it("should preserve provided values", () => {
        const options = {
          limit: 25,
          orderBy: "name" as const,
          search: "test",
        };

        const result = validateProjectsListOptions(options);
        expect(result.limit).toBe(25);
        expect(result.orderBy).toBe("name");
        expect(result.search).toBe("test");
      });
    });

    describe("validateAssignProjectRole", () => {
      it("should validate role assignment data", () => {
        const validData = {
          projectId: generateUUID(),
          memberId: generateUUID(),
          newRole: "admin" as const,
        };

        const result = validateAssignProjectRole(validData);
        expect(result.projectId).toBe(validData.projectId);
        expect(result.newRole).toBe("admin");
      });

      it("should throw on missing fields", () => {
        const invalidData = { projectId: generateUUID() };
        expect(() => validateAssignProjectRole(invalidData)).toThrow();
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null values appropriately", () => {
      const dataWithNulls = {
        name: "Test Project",
        slug: "test-project",
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
        description: null,
        colorTheme: null,
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithNulls)
      ).not.toThrow();
    });

    it("should handle undefined vs null distinction", () => {
      const dataWithUndefined = {
        name: "Test Project",
        slug: "test-project",
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
        description: undefined,
        colorTheme: undefined,
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(dataWithUndefined)
      ).not.toThrow();
    });

    it("should provide meaningful error messages", () => {
      try {
        CreateProjectWithTeamsSchema.parse({
          name: "",
          slug: "invalid slug",
          ownerId: "not-a-uuid",
          teamIds: [],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        expect(zodError.issues.length).toBeGreaterThan(0);
        expect(
          zodError.issues.some((e) => e.message.includes("Project name"))
        ).toBe(true);
      }
    });

    it("should handle deeply nested validation errors", () => {
      const invalidNestedData = {
        name: "Test Project",
        slug: "test-project",
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
        memberRoles: {
          "not-a-uuid": "admin",
          [generateUUID()]: "invalid-role",
        },
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(invalidNestedData)
      ).toThrow();
    });
  });

  describe("Schema Composition and Inheritance", () => {
    it("should properly extend base schemas", () => {
      const baseProject = {
        name: "Test",
        slug: "test",
        description: "desc",
        colorTheme: "blue",
        isArchived: false,
      };

      const createProject = {
        ...baseProject,
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
      };

      const updateProject = {
        id: generateUUID(),
        userId: generateUUID(),
        name: "Updated Test",
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(createProject)
      ).not.toThrow();
      expect(() =>
        UpdateProjectWithTeamsSchema.parse(updateProject)
      ).not.toThrow();
    });

    it("should maintain proper type safety across schemas", () => {
      const createData = {
        name: "Test Project",
        slug: "test-project",
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
      };

      const parsed = CreateProjectWithTeamsSchema.parse(createData);

      // These should all be properly typed
      expect(typeof parsed.name).toBe("string");
      expect(typeof parsed.slug).toBe("string");
      expect(typeof parsed.ownerId).toBe("string");
      expect(Array.isArray(parsed.teamIds)).toBe(true);
      expect(typeof parsed.memberRoles).toBe("object");
      expect(typeof parsed.isArchived).toBe("boolean");
    });
  });

  describe("Performance and Large Data", () => {
    it("should handle maximum allowed teams efficiently", () => {
      const maxTeams = Array(10)
        .fill(0)
        .map(() => generateUUID());
      const maxTeamsData = {
        name: "Max Teams Project",
        slug: "max-teams-project",
        ownerId: generateUUID(),
        teamIds: maxTeams,
      };

      const start = performance.now();
      expect(() =>
        CreateProjectWithTeamsSchema.parse(maxTeamsData)
      ).not.toThrow();
      const end = performance.now();

      // Validation should be fast (less than 10ms for reasonable data)
      expect(end - start).toBeLessThan(10);
    });

    it("should handle large member roles object", () => {
      const memberRoles: Record<string, "admin" | "editor" | "viewer"> = {};
      const teamIds = [];

      for (let i = 0; i < 50; i++) {
        const uuid = generateUUID();
        memberRoles[uuid] =
          i % 3 === 0 ? "admin" : i % 3 === 1 ? "editor" : "viewer";
        if (i < 10) teamIds.push(uuid); // Only add first 10 to teamIds to stay within limit
      }

      const largeRolesData = {
        name: "Large Roles Project",
        slug: "large-roles-project",
        ownerId: generateUUID(),
        teamIds,
        memberRoles,
      };

      expect(() =>
        CreateProjectWithTeamsSchema.parse(largeRolesData)
      ).not.toThrow();
    });
  });

  describe("Real-world Integration Scenarios", () => {
    it("should validate data that comes from form submissions", () => {
      // Simulate form data with string values that need coercion
      const formData = {
        name: "  My Project  ", // with whitespace
        slug: "my-project",
        ownerId: generateUUID(),
        teamIds: [generateUUID()],
        description: "", // empty string should be treated as valid
        isArchived: false,
      };

      const result = CreateProjectWithTeamsSchema.parse(formData);
      expect(result.name).toBe("My Project"); // trimmed
      expect(result.description).toBe(""); // preserved
    });

    it("should validate API response data", () => {
      const apiResponse = {
        success: true,
        error: null,
        project: {
          id: generateUUID(),
          name: "API Project",
          slug: "api-project",
          description: null,
          ownerId: generateUUID(),
          colorTheme: null,
          isArchived: false,
          schemaVersion: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(() =>
        ProjectActionResponseSchema.parse(apiResponse)
      ).not.toThrow();
    });

    it("should validate partial updates from API", () => {
      const partialUpdate = {
        id: generateUUID(),
        userId: generateUUID(),
        name: "Updated Name Only",
        // Other fields intentionally omitted
      };

      expect(() =>
        UpdateProjectWithTeamsSchema.parse(partialUpdate)
      ).not.toThrow();
    });
  });
});

describe("Integration with Service Layer", () => {
  const mockProjectData = {
    name: "Integration Test Project",
    slug: "integration-test-project",
    ownerId: generateUUID(),
    teamIds: [generateUUID()],
    memberRoles: {
      [generateUUID()]: "admin" as const,
    },
  };

  it("should validate data before service calls", () => {
    // This simulates how the validation would be used in the actual service
    expect(() => {
      const validatedData = validateCreateProject(mockProjectData);
      // In real code, this would be passed to createProjectAction
      expect(validatedData).toBeDefined();
    }).not.toThrow();
  });

  it("should catch invalid data before expensive operations", () => {
    const invalidData = {
      name: "", // invalid
      slug: "valid-slug",
      ownerId: "not-a-uuid", // invalid
      teamIds: [], // invalid - empty array
    };

    expect(() => validateCreateProject(invalidData)).toThrow();
  });

  it("should provide type-safe data to services", () => {
    const validatedData = validateCreateProject(mockProjectData);

    // These assertions ensure the validated data has the expected shape
    expect(typeof validatedData.name).toBe("string");
    expect(validatedData.name.length).toBeGreaterThan(0);
    expect(Array.isArray(validatedData.teamIds)).toBe(true);
    expect(validatedData.teamIds.length).toBeGreaterThan(0);
    expect(typeof validatedData.memberRoles).toBe("object");
  });
});

// Helper function for generating consistent test UUIDs
function generateUUID(): string {
  return "550e8400-e29b-41d4-a716-446655440000";
}

function generateUUID2(): string {
  return "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
}
