// app\api\projects\[slug]\columns\route.ts
import { db } from "@/lib/db/db";
import { columns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const projectSlug = params.slug;

    // First find the project by slug
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
