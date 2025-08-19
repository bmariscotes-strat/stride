// app/api/projects/[slug]/columns/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { columns, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // First, find the project by slug
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, params.slug),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Then get the columns for that project
    const projectColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.projectId, project.id))
      .orderBy(columns.position);

    return NextResponse.json(projectColumns);
  } catch (error) {
    console.error("Error fetching project columns:", error);
    return NextResponse.json(
      { error: "Failed to fetch columns" },
      { status: 500 }
    );
  }
}
