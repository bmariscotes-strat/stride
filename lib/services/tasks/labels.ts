// lib/services/labels.ts
import { db } from "@/lib/db/db";
import { labels } from "@/lib/db/schema";
import { eq, and, or, ilike, ne } from "drizzle-orm";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";

export interface CreateLabelInput {
  name: string;
  color: string;
  projectId: string;
}

export interface UpdateLabelInput {
  id: string;
  name?: string;
  color?: string;
}

export interface LabelWithUsage {
  id: string;
  name: string;
  color: string;
  projectId: string;
  createdAt: Date;
  usageCount: number;
}

export class LabelService {
  /**
   * Get all labels for a project
   */
  static async getProjectLabels(
    projectId: string,
    userId?: string
  ): Promise<LabelWithUsage[]> {
    // Check permissions if userId is provided
    if (userId) {
      const permissionChecker = new ProjectPermissionChecker();
      await permissionChecker.loadContext(userId, projectId);

      if (!permissionChecker.canViewProject()) {
        throw new Error("Insufficient permissions to view project labels");
      }
    }

    const projectLabels = await db.query.labels.findMany({
      where: eq(labels.projectId, projectId),
      orderBy: (labels, { asc }) => [asc(labels.name)],
    });

    // Get usage count for each label (you'll need to implement this based on your cardLabels table)
    const labelsWithUsage: LabelWithUsage[] = await Promise.all(
      projectLabels.map(async (label) => {
        // Count how many cards use this label
        const usageCount = await db.query.cardLabels.findMany({
          where: (cardLabels, { eq }) => eq(cardLabels.labelId, label.id),
        });

        return {
          ...label,
          usageCount: usageCount.length,
        };
      })
    );

    return labelsWithUsage;
  }

  /**
   * Create a new label
   */
  static async createLabel(
    input: CreateLabelInput,
    userId: string
  ): Promise<LabelWithUsage> {
    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, input.projectId);

    if (!permissionChecker.canCreateCards()) {
      throw new Error(
        "Insufficient permissions to create labels in this project"
      );
    }

    // Check if label with same name already exists in project
    const existingLabel = await db.query.labels.findFirst({
      where: and(
        eq(labels.projectId, input.projectId),
        ilike(labels.name, input.name)
      ),
    });

    if (existingLabel) {
      // Return existing label instead of creating duplicate
      return {
        ...existingLabel,
        usageCount: 0, // Could fetch actual count if needed
      };
    }

    // Create the label
    const [newLabel] = await db
      .insert(labels)
      .values({
        name: input.name.trim(),
        color: input.color,
        projectId: input.projectId,
      })
      .returning();

    return {
      ...newLabel,
      usageCount: 0,
    };
  }

  /**
   * Update an existing label
   */
  static async updateLabel(
    input: UpdateLabelInput,
    userId: string
  ): Promise<LabelWithUsage> {
    // Get the label to check project
    const existingLabel = await db.query.labels.findFirst({
      where: eq(labels.id, input.id),
    });

    if (!existingLabel) {
      throw new Error("Label not found");
    }

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, existingLabel.projectId);

    if (!permissionChecker.canEditProject()) {
      throw new Error(
        "Insufficient permissions to edit labels in this project"
      );
    }

    // Check for name conflicts if name is being updated
    if (input.name && input.name !== existingLabel.name) {
      const nameConflict = await db.query.labels.findFirst({
        where: and(
          eq(labels.projectId, existingLabel.projectId),
          ilike(labels.name, input.name),
          ne(labels.id, input.id) // Use ne directly
        ),
      });

      if (nameConflict) {
        throw new Error("A label with this name already exists in the project");
      }
    }

    // Update the label
    const updateData: Partial<typeof labels.$inferInsert> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.color !== undefined) updateData.color = input.color;

    const [updatedLabel] = await db
      .update(labels)
      .set(updateData)
      .where(eq(labels.id, input.id))
      .returning();

    // Get usage count
    const usageCount = await db.query.cardLabels.findMany({
      where: (cardLabels, { eq }) => eq(cardLabels.labelId, updatedLabel.id),
    });

    return {
      ...updatedLabel,
      usageCount: usageCount.length,
    };
  }

  /**
   * Delete a label (and remove it from all cards)
   */
  static async deleteLabel(labelId: string, userId: string): Promise<void> {
    // Get the label to check project
    const existingLabel = await db.query.labels.findFirst({
      where: eq(labels.id, labelId),
    });

    if (!existingLabel) {
      throw new Error("Label not found");
    }

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, existingLabel.projectId);

    if (!permissionChecker.canEditProject()) {
      throw new Error(
        "Insufficient permissions to delete labels in this project"
      );
    }

    // Delete the label (cascade will handle cardLabels)
    await db.delete(labels).where(eq(labels.id, labelId));
  }

  /**
   * Search labels by name within a project
   */
  static async searchLabels(
    projectId: string,
    query: string,
    userId: string
  ): Promise<LabelWithUsage[]> {
    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, projectId);

    if (!permissionChecker.canViewProject()) {
      throw new Error(
        "Insufficient permissions to search labels in this project"
      );
    }

    if (!query.trim()) {
      return this.getProjectLabels(projectId, userId);
    }

    const searchResults = await db.query.labels.findMany({
      where: and(
        eq(labels.projectId, projectId),
        ilike(labels.name, `%${query.trim()}%`)
      ),
      orderBy: (labels, { asc }) => [asc(labels.name)],
      limit: 20, // Limit search results
    });

    // Get usage count for each label
    const labelsWithUsage: LabelWithUsage[] = await Promise.all(
      searchResults.map(async (label) => {
        const usageCount = await db.query.cardLabels.findMany({
          where: (cardLabels, { eq }) => eq(cardLabels.labelId, label.id),
        });

        return {
          ...label,
          usageCount: usageCount.length,
        };
      })
    );

    return labelsWithUsage;
  }

  /**
   * Get label by ID
   */
  static async getLabelById(
    labelId: string,
    userId: string
  ): Promise<LabelWithUsage | null> {
    const label = await db.query.labels.findFirst({
      where: eq(labels.id, labelId),
    });

    if (!label) {
      return null;
    }

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, label.projectId);

    if (!permissionChecker.canViewProject()) {
      throw new Error("Insufficient permissions to view this label");
    }

    // Get usage count
    const usageCount = await db.query.cardLabels.findMany({
      where: (cardLabels, { eq }) => eq(cardLabels.labelId, labelId),
    });

    return {
      ...label,
      usageCount: usageCount.length,
    };
  }

  /**
   * Get most used labels in a project (for suggestions)
   */
  static async getMostUsedLabels(
    projectId: string,
    userId: string,
    limit: number = 10
  ): Promise<LabelWithUsage[]> {
    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, projectId);

    if (!permissionChecker.canViewProject()) {
      throw new Error("Insufficient permissions to view project labels");
    }

    const allLabels = await this.getProjectLabels(projectId, userId);

    // Sort by usage count and return top N
    return allLabels
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Bulk create labels
   */
  static async bulkCreateLabels(
    inputs: CreateLabelInput[],
    userId: string
  ): Promise<LabelWithUsage[]> {
    if (inputs.length === 0) return [];

    // Check permissions for the first project (assuming all labels are for the same project)
    const permissionChecker = new ProjectPermissionChecker();
    await permissionChecker.loadContext(userId, inputs[0].projectId);

    if (!permissionChecker.canCreateCards()) {
      throw new Error(
        "Insufficient permissions to create labels in this project"
      );
    }

    const createdLabels: LabelWithUsage[] = [];

    for (const input of inputs) {
      try {
        const label = await this.createLabel(input, userId);
        createdLabels.push(label);
      } catch (error) {
        // Skip duplicates or handle errors as needed
        console.warn(`Failed to create label "${input.name}":`, error);
      }
    }

    return createdLabels;
  }
}
