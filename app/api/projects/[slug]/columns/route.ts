// app/api/projects/[slug]/columns/route.ts
import { db } from "@/lib/db/db";
import { columns, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/utils/get-current-user";

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context.params;
    const projectSlug = params.slug;

    // Find the project by slug
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.slug, projectSlug),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get columns for this project
    const projectColumns = await db.query.columns.findMany({
      where: eq(columns.projectId, project.id),
      orderBy: (columns, { asc }) => [asc(columns.position)],
    });

    return NextResponse.json(projectColumns);
  } catch (error) {
    console.error("Error fetching project columns:", error);
    return NextResponse.json(
      { error: "Failed to fetch columns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: any) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const projectSlug = params.slug;

    const body = await request.json();
    const { name, color, position } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Column name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: "Column name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Find the project by slug
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.slug, projectSlug),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Calculate position if not provided
    let finalPosition = position;
    if (finalPosition === undefined) {
      // Get the highest position and add 1
      const lastColumn = await db.query.columns.findFirst({
        where: eq(columns.projectId, project.id),
        orderBy: desc(columns.position),
      });
      finalPosition = (lastColumn?.position || -1) + 1;
    }

    // Create the new column
    const [newColumn] = await db
      .insert(columns)
      .values({
        name: name.trim(),
        color: color || null,
        position: finalPosition,
        projectId: project.id,
      })
      .returning();

    return NextResponse.json(newColumn, { status: 201 });
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}
