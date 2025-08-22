// app/api/slugs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSlugById } from "@/lib/services/utils/getters";

export async function POST(req: NextRequest) {
  const { teamId, projectId } = await req.json();

  // Now we allow either teamId or projectId (or both)
  if (!teamId && !projectId) {
    return NextResponse.json(
      { error: "Either teamId or projectId must be provided" },
      { status: 400 }
    );
  }

  try {
    const slugs = await getSlugById(teamId, projectId);
    return NextResponse.json(slugs);
  } catch (err) {
    console.error("[API] Failed to fetch slugs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
